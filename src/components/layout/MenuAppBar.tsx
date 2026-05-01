'use client'

import * as React from 'react';
import Image from 'next/image';
import YondraIcon from '../icons/yondra.png';
import { logout, fetchUser } from '@/lib/auth';
import { useSystem } from '@/contexts/SystemContext';
import { getNotifications, markAllNotificationsRead } from '@/lib/api';

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function MenuAppBar() {
    const { isLogged, setIsLogged } = useSystem();
    const [user, setUser] = React.useState<{ id: number; name: string } | null>(null);
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [notifOpen, setNotifOpen] = React.useState(false);
    const [notifications, setNotifications] = React.useState<any[]>([]);

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

    return (
        <header className="bg-[#1a237e] text-white px-4 md:px-6 h-14 flex items-center gap-4">
            {/* Logo */}
            <button onClick={() => window.location.href = '/dashboard'} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
                <Image src={YondraIcon} alt="logo" width={32} height={32} className="rounded" />
                <span className="font-bold text-base tracking-wide hidden sm:block">Yondra</span>
            </button>

            <div className="flex-1" />

            {isLogged && (
                <>
                    {/* Notification bell */}
                    <div className="relative">
                        <button
                            onClick={handleOpenNotifs}
                            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                            title="Notifications"
                        >
                            <span className="text-base">🔔</span>
                            {unreadCount > 0 && (
                                <span
                                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center font-bold text-white"
                                    style={{ fontSize: '9px' }}
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {notifOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                                <div className="absolute right-0 top-11 z-50 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-80 overflow-hidden" style={{ maxHeight: '420px' }}>
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                                        <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Notifications</p>
                                        <button onClick={() => setNotifOpen(false)} className="text-gray-600 hover:text-white text-xs cursor-pointer">✕</button>
                                    </div>
                                    <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
                                        {notifications.length === 0 && (
                                            <p className="text-gray-600 text-xs text-center py-8">No notifications yet.</p>
                                        )}
                                        {notifications.map(n => (
                                            <div key={n.id} className={`px-4 py-3 border-b border-gray-800/50 ${!n.read_at ? 'bg-amber-400/5' : ''}`}>
                                                <p className="text-gray-300 text-xs">{n.message}</p>
                                                <p className="text-gray-600 text-xs mt-0.5">
                                                    {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Avatar button */}
                    <div className="relative">
                        <button
                            onClick={() => { setNotifOpen(false); setMenuOpen(prev => !prev); }}
                            style={{ backgroundColor: avatarColor, width: 36, height: 36, fontSize: 13 }}
                            className="rounded-full flex items-center justify-center font-bold text-white cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
                            title={user?.name}
                        >
                            {user ? initials(user.name) : '?'}
                        </button>

                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                                <div className="absolute right-0 top-11 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
                                    {user && (
                                        <div className="px-4 py-3 border-b border-gray-800">
                                            <p className="text-white text-sm font-bold truncate">{user.name}</p>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => { setMenuOpen(false); window.location.href = '/profile'; }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
                                    >
                                        Profile
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer border-t border-gray-800"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {!isLogged && (
                <div className="flex items-center gap-2">
                    <button onClick={() => window.location.href = '/login'} className="text-xs uppercase tracking-widest px-3 py-1.5 rounded border border-white/30 hover:border-white text-white/70 hover:text-white transition-all cursor-pointer">
                        Login
                    </button>
                    <button onClick={() => window.location.href = '/register'} className="text-xs uppercase tracking-widest px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-black font-bold transition-all cursor-pointer">
                        Register
                    </button>
                </div>
            )}
        </header>
    );
}
