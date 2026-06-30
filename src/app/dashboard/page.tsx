'use client';

import { fetchUser } from '@/lib/auth';
import { fetchProjects, createProject } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Modal from '@/components/shared/Modal';

// ─── helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];
const PROJECT_COLORS = ['#1976D2','#388E3C','#F57C00','#7B1FA2','#C62828','#00838F','#AD1457','#4527A0'];

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 120)   return 'just now';
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 172800) return 'yesterday';
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return `${Math.floor(s / 604800)}w ago`;
}

function Avatar({ user, size = 22 }: { user: { id: number; name: string }; size?: number }) {
    return (
        <div
            title={user.name}
            style={{ backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length], width: size, height: size, fontSize: size * 0.42 }}
            className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 border border-white/50"
        >
            {initials(user.name)}
        </div>
    );
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, isMember, onClick }: { project: any; isMember?: boolean; onClick: () => void }) {
    const boards: any[] = project.boards ?? [];
    const totalCards = boards.reduce((s: number, b: any) => s + (b.cards_count ?? 0), 0);
    const members: any[] = project.members ?? [];

    return (
        <div
            onClick={onClick}
            className="glass-card group relative cursor-pointer flex flex-col overflow-hidden transition-all duration-150 hover:-translate-y-1 select-none"
            style={{ minHeight: '210px' }}
        >
            {/* colored top strip — project color */}
            <div
                style={{ backgroundColor: project.color, height: '5px' }}
                className="w-full flex-shrink-0"
            />

            {/* corner screws */}
            <span className="cf-screw absolute" style={{ top: 12, left: 10 }} />
            <span className="cf-screw absolute" style={{ top: 12, right: 10 }} />

            {/* body */}
            <div className="flex flex-col flex-1 px-4 pt-3 pb-5 gap-2">

                {/* title row */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p style={{ color: 'var(--cf-ink)', fontSize: '15px', lineHeight: '1.2' }} className="cf-mono font-bold uppercase tracking-wide truncate">
                            {project.name}
                        </p>
                        {isMember && (
                            <span style={{ color: 'var(--cf-ink)', fontSize: '8px', borderColor: '#6a6453', backgroundColor: 'transparent' }}
                                  className="cf-label inline-block mt-1 px-1.5 py-0.5 border font-bold uppercase tracking-wider">
                                member
                            </span>
                        )}
                    </div>
                    {/* status LED — project color */}
                    <span
                        className="cf-led flex-shrink-0"
                        style={{ ['--led-color' as any]: project.color, backgroundColor: project.color, boxShadow: `0 0 8px ${project.color}, 0 0 2px ${project.color}` }}
                        title={project.name}
                    />
                </div>

                {/* description */}
                {project.description ? (
                    <p style={{ color: '#6a6453', fontSize: '11px', lineHeight: '1.4' }} className="line-clamp-2">{project.description}</p>
                ) : (
                    <p style={{ color: '#6a6453', fontSize: '11px' }} className="italic">No description</p>
                )}

                {/* mini board tabs — visual reference to the kanban */}
                <div className="flex gap-1.5 mt-1 flex-wrap">
                    {boards.slice(0, 4).map((b: any, i: number) => (
                        <div
                            key={b.id}
                            title={b.name}
                            style={{
                                borderColor: project.color,
                                borderLeftWidth: '3px',
                                fontSize: '8px',
                                color: 'var(--cf-ink)',
                                maxWidth: '64px',
                            }}
                            className="cf-mono px-1.5 py-0.5 border border-l-[3px] font-bold uppercase tracking-wide truncate flex-shrink-0"
                        >
                            {b.name}
                        </div>
                    ))}
                    {boards.length > 4 && (
                        <div style={{ fontSize: '8px', color: '#6a6453' }} className="cf-mono px-1.5 py-0.5 font-bold">
                            +{boards.length - 4}
                        </div>
                    )}
                    {boards.length === 0 && (
                        <div style={{ fontSize: '9px', color: '#6a6453' }} className="italic">No boards yet</div>
                    )}
                </div>

                {/* stats row */}
                <div className="mt-auto pt-2 flex items-end justify-between">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <span style={{ color: 'var(--cf-ink)', fontSize: '9px' }} className="cf-mono uppercase tracking-widest font-bold">
                                {project.boards_count ?? 0} board{project.boards_count !== 1 ? 's' : ''}
                            </span>
                            <span style={{ color: '#6a6453', fontSize: '9px' }}>·</span>
                            <span style={{ color: 'var(--cf-ink)', fontSize: '9px' }} className="cf-mono uppercase tracking-widest font-bold">
                                {totalCards} card{totalCards !== 1 ? 's' : ''}
                            </span>
                        </div>
                        {project.updated_at && (
                            <span style={{ color: '#6a6453', fontSize: '8px' }} className="cf-mono">{timeAgo(project.updated_at)}</span>
                        )}
                    </div>

                    {/* member avatars */}
                    <div className="flex items-center">
                        {members.slice(0, 4).map((m: any, i: number) => (
                            <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -6, zIndex: members.length - i, position: 'relative' }}>
                                <Avatar user={m} size={20} />
                            </div>
                        ))}
                        {members.length > 4 && (
                            <div style={{ marginLeft: -6, fontSize: '8px', width: 20, height: 20, backgroundColor: '#1c1a16', color: 'var(--cf-text)', position: 'relative' }}
                                 className="rounded-full flex items-center justify-center font-bold border border-white/50 z-0">
                                +{members.length - 4}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Glass widget ─────────────────────────────────────────────────────────────

function GlassWidget({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`glass-panel flex flex-col gap-0 overflow-hidden p-0 ${className}`}>
            {children}
        </div>
    );
}

function WidgetRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <span className="cf-label text-white/60 uppercase tracking-widest" style={{ fontSize: '9px' }}>{label}</span>
            <span className="cf-mono font-bold" style={{ color: 'var(--cf-phosphor)', fontSize: '13px' }}>{value}</span>
        </div>
    );
}

// ─── New project modal ─────────────────────────────────────────────────────────

function NewProjectModal({ onSave, onClose }: { onSave: (d: any) => void; onClose: () => void }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#1976D2');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        await onSave({ name: name.trim(), description: description.trim() || null, color });
        setLoading(false);
    }

    return (
        <div className="aero-menu p-6 w-[90vw] max-w-md flex flex-col gap-5">
            <div className="pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                <p className="chrome-text uppercase tracking-[0.25em] font-bold" style={{ fontSize: '10px' }}>New project</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label className="cf-label uppercase tracking-widest font-bold text-white/70" style={{ fontSize: '10px' }}>Name</label>
                    <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Project name…"
                        className="glass-input" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="cf-label uppercase tracking-widest font-bold text-white/70" style={{ fontSize: '10px' }}>Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional…" rows={2}
                        className="glass-input resize-none" />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="cf-label uppercase tracking-widest font-bold text-white/70" style={{ fontSize: '10px' }}>Color</label>
                    <div className="flex gap-2 flex-wrap">
                        {PROJECT_COLORS.map(c => (
                            <button key={c} type="button" onClick={() => setColor(c)}
                                style={{ backgroundColor: c, width: 22, height: 22, borderRadius: '4px', boxShadow: color === c ? `0 0 8px ${c}` : 'none' }}
                                className={`border-2 transition-all ${color === c ? 'border-white scale-125' : 'border-transparent'}`} />
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                    <button type="button" onClick={onClose}
                        className="aero-btn aero-btn--ghost px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={loading || !name.trim()}
                        className="aero-btn aero-btn--cyan px-4 py-2 text-sm disabled:opacity-50">
                        {loading ? '…' : 'Create'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser]                     = useState<any>(null);
    const [ownedProjects, setOwnedProjects]   = useState<any[]>([]);
    const [memberProjects, setMemberProjects] = useState<any[]>([]);
    const [showNewProject, setShowNewProject] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [u, p] = await Promise.all([fetchUser(), fetchProjects()]);
                if (u) setUser(u);
                if (p) {
                    setOwnedProjects(p.owned ?? []);
                    setMemberProjects(p.member ?? []);
                }
            } catch { router.push('/login'); }
        })();
    }, []);

    async function handleCreateProject(data: any) {
        const created = await createProject(data);
        setOwnedProjects(prev => [...prev, { ...created, boards: [], boards_count: 0 }]);
        setShowNewProject(false);
        router.push(`/projects/${created.id}`);
    }

    const allProjects = [...ownedProjects, ...memberProjects];
    const totalBoards = allProjects.reduce((s, p) => s + (p.boards_count ?? 0), 0);
    const totalCards  = allProjects.reduce((s, p) => s + (p.boards ?? []).reduce((b: number, board: any) => b + (board.cards_count ?? 0), 0), 0);

    // recent boards across all projects, sorted by updated_at
    const recentBoards = allProjects
        .flatMap(p => (p.boards ?? []).map((b: any) => ({ ...b, projectColor: p.color, projectName: p.name })))
        .filter((b: any) => b.updated_at)
        .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="min-h-[calc(100vh-56px)] flex flex-col">

            {/* ── page header ── */}
            <div className="px-6 md:px-10 pt-8 pb-6 flex-shrink-0">
                <p className="cf-label uppercase tracking-[0.35em] font-bold mb-1 text-white/70" style={{ fontSize: '9px' }}>
                    {greeting}
                </p>
                <h1 className="chrome-text font-bold tracking-tight leading-none" style={{ fontSize: 'clamp(22px, 4vw, 36px)' }}>
                    {user?.name ?? '…'}
                </h1>
            </div>

            {/* ── body ── */}
            <div className="flex flex-1 gap-0 overflow-hidden">

                {/* ── Left glass widget (desktop) ── */}
                <aside className="hidden lg:flex flex-col gap-4 w-52 flex-shrink-0 px-4 pb-6 pt-2">
                    <GlassWidget>
                        <div className="px-4 py-3 border-b border-white/10">
                            <p className="cf-label uppercase tracking-widest font-bold text-white/70" style={{ fontSize: '9px' }}>Workspace</p>
                        </div>
                        <WidgetRow label="Projects" value={allProjects.length} />
                        <WidgetRow label="Boards"   value={totalBoards} />
                        <WidgetRow label="Cards"    value={totalCards} />
                        <WidgetRow label="Teams"    value={ownedProjects.reduce((s, p) => s + (p.members?.length ?? 1), 0)} />
                        <div className="px-4 py-3">
                            <button
                                onClick={() => setShowNewProject(true)}
                                className="aero-btn aero-btn--cyan w-full py-2 text-xs uppercase tracking-widest"
                            >
                                New project
                            </button>
                        </div>
                    </GlassWidget>

                    {/* date block */}
                    <GlassWidget>
                        <div className="px-4 py-4 text-center">
                            <p className="cf-label uppercase tracking-[0.3em] mb-1 text-white/50" style={{ fontSize: '8px' }}>
                                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                            </p>
                            <p className="cf-mono font-bold" style={{ color: 'var(--cf-phosphor)', fontSize: '28px', lineHeight: 1 }}>
                                {new Date().getDate()}
                            </p>
                            <p className="cf-label uppercase tracking-widest mt-1 text-white/70" style={{ fontSize: '9px' }}>
                                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </GlassWidget>
                </aside>

                {/* ── Center: project cards ── */}
                <main className="flex-1 overflow-y-auto px-4 md:px-6 pb-10">

                    {/* mobile stats bar */}
                    <div className="flex items-center gap-4 lg:hidden mb-5 flex-wrap">
                        {[
                            { label: 'Projects', value: allProjects.length },
                            { label: 'Boards', value: totalBoards },
                            { label: 'Cards', value: totalCards },
                        ].map(s => (
                            <div key={s.label} className="flex flex-col items-center">
                                <span className="cf-mono font-bold leading-none" style={{ color: 'var(--cf-phosphor)', fontSize: '18px' }}>{s.value}</span>
                                <span className="cf-label uppercase tracking-widest text-white/60" style={{ fontSize: '8px' }}>{s.label}</span>
                            </div>
                        ))}
                        <button
                            onClick={() => setShowNewProject(true)}
                            className="aero-btn aero-btn--cyan ml-auto uppercase tracking-widest px-3 py-1.5 text-xs"
                        >
                            New project
                        </button>
                    </div>

                    {/* owned projects */}
                    {ownedProjects.length > 0 && (
                        <section className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <p className="cf-label uppercase tracking-[0.3em] font-bold text-white/80" style={{ fontSize: '9px' }}>My projects</p>
                                <div className="flex-1 h-px bg-white/15" />
                                <span className="cf-mono text-white/60" style={{ fontSize: '9px' }}>{ownedProjects.length}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {ownedProjects.map(p => (
                                    <ProjectCard
                                        key={p.id}
                                        project={p}
                                        onClick={() => router.push(`/projects/${p.id}`)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* member projects */}
                    {memberProjects.length > 0 && (
                        <section className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <p className="cf-label uppercase tracking-[0.3em] font-bold text-white/80" style={{ fontSize: '9px' }}>Shared with me</p>
                                <div className="flex-1 h-px bg-white/15" />
                                <span className="cf-mono text-white/60" style={{ fontSize: '9px' }}>{memberProjects.length}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {memberProjects.map(p => (
                                    <ProjectCard
                                        key={p.id}
                                        project={p}
                                        isMember
                                        onClick={() => router.push(`/projects/${p.id}`)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* empty state */}
                    {allProjects.length === 0 && user && (
                        <div className="glass-panel flex flex-col items-center justify-center py-24 text-center">
                            <p style={{ color: 'var(--cf-phosphor)', fontSize: '48px', lineHeight: 1, textShadow: '0 0 16px var(--cf-phosphor)' }}>▦</p>
                            <p className="cf-label uppercase tracking-[0.2em] mt-4 text-white/80" style={{ fontSize: '12px' }}>
                                No projects yet
                            </p>
                            <button
                                onClick={() => setShowNewProject(true)}
                                className="aero-btn aero-btn--cyan mt-5 uppercase tracking-widest px-5 py-2 text-xs"
                            >
                                Create your first project
                            </button>
                        </div>
                    )}
                </main>

                {/* ── Right glass widget (desktop) ── */}
                <aside className="hidden lg:flex flex-col gap-4 w-52 flex-shrink-0 px-4 pb-6 pt-2">
                    <GlassWidget>
                        <div className="px-4 py-3 border-b border-white/10">
                            <p className="cf-label uppercase tracking-widest font-bold text-white/70" style={{ fontSize: '9px' }}>Recent boards</p>
                        </div>
                        {recentBoards.length === 0 && (
                            <p className="px-4 py-4 italic text-white/50" style={{ fontSize: '10px' }}>No boards yet</p>
                        )}
                        {recentBoards.map((b: any) => (
                            <button
                                key={b.id}
                                onClick={() => router.push(`/boards/${b.id}`)}
                                className="w-full text-left px-4 py-2.5 border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="cf-led flex-shrink-0" style={{ ['--led-color' as any]: b.projectColor, backgroundColor: b.projectColor, boxShadow: `0 0 8px ${b.projectColor}` }} />
                                    <p className="cf-mono font-bold truncate text-white/85 group-hover:text-white" style={{ fontSize: '11px' }}>
                                        {b.name}
                                    </p>
                                </div>
                                <p className="mt-0.5 pl-4 truncate text-white/55" style={{ fontSize: '9px' }}>{b.projectName}</p>
                                <p className="cf-mono mt-0.5 pl-4 text-white/40" style={{ fontSize: '8px' }}>{timeAgo(b.updated_at)}</p>
                            </button>
                        ))}
                    </GlassWidget>

                    {memberProjects.length > 0 && (
                        <GlassWidget>
                            <div className="px-4 py-3 border-b border-white/10">
                                <p className="cf-label uppercase tracking-widest font-bold text-white/70" style={{ fontSize: '9px' }}>Collaborating</p>
                            </div>
                            {memberProjects.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => router.push(`/projects/${p.id}`)}
                                    className="w-full text-left px-4 py-2.5 border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="cf-led flex-shrink-0" style={{ ['--led-color' as any]: p.color, backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                                        <p className="cf-mono font-bold truncate text-white/85 group-hover:text-white" style={{ fontSize: '11px' }}>{p.name}</p>
                                    </div>
                                    <p className="mt-0.5 pl-4 text-white/55" style={{ fontSize: '9px' }}>
                                        {p.owner?.name} · {p.boards_count ?? 0} boards
                                    </p>
                                </button>
                            ))}
                        </GlassWidget>
                    )}
                </aside>
            </div>

            {/* ── Modal ── */}
            {showNewProject && (
                <Modal>
                    <NewProjectModal onSave={handleCreateProject} onClose={() => setShowNewProject(false)} />
                </Modal>
            )}
        </div>
    );
}
