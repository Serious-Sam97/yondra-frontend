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
            className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 border border-[#2a240e]/60"
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
            className="group relative cursor-pointer flex flex-col overflow-hidden rounded-sm transition-all duration-150 hover:-translate-y-1 select-none"
            style={{
                background: 'linear-gradient(165deg, #f0e8cc 0%, #e8ddb8 40%, #dfd2a4 100%)',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.55), 2px 2px 0 rgba(0,0,0,0.3)',
                fontFamily: 'Georgia, serif',
                border: '1px solid rgba(0,0,0,0.25)',
                minHeight: '210px',
            }}
        >
            {/* thick color strip — like a folder label */}
            <div style={{ backgroundColor: project.color, height: '14px' }} className="w-full flex-shrink-0" />

            {/* body */}
            <div className="flex flex-col flex-1 px-4 pt-3 pb-5 gap-2">

                {/* title row */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p style={{ color: '#1a1206', fontSize: '16px', lineHeight: '1.2' }} className="font-bold truncate">
                            {project.name}
                        </p>
                        {isMember && (
                            <span style={{ color: project.color, fontSize: '8px', borderColor: project.color + '66', backgroundColor: project.color + '18' }}
                                  className="inline-block mt-0.5 px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider">
                                member
                            </span>
                        )}
                    </div>
                    <div
                        style={{ backgroundColor: project.color, width: 28, height: 28, fontSize: '13px' }}
                        className="rounded-sm flex items-center justify-center font-bold text-white flex-shrink-0 opacity-80"
                    >
                        {project.name[0].toUpperCase()}
                    </div>
                </div>

                {/* description */}
                {project.description ? (
                    <p style={{ color: '#6b5a30', fontSize: '11px', lineHeight: '1.4' }} className="line-clamp-2">{project.description}</p>
                ) : (
                    <p style={{ color: '#b8a06840', fontSize: '11px' }} className="italic">No description</p>
                )}

                {/* mini board tabs — visual reference to the kanban */}
                <div className="flex gap-1.5 mt-1 flex-wrap">
                    {boards.slice(0, 4).map((b: any, i: number) => (
                        <div
                            key={b.id}
                            title={b.name}
                            style={{
                                backgroundColor: project.color + (i === 0 ? 'ee' : i === 1 ? 'aa' : i === 2 ? '77' : '44'),
                                fontSize: '8px',
                                color: i === 0 ? '#fff' : project.color,
                                maxWidth: '64px',
                            }}
                            className="px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wide truncate flex-shrink-0"
                        >
                            {b.name}
                        </div>
                    ))}
                    {boards.length > 4 && (
                        <div style={{ fontSize: '8px', color: '#8a7040' }} className="px-1.5 py-0.5 font-bold">
                            +{boards.length - 4}
                        </div>
                    )}
                    {boards.length === 0 && (
                        <div style={{ fontSize: '9px', color: '#b8a068' }} className="italic">No boards yet</div>
                    )}
                </div>

                {/* stats row */}
                <div className="mt-auto pt-2 flex items-end justify-between">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <span style={{ color: '#8a7040', fontSize: '9px' }} className="uppercase tracking-widest font-bold">
                                {project.boards_count ?? 0} board{project.boards_count !== 1 ? 's' : ''}
                            </span>
                            <span style={{ color: '#b8a06860', fontSize: '9px' }}>·</span>
                            <span style={{ color: '#8a7040', fontSize: '9px' }} className="uppercase tracking-widest font-bold">
                                {totalCards} card{totalCards !== 1 ? 's' : ''}
                            </span>
                        </div>
                        {project.updated_at && (
                            <span style={{ color: '#b8a068', fontSize: '8px' }}>{timeAgo(project.updated_at)}</span>
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
                            <div style={{ marginLeft: -6, fontSize: '8px', width: 20, height: 20, backgroundColor: '#8a7040', color: '#f0e8cc', position: 'relative' }}
                                 className="rounded-full flex items-center justify-center font-bold border border-[#2a240e]/60 z-0">
                                +{members.length - 4}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* dog-ear */}
            <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 0, height: 0, borderStyle: 'solid',
                borderWidth: '0 0 16px 16px',
                borderColor: `transparent transparent ${project.color}88 transparent`,
            }} />

            {/* hover shine */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                 style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)' }} />
        </div>
    );
}

// ─── Glass widget ─────────────────────────────────────────────────────────────

function GlassWidget({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-sm flex flex-col gap-0 overflow-hidden ${className}`}
            style={{
                background: 'rgba(12, 11, 6, 0.82)',
                border: '1px solid rgba(200,170,60,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                fontFamily: 'Georgia, serif',
            }}
        >
            {children}
        </div>
    );
}

function WidgetRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#c8aa3c]/08">
            <span style={{ color: '#8a7840', fontSize: '9px' }} className="uppercase tracking-widest">{label}</span>
            <span style={{ color: '#d4bf78', fontSize: '13px' }} className="font-bold">{value}</span>
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
        <div
            className="rounded-sm p-6 w-[90vw] max-w-md flex flex-col gap-5"
            style={{
                background: 'linear-gradient(165deg, #f0e8cc 0%, #e8ddb8 100%)',
                boxShadow: '5px 5px 0 rgba(0,0,0,0.6)',
                fontFamily: 'Georgia, serif',
                border: `1px solid ${color}66`,
            }}
        >
            <div style={{ borderBottomColor: color + '44' }} className="border-b-2 pb-3">
                <p style={{ color: '#8a7a40', fontSize: '10px' }} className="uppercase tracking-[0.25em] font-bold">New Project</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label style={{ color: '#6b5a30', fontSize: '10px' }} className="uppercase tracking-widest font-bold">Name</label>
                    <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Project name…"
                        style={{ fontFamily: 'Georgia, serif', color: '#1a1206', backgroundColor: '#faf4e0', borderColor: '#c8b060' }}
                        className="border rounded-sm px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                    <label style={{ color: '#6b5a30', fontSize: '10px' }} className="uppercase tracking-widest font-bold">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional…" rows={2}
                        style={{ fontFamily: 'Georgia, serif', color: '#1a1206', backgroundColor: '#faf4e0', borderColor: '#c8b060' }}
                        className="border rounded-sm px-3 py-2 text-sm resize-none focus:outline-none" />
                </div>
                <div className="flex flex-col gap-2">
                    <label style={{ color: '#6b5a30', fontSize: '10px' }} className="uppercase tracking-widest font-bold">Color</label>
                    <div className="flex gap-2 flex-wrap">
                        {PROJECT_COLORS.map(c => (
                            <button key={c} type="button" onClick={() => setColor(c)}
                                style={{ backgroundColor: c, width: 22, height: 22, borderRadius: '3px' }}
                                className={`border-2 transition-all ${color === c ? 'border-[#1a1206] scale-125' : 'border-transparent'}`} />
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#c8b060]/40">
                    <button type="button" onClick={onClose} style={{ color: '#8a7040', fontSize: '10px' }}
                        className="uppercase tracking-widest font-bold cursor-pointer hover:underline">Cancel</button>
                    <button type="submit" disabled={loading || !name.trim()}
                        style={{ backgroundColor: color, color: '#fff', fontSize: '10px' }}
                        className="uppercase tracking-widest font-bold px-4 py-1.5 rounded-sm cursor-pointer disabled:opacity-50">
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
        <div className="min-h-[calc(100vh-56px)] flex flex-col" style={{ backgroundColor: '#0a0a06' }}>

            {/* ── top rule ── */}
            <div className="flex h-0.5 flex-shrink-0">
                {['#4CAF50','#FFC107','#FF9800','#F44336','#7B1FA2','#1976D2'].map(c => (
                    <div key={c} style={{ backgroundColor: c }} className="flex-1" />
                ))}
            </div>

            {/* ── page header ── */}
            <div className="px-6 md:px-10 pt-8 pb-6 flex-shrink-0">
                <p style={{ color: '#5a4e28', fontSize: '9px' }} className="uppercase tracking-[0.35em] font-bold mb-1">
                    {greeting}
                </p>
                <h1 style={{ color: '#c8b060', fontFamily: 'Georgia, serif', fontSize: 'clamp(22px, 4vw, 36px)' }} className="font-bold tracking-tight leading-none">
                    {user?.name ?? '…'}
                </h1>
            </div>

            {/* ── body ── */}
            <div className="flex flex-1 gap-0 overflow-hidden">

                {/* ── Left glass widget (desktop) ── */}
                <aside className="hidden lg:flex flex-col gap-4 w-52 flex-shrink-0 px-4 pb-6 pt-2">
                    <GlassWidget>
                        <div className="px-4 py-3 border-b border-[#c8aa3c]/12">
                            <p style={{ color: '#8a7840', fontSize: '9px' }} className="uppercase tracking-widest font-bold">Workspace</p>
                        </div>
                        <WidgetRow label="Projects" value={allProjects.length} />
                        <WidgetRow label="Boards"   value={totalBoards} />
                        <WidgetRow label="Cards"    value={totalCards} />
                        <WidgetRow label="Teams"    value={ownedProjects.reduce((s, p) => s + (p.members?.length ?? 1), 0)} />
                        <div className="px-4 py-3">
                            <button
                                onClick={() => setShowNewProject(true)}
                                style={{ backgroundColor: '#c8b060', color: '#0a0a06', fontSize: '9px' }}
                                className="w-full uppercase tracking-widest font-bold py-2 rounded-sm cursor-pointer hover:opacity-90 transition-opacity"
                            >
                                + New Project
                            </button>
                        </div>
                    </GlassWidget>

                    {/* date block */}
                    <GlassWidget>
                        <div className="px-4 py-4 text-center">
                            <p style={{ color: '#5a4e28', fontSize: '8px' }} className="uppercase tracking-[0.3em] mb-1">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                            </p>
                            <p style={{ color: '#c8b060', fontSize: '28px', lineHeight: 1 }} className="font-bold">
                                {new Date().getDate()}
                            </p>
                            <p style={{ color: '#8a7840', fontSize: '9px' }} className="uppercase tracking-widest mt-1">
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
                                <span style={{ color: '#c8b060', fontSize: '18px' }} className="font-bold leading-none">{s.value}</span>
                                <span style={{ color: '#5a4e28', fontSize: '8px' }} className="uppercase tracking-widest">{s.label}</span>
                            </div>
                        ))}
                        <button
                            onClick={() => setShowNewProject(true)}
                            style={{ color: '#c8b060', borderColor: '#c8b06044', fontSize: '9px' }}
                            className="ml-auto uppercase tracking-widest px-3 py-1.5 rounded-sm border cursor-pointer hover:bg-[#c8b06012] transition-colors"
                        >
                            + New Project
                        </button>
                    </div>

                    {/* owned projects */}
                    {ownedProjects.length > 0 && (
                        <section className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <p style={{ color: '#5a4e28', fontSize: '9px' }} className="uppercase tracking-[0.3em] font-bold">My Projects</p>
                                <div className="flex-1 h-px" style={{ backgroundColor: '#c8b06020' }} />
                                <span style={{ color: '#5a4e28', fontSize: '9px' }}>{ownedProjects.length}</span>
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
                                <p style={{ color: '#5a4e28', fontSize: '9px' }} className="uppercase tracking-[0.3em] font-bold">Shared with me</p>
                                <div className="flex-1 h-px" style={{ backgroundColor: '#c8b06020' }} />
                                <span style={{ color: '#5a4e28', fontSize: '9px' }}>{memberProjects.length}</span>
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
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <p style={{ color: '#2a2418', fontSize: '48px', lineHeight: 1 }}>▦</p>
                            <p style={{ color: '#5a4e28', fontSize: '12px' }} className="uppercase tracking-[0.2em] mt-4">
                                No projects yet
                            </p>
                            <button
                                onClick={() => setShowNewProject(true)}
                                style={{ color: '#c8b060', borderColor: '#c8b06044', fontSize: '10px' }}
                                className="mt-5 uppercase tracking-widest px-5 py-2 rounded-sm border cursor-pointer hover:bg-[#c8b06012] transition-colors"
                            >
                                + Create your first project
                            </button>
                        </div>
                    )}
                </main>

                {/* ── Right glass widget (desktop) ── */}
                <aside className="hidden lg:flex flex-col gap-4 w-52 flex-shrink-0 px-4 pb-6 pt-2">
                    <GlassWidget>
                        <div className="px-4 py-3 border-b border-[#c8aa3c]/12">
                            <p style={{ color: '#8a7840', fontSize: '9px' }} className="uppercase tracking-widest font-bold">Recent Boards</p>
                        </div>
                        {recentBoards.length === 0 && (
                            <p style={{ color: '#5a4e28', fontSize: '10px' }} className="px-4 py-4 italic">No boards yet</p>
                        )}
                        {recentBoards.map((b: any) => (
                            <button
                                key={b.id}
                                onClick={() => router.push(`/boards/${b.id}`)}
                                className="w-full text-left px-4 py-2.5 border-b border-[#c8aa3c]/06 hover:bg-[#c8aa3c]/05 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-2">
                                    <div style={{ backgroundColor: b.projectColor, width: 6, height: 6, borderRadius: '1px', flexShrink: 0 }} />
                                    <p style={{ color: '#c8b878', fontSize: '11px' }} className="font-bold truncate group-hover:text-[#d4c890]">
                                        {b.name}
                                    </p>
                                </div>
                                <p style={{ color: '#5a4e28', fontSize: '9px' }} className="mt-0.5 pl-4 truncate">{b.projectName}</p>
                                <p style={{ color: '#4a4020', fontSize: '8px' }} className="mt-0.5 pl-4">{timeAgo(b.updated_at)}</p>
                            </button>
                        ))}
                    </GlassWidget>

                    {memberProjects.length > 0 && (
                        <GlassWidget>
                            <div className="px-4 py-3 border-b border-[#c8aa3c]/12">
                                <p style={{ color: '#8a7840', fontSize: '9px' }} className="uppercase tracking-widest font-bold">Collaborating</p>
                            </div>
                            {memberProjects.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => router.push(`/projects/${p.id}`)}
                                    className="w-full text-left px-4 py-2.5 border-b border-[#c8aa3c]/06 hover:bg-[#c8aa3c]/05 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-2">
                                        <div style={{ backgroundColor: p.color, width: 6, height: 6, borderRadius: '1px', flexShrink: 0 }} />
                                        <p style={{ color: '#c8b878', fontSize: '11px' }} className="font-bold truncate">{p.name}</p>
                                    </div>
                                    <p style={{ color: '#5a4e28', fontSize: '9px' }} className="mt-0.5 pl-4">
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
