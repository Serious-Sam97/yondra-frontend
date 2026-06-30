'use client'

import * as React from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import YondraIcon from '../icons/yondra.png';
import { logout, fetchUser } from '@/lib/auth';
import { useSystem } from '@/contexts/SystemContext';
import { useConsole } from '@/contexts/ConsoleContext';
import { getNotifications, markAllNotificationsRead } from '@/lib/api';
import Icon from '@/components/ui/Icon';
import { faBell } from '@fortawesome/free-solid-svg-icons';

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function routeLabel(p?: string | null): string {
    if (!p) return 'YONDRA';
    if (p.startsWith('/dashboard')) return 'DASHBOARD';
    if (p.startsWith('/boards')) return 'BOARD';
    if (p.startsWith('/projects')) return 'PROJECT';
    if (p.startsWith('/profile')) return 'PROFILE';
    if (p.startsWith('/demo')) return 'DEMO MODE';
    if (p.startsWith('/login')) return 'AUTH / LOGIN';
    if (p.startsWith('/register')) return 'AUTH / REGISTER';
    return 'YONDRA';
}

function pad2(n: number): string { return String(n).padStart(2, '0'); }

const Screw = ({ style }: { style: React.CSSProperties }) => (
    <span className="cf-screw" style={{ position: 'absolute', ...style }} aria-hidden />
);

export default function MenuAppBar() {
    const { isLogged, setIsLogged } = useSystem();
    const { location, activity, pushActivity } = useConsole();
    const pathname = usePathname();

    const [user, setUser] = React.useState<{ id: number; name: string } | null>(null);
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [notifOpen, setNotifOpen] = React.useState(false);
    const [notifications, setNotifications] = React.useState<any[]>([]);

    // live clock + session timer
    const [now, setNow] = React.useState(() => Date.now());
    const startRef = React.useRef(Date.now());
    React.useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    // collapse the activity terminal once the user starts scrolling (any scroller)
    const [scrolled, setScrolled] = React.useState(false);
    React.useEffect(() => {
        const onScroll = (e: Event) => {
            const t = e.target as any;
            const st = (t && t !== document && typeof t.scrollTop === 'number') ? t.scrollTop : window.scrollY;
            setScrolled(st > 6);
        };
        window.addEventListener('scroll', onScroll, true);
        return () => window.removeEventListener('scroll', onScroll, true);
    }, []);

    // Publish the header's real (and dynamic, since it collapses on scroll) height
    // as a CSS var so page layouts can size themselves with calc(100vh - var(...))
    // instead of a hardcoded number that breaks when the header is taller.
    const headerRef = React.useRef<HTMLElement>(null);
    React.useEffect(() => {
        const el = headerRef.current;
        if (!el) return;
        const publish = () => document.documentElement.style.setProperty('--app-header-h', `${el.offsetHeight}px`);
        publish();
        const ro = new ResizeObserver(publish);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    React.useEffect(() => {
        if (!isLogged) return;
        fetchUser().then(u => setUser(u)).catch(() => {});
    }, [isLogged]);

    React.useEffect(() => {
        if (!isLogged) return;
        const fetchNotifs = () => getNotifications().then(d => setNotifications(Array.isArray(d) ? d : [])).catch(() => {});
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 30000);
        return () => clearInterval(interval);
    }, [isLogged]);

    // ── activity tracking ────────────────────────────────────────────────────
    React.useEffect(() => { pushActivity('console online · ready'); }, [pushActivity]);
    React.useEffect(() => { pushActivity('entered ' + routeLabel(pathname)); }, [pathname, pushActivity]);

    const lastNotifRef = React.useRef<number | undefined>(undefined);
    React.useEffect(() => {
        const newest = notifications[0];
        if (newest && newest.id !== lastNotifRef.current) {
            lastNotifRef.current = newest.id;
            if (!newest.read_at) pushActivity('alert · ' + newest.message);
        }
    }, [notifications, pushActivity]);

    const unreadCount = notifications.filter(n => !n.read_at).length;

    const handleOpenNotifs = async () => {
        setMenuOpen(false);
        const opening = !notifOpen;
        setNotifOpen(opening);
        if (opening && unreadCount > 0) {
            await markAllNotificationsRead().catch(() => {});
            setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
        }
    };

    const handleLogout = async () => {
        await logout();
        setIsLogged(false);
        window.location.href = '/login';
    };

    const avatarColor = user ? AVATAR_COLORS[user.id % AVATAR_COLORS.length] : '#888';

    // ── derived readout values ───────────────────────────────────────────────
    const displayLocation = location ?? routeLabel(pathname);
    const d = new Date(now);
    const clock = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    const elapsed = Math.max(0, Math.floor((now - startRef.current) / 1000));
    const session = elapsed >= 3600
        ? `${Math.floor(elapsed / 3600)}:${pad2(Math.floor((elapsed % 3600) / 60))}:${pad2(elapsed % 60)}`
        : `${pad2(Math.floor(elapsed / 60))}:${pad2(elapsed % 60)}`;
    const feed = activity.slice(-2);
    const litRegs = Math.min(unreadCount, 4);

    const facePlate: React.CSSProperties = {
        // Solid base color guarantees the header is opaque so scrolled content can't
        // show through it. The two gradients are layered (thin sheen lines on top of
        // the vertical face gradient) — they must live in one backgroundImage, since a
        // separate `background` shorthand would reset this and re-transparent the header.
        backgroundColor: '#2a2823',
        backgroundImage:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px), linear-gradient(180deg, #46443d, #2a2823)',
        borderBottom: '2px solid #0e0d0a',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 14px rgba(0,0,0,0.5)',
    };

    const Logo = ({ size = 30 }: { size?: number }) => (
        <button
            onClick={() => window.location.href = isLogged ? '/dashboard' : '/'}
            className="btn-physical flex items-center gap-2.5 cursor-pointer flex-shrink-0"
            title="Yondra"
        >
            <Image src={YondraIcon} alt="Yondra" width={size} height={size} className="rounded-lg"
                style={{ boxShadow: '0 0 14px rgba(154,166,126,0.35)' }} />
            <span className="chrome-text font-medium text-base hidden lg:block" style={{ letterSpacing: '0.18em' }}>YONDRA</span>
        </button>
    );

    // right-side control cluster (logged-in: alerts + avatar · logged-out: keys)
    const Cluster = ({ showClock = true }: { showClock?: boolean }) => (
        <div className="flex items-center gap-2.5 flex-shrink-0">
            {showClock && isLogged && (
                <div className="hidden md:flex items-center gap-2 mr-1">
                    <span className="cf-led" style={{ width: 8, height: 8, background: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)' }} />
                    <span className="cf-mono text-xs" style={{ color: 'var(--cf-phosphor)' }}>{clock}</span>
                </div>
            )}

            {isLogged ? (
                <>
                    <button
                        onClick={handleOpenNotifs}
                        className="btn-physical relative w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{ background: 'linear-gradient(#3a3832,#2a2823)', border: '1.5px solid var(--cf-edge)', boxShadow: '0 2px 0 #14130f' }}
                        title="Alerts"
                    >
                        <span key={unreadCount} className={`text-base ${unreadCount > 0 ? 'bell-ring' : ''}`} style={{ color: 'var(--cf-amber)' }}><Icon icon={faBell} /></span>
                        {unreadCount > 0 && (
                            <span className="cf-mono absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center font-bold text-white"
                                style={{ fontSize: '9px', background: 'var(--cf-red)', boxShadow: '0 0 8px var(--cf-red)' }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => { setNotifOpen(false); setMenuOpen(prev => !prev); }}
                        style={{ backgroundColor: avatarColor, width: 36, height: 36, fontSize: 13, border: '2px solid #14130f', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4), 0 0 0 3px #2a2823' }}
                        className="btn-physical cf-mono rounded-full flex items-center justify-center font-bold text-white cursor-pointer flex-shrink-0"
                        title={user?.name}
                    >
                        {user ? initials(user.name) : '?'}
                    </button>
                </>
            ) : (
                <div className="flex items-center gap-2">
                    <button onClick={() => window.location.href = '/login'} className="aero-btn aero-btn--ghost text-xs px-4 py-2 cursor-pointer">Login</button>
                    <button onClick={() => window.location.href = '/register'} className="aero-btn aero-btn--cyan text-xs px-4 py-2 cursor-pointer">Register</button>
                </div>
            )}
        </div>
    );

    return (
        <header ref={headerRef} className="sticky top-0 z-50" style={facePlate}>
            <Screw style={{ top: 6, left: 6 }} />
            <Screw style={{ bottom: 6, left: 6 }} />
            <Screw style={{ top: 6, right: 6 }} />
            <Screw style={{ bottom: 6, right: 6 }} />

            {/* ── DESKTOP: full telemetry deck (two rows) ──────────────────── */}
            <div className="hidden md:block px-4 lg:px-5 py-2">
                {/* row 1 — context */}
                <div className="flex items-center gap-3">
                    <Logo />
                    <div className="flex-1 min-w-0 flex items-center justify-between px-3 py-1 overflow-hidden"
                        style={{ background: '#1a1206', border: '1.5px solid #3a2a10', borderRadius: 4, boxShadow: 'inset 0 2px 6px #000' }}>
                        <span className="cf-lcd truncate" style={{ color: '#ffb000', textShadow: '0 0 6px rgba(255,176,0,0.5)', fontSize: 16, letterSpacing: '0.04em' }}>
                            ▸ {displayLocation}
                        </span>
                        <span className="cf-lcd flex-shrink-0 ml-3" style={{ color: '#c98a12', fontSize: 13 }}>ON {session}</span>
                    </div>
                    <Cluster />
                </div>

                {/* row 2 — activity (collapses on scroll) */}
                <div
                    className="flex items-stretch gap-3"
                    style={{
                        maxHeight: scrolled ? 0 : 60,
                        opacity: scrolled ? 0 : 1,
                        marginTop: scrolled ? 0 : 8,
                        overflow: 'hidden',
                        transition: 'max-height 240ms ease, opacity 180ms ease, margin-top 240ms ease',
                    }}
                >
                    <div className="flex-1 min-w-0 relative px-3 py-1 overflow-hidden"
                        style={{ background: '#a7b09a', border: '1.5px solid #7a8270', borderRadius: 4, boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.35)' }}>
                        <div className="cf-lcd relative" style={{ fontSize: 14, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                            {feed.length === 0 && <div style={{ color: '#5a6050' }}>▌ standby…</div>}
                            {feed.map((a, i) => (
                                <div key={a.id} className="truncate" style={{ color: i === feed.length - 1 ? '#1c2016' : '#3a4030' }}>
                                    {a.time}&nbsp;&nbsp;{a.text}{i === feed.length - 1 ? ' ▊' : ''}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 pr-1">
                        <div className="flex gap-1">
                            {[0, 1, 2, 3].map(i => (
                                <span key={i} className="cf-led" style={{ width: 6, height: 6, background: i < litRegs ? '#ff3b30' : '#3a1410', boxShadow: i < litRegs ? '0 0 4px #ff3b30' : 'none' }} />
                            ))}
                        </div>
                        <div style={{ width: 16, height: 22, borderRadius: 4, background: 'linear-gradient(#1c1a16,#2a2823)', border: '1.5px solid var(--cf-edge)', position: 'relative' }} aria-hidden>
                            <span style={{ position: 'absolute', left: '50%', top: 3, transform: 'translateX(-50%)', width: 9, height: 9, background: 'linear-gradient(#cfcabb,#6a6456)', borderRadius: 2 }} />
                        </div>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'radial-gradient(circle at 38% 30%, #6a6456, #1c1a16)', border: '1.5px solid #6a6456', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} aria-hidden>
                            <span style={{ position: 'absolute', left: '50%', top: 3, width: 2, height: 8, background: '#e8e4d6', transform: 'translateX(-50%)' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MOBILE: slim collapsed bar ───────────────────────────────── */}
            <div className="flex md:hidden items-center gap-3 px-3 h-13" style={{ minHeight: '52px' }}>
                <Logo size={28} />
                <div className="flex-1 min-w-0 px-2 py-1 overflow-hidden"
                    style={{ background: '#1a1206', border: '1px solid #3a2a10', borderRadius: 4, boxShadow: 'inset 0 1px 4px #000' }}>
                    <span className="cf-lcd truncate block" style={{ color: '#ffb000', fontSize: 14 }}>▸ {displayLocation}</span>
                </div>
                <Cluster showClock={false} />
            </div>

            {/* ── dropdowns (rendered once, anchored to header) ────────────── */}
            {notifOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="modal-content aero-menu absolute right-2 z-50 w-80 overflow-hidden" style={{ top: 'calc(100% + 6px)', maxHeight: '420px' }}>
                        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--cf-edge)' }}>
                            <p className="cf-label font-bold" style={{ color: 'var(--cf-phosphor)' }}>Notifications</p>
                            <button onClick={() => setNotifOpen(false)} className="btn-physical text-xs cursor-pointer" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
                        </div>
                        <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
                            {notifications.length === 0 && (
                                <p className="text-xs text-center py-8 cf-mono" style={{ color: 'var(--cf-text-muted)' }}>No notifications yet.</p>
                            )}
                            {notifications.map(n => (
                                <div key={n.id} className="px-4 py-3" style={{ borderBottom: '1px solid var(--cf-edge)', background: !n.read_at ? 'rgba(154,166,126,0.08)' : 'transparent' }}>
                                    <p className="text-xs" style={{ color: 'var(--cf-text)' }}>{n.message}</p>
                                    <p className="text-xs mt-0.5 cf-mono" style={{ color: 'var(--cf-text-muted)' }}>
                                        {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {menuOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="modal-content aero-menu absolute right-2 z-50 overflow-hidden min-w-[180px]" style={{ top: 'calc(100% + 6px)' }}>
                        {user && (
                            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--cf-edge)' }}>
                                <p className="cf-label mb-1" style={{ color: 'var(--cf-phosphor)' }}>User</p>
                                <p className="text-sm font-bold truncate cf-mono" style={{ color: 'var(--cf-text)' }}>{user.name}</p>
                            </div>
                        )}
                        <button
                            onClick={() => { setMenuOpen(false); window.location.href = '/profile'; }}
                            className="btn-physical cf-mono w-full text-left px-4 py-2.5 text-sm cursor-pointer"
                            style={{ color: 'var(--cf-text)' }}
                        >
                            Profile
                        </button>
                        <button
                            onClick={handleLogout}
                            className="btn-physical cf-mono w-full text-left px-4 py-2.5 text-sm cursor-pointer"
                            style={{ borderTop: '1px solid var(--cf-edge)', color: 'var(--cf-red)' }}
                        >
                            Logout
                        </button>
                    </div>
                </>
            )}
        </header>
    );
}
