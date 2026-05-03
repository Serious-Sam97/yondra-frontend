'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Modal from '@/components/shared/Modal';
import { fetchUser } from '@/lib/auth';
import {
    fetchProjects, fetchProject,
    updateProject, deleteProject,
    createBoard, updateBoard, deleteBoard,
    addProjectMember, updateProjectMember, removeProjectMember,
} from '@/lib/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#4CAF50','#FF9800','#1976D2','#F44336','#7B1FA2','#FFC107','#00BCD4','#E91E63'];
const PROJECT_COLORS = ['#1976D2','#388E3C','#F57C00','#7B1FA2','#C62828','#00838F','#AD1457','#4527A0'];

function initials(n: string) { return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 120)    return 'just now';
    if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
    if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
    if (s < 172800) return 'yesterday';
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return `${Math.floor(s / 604800)}w ago`;
}

function Avatar({ user, size = 22 }: { user: { id: number; name: string }; size?: number }) {
    return (
        <div title={user.name}
            style={{ backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length], width: size, height: size, fontSize: size * 0.42 }}
            className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 border-2 border-[#1a1a12]">
            {initials(user.name)}
        </div>
    );
}

// ─── Left sidebar: project folder tabs ───────────────────────────────────────

function FolderTab({ project, active, onClick, isMember }: { project: any; active: boolean; onClick: () => void; isMember?: boolean }) {
    return (
        <button onClick={onClick} className="w-full text-left focus:outline-none">
            <div style={{
                borderLeftColor: active ? project.color : 'transparent',
                backgroundColor: active ? project.color + '18' : 'transparent',
            }} className="flex items-center gap-2.5 px-3 py-2.5 border-l-4 hover:bg-[#1e1e12] transition-colors duration-100 cursor-pointer">
                <div style={{ backgroundColor: project.color + '33', color: project.color, width: 26, height: 26, fontSize: '12px' }}
                     className="rounded-sm flex items-center justify-center font-bold flex-shrink-0">
                    {project.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p style={{ color: active ? project.color : '#b8a060', fontSize: '12px' }} className="font-bold truncate leading-tight">
                        {project.name}
                    </p>
                    <p style={{ color: '#5a4e28', fontSize: '9px' }} className="truncate">
                        {project.boards_count ?? 0} board{project.boards_count !== 1 ? 's' : ''}
                        {isMember && <span className="ml-1">· member</span>}
                    </p>
                </div>
            </div>
        </button>
    );
}

// ─── Board card ───────────────────────────────────────────────────────────────

function BoardCard({ board, projectColor, editMode, isOwner, onClick }: {
    board: any; projectColor: string; editMode: boolean; isOwner: boolean; onClick: () => void;
}) {
    const cardCount = board.cards_count ?? 0;
    return (
        <div onClick={onClick}
            className={`group relative cursor-pointer flex flex-col overflow-hidden rounded-sm transition-all duration-150 hover:-translate-y-0.5 ${editMode && isOwner ? 'ring-2 ring-yellow-400/40' : ''}`}
            style={{
                background: 'linear-gradient(165deg, #f0e8cc 0%, #e8ddb8 40%, #dfd2a4 100%)',
                boxShadow: '3px 3px 0 rgba(0,0,0,0.5), 1px 1px 0 rgba(0,0,0,0.2)',
                fontFamily: 'Georgia, serif',
                border: `1px solid ${projectColor}44`,
                minHeight: '140px',
            }}
        >
            <div style={{ backgroundColor: projectColor, height: '8px' }} className="w-full flex-shrink-0" />
            <div className="px-4 pt-3 pb-4 flex flex-col flex-1 gap-2">
                <div className="flex items-start justify-between gap-1">
                    <p style={{ color: '#1a1206', fontSize: '13px' }} className="font-bold leading-snug flex-1">{board.name}</p>
                    {editMode && isOwner && (
                        <span style={{ fontSize: '9px', color: '#b45309' }} className="font-bold uppercase tracking-wide opacity-60 group-hover:opacity-100 flex-shrink-0">edit</span>
                    )}
                </div>
                {board.description && (
                    <p style={{ color: '#6b5a30', fontSize: '11px' }} className="line-clamp-2 leading-snug">{board.description}</p>
                )}
                <div className="mt-auto pt-2 flex items-center justify-between">
                    <span style={{ color: '#8a7040', fontSize: '9px' }} className="uppercase tracking-widest font-bold">
                        {cardCount} card{cardCount !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: '#b8a068', fontSize: '9px' }}>
                        {board.updated_at ? timeAgo(board.updated_at) : ''}
                    </span>
                </div>
                <div className="h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: '#c8b06030' }}>
                    <div style={{ width: cardCount > 0 ? `${Math.min(cardCount * 8, 100)}%` : '0%', backgroundColor: projectColor }}
                         className="h-full rounded-full" />
                </div>
                {(board.owner || board.shared_with?.length > 0) && (
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        {board.owner && <Avatar user={board.owner} size={16} />}
                        {board.shared_with?.slice(0, 3).map((u: any) => <Avatar key={u.id} user={u} size={16} />)}
                    </div>
                )}
            </div>
            <div style={{
                position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderStyle: 'solid',
                borderWidth: '0 0 12px 12px',
                borderColor: `transparent transparent ${projectColor}66 transparent`,
            }} />
        </div>
    );
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function ProjectEditModal({ project, onSave, onDelete, onClose }: { project: any; onSave: (d: any) => void; onDelete: () => void; onClose: () => void }) {
    const [name, setName]               = useState(project.name);
    const [description, setDescription] = useState(project.description ?? '');
    const [color, setColor]             = useState(project.color);
    const [loading, setLoading]         = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        await onSave({ name: name.trim(), description: description.trim() || null, color });
        setLoading(false);
    }

    return (
        <div className="rounded-sm p-6 w-[90vw] max-w-md flex flex-col gap-5"
            style={{ background: 'linear-gradient(165deg, #f0e8cc, #e8ddb8)', boxShadow: '5px 5px 0 rgba(0,0,0,0.6)', fontFamily: 'Georgia, serif', border: `1px solid ${color}55` }}>
            <div style={{ borderBottomColor: color + '44' }} className="border-b-2 pb-3">
                <p style={{ color: '#8a7a40', fontSize: '10px' }} className="uppercase tracking-[0.25em] font-bold">Edit Project</p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label style={{ color: '#6b5a30', fontSize: '10px' }} className="uppercase tracking-widest font-bold">Name</label>
                    <input autoFocus value={name} onChange={e => setName(e.target.value)}
                        style={{ fontFamily: 'Georgia, serif', color: '#1a1206', backgroundColor: '#faf4e0', borderColor: '#c8b060' }}
                        className="border rounded-sm px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                    <label style={{ color: '#6b5a30', fontSize: '10px' }} className="uppercase tracking-widest font-bold">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
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
                    <button type="button" onClick={onDelete} style={{ color: '#b91c1c', fontSize: '10px' }}
                        className="uppercase tracking-widest font-bold cursor-pointer hover:underline">Delete</button>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} style={{ color: '#8a7040', fontSize: '10px' }}
                            className="uppercase tracking-widest font-bold cursor-pointer hover:underline">Cancel</button>
                        <button type="submit" disabled={loading || !name.trim()} style={{ backgroundColor: color, color: '#fff', fontSize: '10px' }}
                            className="uppercase tracking-widest font-bold px-4 py-1.5 rounded-sm cursor-pointer disabled:opacity-50">
                            {loading ? '…' : 'Save'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function BoardFormModal({ board, projectId, projectColor, ownedProjects, onSave, onDelete, onClose }: {
    board: any | null; projectId: number; projectColor: string; ownedProjects: any[];
    onSave: (d: any) => void; onDelete?: () => void; onClose: () => void;
}) {
    const [name, setName]               = useState(board?.name ?? '');
    const [description, setDescription] = useState(board?.description ?? '');
    const [targetProjectId, setTargetProjectId] = useState<number>(projectId);
    const [loading, setLoading]         = useState(false);

    const isNew = !board;
    const targetProject = ownedProjects.find(p => p.id === targetProjectId);
    const accentColor = targetProject?.color ?? projectColor;
    const moved = !isNew && targetProjectId !== projectId;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        await onSave({ id: board?.id, name: name.trim(), description: description.trim() || '', project_id: targetProjectId });
        setLoading(false);
    }

    return (
        <div className="rounded-sm p-6 w-[90vw] max-w-md flex flex-col gap-5"
            style={{ background: 'linear-gradient(165deg, #f0e8cc, #e8ddb8)', boxShadow: '5px 5px 0 rgba(0,0,0,0.6)', fontFamily: 'Georgia, serif', border: `1px solid ${accentColor}55` }}>
            <div style={{ borderBottomColor: accentColor + '44' }} className="border-b-2 pb-3">
                <p style={{ color: '#8a7a40', fontSize: '10px' }} className="uppercase tracking-[0.25em] font-bold">{isNew ? 'New Board' : 'Edit Board'}</p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label style={{ color: '#6b5a30', fontSize: '10px' }} className="uppercase tracking-widest font-bold">Name</label>
                    <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Board name…"
                        style={{ fontFamily: 'Georgia, serif', color: '#1a1206', backgroundColor: '#faf4e0', borderColor: '#c8b060' }}
                        className="border rounded-sm px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                    <label style={{ color: '#6b5a30', fontSize: '10px' }} className="uppercase tracking-widest font-bold">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional…" rows={2}
                        style={{ fontFamily: 'Georgia, serif', color: '#1a1206', backgroundColor: '#faf4e0', borderColor: '#c8b060' }}
                        className="border rounded-sm px-3 py-2 text-sm resize-none focus:outline-none" />
                </div>
                {ownedProjects.length > 1 && (
                    <div className="flex flex-col gap-1">
                        <label style={{ color: '#6b5a30', fontSize: '10px' }} className="uppercase tracking-widest font-bold">Project</label>
                        <div className="flex items-center gap-2">
                            <div style={{ backgroundColor: accentColor, width: 8, height: 8, borderRadius: '2px', flexShrink: 0 }} />
                            <select value={targetProjectId} onChange={e => setTargetProjectId(Number(e.target.value))}
                                style={{ fontFamily: 'Georgia, serif', color: '#1a1206', backgroundColor: '#faf4e0', borderColor: '#c8b060', fontSize: '12px' }}
                                className="flex-1 border rounded-sm px-3 py-1.5 focus:outline-none cursor-pointer">
                                {ownedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        {moved && <p style={{ color: '#b45309', fontSize: '9px' }} className="uppercase tracking-widest">↳ Will move to "{targetProject?.name}"</p>}
                    </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-[#c8b060]/40">
                    {onDelete ? (
                        <button type="button" onClick={onDelete} style={{ color: '#b91c1c', fontSize: '10px' }}
                            className="uppercase tracking-widest font-bold cursor-pointer hover:underline">Delete</button>
                    ) : <div />}
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} style={{ color: '#8a7040', fontSize: '10px' }}
                            className="uppercase tracking-widest font-bold cursor-pointer hover:underline">Cancel</button>
                        <button type="submit" disabled={loading || !name.trim()} style={{ backgroundColor: accentColor, color: '#fff', fontSize: '10px' }}
                            className="uppercase tracking-widest font-bold px-4 py-1.5 rounded-sm cursor-pointer disabled:opacity-50">
                            {loading ? '…' : moved ? 'Move & Save' : 'Save'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function MembersModal({ project, currentUserId, onUpdate, onClose }: { project: any; currentUserId: number; onUpdate: (p: any) => void; onClose: () => void }) {
    const [email, setEmail]   = useState('');
    const [role, setRole]     = useState<'member' | 'viewer'>('member');
    const [error, setError]   = useState('');
    const [loading, setLoading] = useState(false);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true); setError('');
        try {
            const updated = await addProjectMember(project.id, email.trim(), role);
            onUpdate(updated); setEmail('');
        } catch { setError('User not found or already a member.'); }
        finally { setLoading(false); }
    }

    const isOwner = project.owner_id === currentUserId;

    return (
        <div className="rounded-sm p-6 w-[90vw] max-w-lg flex flex-col gap-5"
            style={{ background: 'linear-gradient(165deg, #f0e8cc, #e8ddb8)', boxShadow: '5px 5px 0 rgba(0,0,0,0.6)', fontFamily: 'Georgia, serif', border: `1px solid ${project.color}55` }}>
            <div style={{ borderBottomColor: project.color + '44' }} className="border-b-2 pb-3 flex items-center justify-between">
                <p style={{ color: '#8a7a40', fontSize: '10px' }} className="uppercase tracking-[0.25em] font-bold">{project.name} · Members</p>
                <button onClick={onClose} style={{ color: '#8a7040', fontSize: '10px' }} className="uppercase tracking-widest font-bold cursor-pointer hover:underline">Close</button>
            </div>
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {project.members?.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3">
                        <Avatar user={m} size={22} />
                        <div className="flex-1 min-w-0">
                            <p style={{ color: '#1a1206', fontSize: '12px' }} className="font-bold truncate">{m.name}</p>
                            <p style={{ color: '#8a7040', fontSize: '9px' }}>{m.email}</p>
                        </div>
                        {m.id === project.owner_id ? (
                            <span style={{ color: project.color, fontSize: '9px' }} className="uppercase tracking-widest font-bold">owner</span>
                        ) : isOwner ? (
                            <div className="flex items-center gap-2">
                                <select value={m.role ?? 'member'}
                                    onChange={e => updateProjectMember(project.id, m.id, e.target.value as any).then(onUpdate)}
                                    style={{ fontSize: '9px', backgroundColor: '#faf4e0', borderColor: '#c8b060', color: '#333' }}
                                    className="border rounded px-1 py-0.5 cursor-pointer">
                                    <option value="member">member</option>
                                    <option value="viewer">viewer</option>
                                </select>
                                <button onClick={() => removeProjectMember(project.id, m.id).then(() => onUpdate({ ...project, members: project.members.filter((x: any) => x.id !== m.id) }))}
                                    style={{ color: '#b91c1c', fontSize: '11px' }} className="font-bold cursor-pointer hover:opacity-70">✕</button>
                            </div>
                        ) : (
                            <span style={{ color: '#8a7040', fontSize: '9px' }} className="uppercase tracking-widest">{m.role ?? 'member'}</span>
                        )}
                    </div>
                ))}
            </div>
            {isOwner && (
                <form onSubmit={handleAdd} className="flex flex-col gap-2 border-t border-[#c8b060]/40 pt-4">
                    <label style={{ color: '#6b5a30', fontSize: '10px' }} className="uppercase tracking-widest font-bold">Invite by email</label>
                    {error && <p style={{ color: '#b91c1c', fontSize: '10px' }}>{error}</p>}
                    <div className="flex gap-2">
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com"
                            style={{ fontFamily: 'Georgia, serif', color: '#1a1206', backgroundColor: '#faf4e0', borderColor: '#c8b060', fontSize: '12px' }}
                            className="flex-1 border rounded-sm px-3 py-1.5 focus:outline-none" />
                        <select value={role} onChange={e => setRole(e.target.value as any)}
                            style={{ fontSize: '10px', backgroundColor: '#faf4e0', borderColor: '#c8b060', color: '#333' }}
                            className="border rounded-sm px-2 py-1.5 cursor-pointer">
                            <option value="member">member</option>
                            <option value="viewer">viewer</option>
                        </select>
                        <button type="submit" disabled={loading || !email.trim()} style={{ backgroundColor: project.color, color: '#fff', fontSize: '10px' }}
                            className="uppercase tracking-widest font-bold px-3 py-1.5 rounded-sm cursor-pointer disabled:opacity-50">
                            {loading ? '…' : 'Add'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ─── Right panel ──────────────────────────────────────────────────────────────

function RightPanel({ project, currentUserId, onMembersClick }: { project: any; currentUserId: number; onMembersClick: () => void }) {
    const boards: any[] = project.boards ?? [];
    const totalCards = boards.reduce((s: number, b: any) => s + (b.cards_count ?? 0), 0);
    const members: any[] = project.members ?? [];
    const isOwner = project.owner_id === currentUserId;

    return (
        <div className="flex flex-col gap-4">
            {/* stats */}
            <div className="rounded-sm overflow-hidden" style={{
                background: 'rgba(12,11,6,0.82)', border: '1px solid rgba(200,170,60,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)', fontFamily: 'Georgia, serif',
            }}>
                <div className="px-4 py-3 border-b border-[#c8aa3c]/12">
                    <p style={{ color: '#8a7840', fontSize: '9px' }} className="uppercase tracking-widest font-bold">Stats</p>
                </div>
                {[
                    { label: 'Boards', value: project.boards_count ?? 0 },
                    { label: 'Cards', value: totalCards },
                    { label: 'Members', value: members.length },
                ].map(r => (
                    <div key={r.label} className="flex items-center justify-between px-4 py-2 border-b border-[#c8aa3c]/08">
                        <span style={{ color: '#8a7840', fontSize: '9px' }} className="uppercase tracking-widest">{r.label}</span>
                        <span style={{ color: '#d4bf78', fontSize: '13px' }} className="font-bold">{r.value}</span>
                    </div>
                ))}
            </div>

            {/* members */}
            <div className="rounded-sm overflow-hidden" style={{
                background: 'rgba(12,11,6,0.82)', border: '1px solid rgba(200,170,60,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)', fontFamily: 'Georgia, serif',
            }}>
                <div className="px-4 py-3 border-b border-[#c8aa3c]/12 flex items-center justify-between">
                    <p style={{ color: '#8a7840', fontSize: '9px' }} className="uppercase tracking-widest font-bold">Members</p>
                    {isOwner && (
                        <button onClick={onMembersClick} style={{ color: '#c8b060', fontSize: '8px' }}
                            className="uppercase tracking-widest cursor-pointer hover:underline">Manage</button>
                    )}
                </div>
                {members.map(m => (
                    <div key={m.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#c8aa3c]/06">
                        <Avatar user={m} size={20} />
                        <div className="flex-1 min-w-0">
                            <p style={{ color: '#c8b878', fontSize: '11px' }} className="font-bold truncate">{m.name}</p>
                            <p style={{ color: '#5a4e28', fontSize: '8px' }} className="uppercase tracking-wide">
                                {m.id === project.owner_id ? 'owner' : m.role ?? 'member'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Sidebar cache (module-level — survives component remounts on route change) ─
// Next.js App Router remounts the page on every router.push, so a ref won't work.
// Storing user + project lists here means the sidebar is hydrated instantly on
// every project switch instead of blinking empty during the fetch.
let _cachedUser:   any    = null;
let _cachedOwned:  any[]  = [];
let _cachedMember: any[]  = [];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectPage() {
    const params    = useParams();
    const router    = useRouter();
    const projectId = Number(params.id);

    const hasSidebar = _cachedOwned.length > 0 || _cachedMember.length > 0;

    const [user, setUser]                     = useState<any>(_cachedUser);
    const [project, setProject]               = useState<any>(null);
    const [ownedProjects, setOwnedProjects]   = useState<any[]>(_cachedOwned);
    const [memberProjects, setMemberProjects] = useState<any[]>(_cachedMember);
    const [editMode, setEditMode]             = useState(false);
    const [sidebarOpen, setSidebarOpen]       = useState(false);
    const [contentLoading, setContentLoading] = useState(true);

    type ModalState =
        | { type: 'project-edit' }
        | { type: 'board-new' }
        | { type: 'board-edit'; board: any }
        | { type: 'members' }
        | null;

    const [modal, setModal] = useState<ModalState>(null);

    useEffect(() => {
        setContentLoading(true);
        setModal(null);
        setEditMode(false);

        if (!hasSidebar) {
            // ── Very first visit: fetch sidebar data + current project together ─
            (async () => {
                try {
                    const [u, projectData, allProjects] = await Promise.all([
                        fetchUser(),
                        fetchProject(projectId),
                        fetchProjects(),
                    ]);
                    const owned  = allProjects?.owned  ?? [];
                    const member = allProjects?.member ?? [];
                    _cachedUser   = u;
                    _cachedOwned  = owned;
                    _cachedMember = member;
                    if (u)           setUser(u);
                    if (projectData) setProject(projectData);
                    setOwnedProjects(owned);
                    setMemberProjects(member);
                } catch { router.push('/dashboard'); }
                finally { setContentLoading(false); }
            })();
        } else {
            // ── Project switch: sidebar already populated, only reload center ───
            fetchProject(projectId)
                .then(data => { setProject(data); setContentLoading(false); })
                .catch(() => router.push('/dashboard'));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // Full-page spinner only on the very first visit (no sidebar cache yet)
    if (!hasSidebar && contentLoading) {
        return (
            <div className="min-h-[calc(100vh-56px)] flex items-center justify-center" style={{ backgroundColor: '#0a0a06' }}>
                <p style={{ color: '#5a4e28', fontFamily: 'Georgia, serif', fontSize: '12px' }} className="uppercase tracking-widest">Loading…</p>
            </div>
        );
    }

    const boards: any[]  = project?.boards ?? [];
    const isOwner        = project?.owner_id === user?.id;
    const allProjects    = [...ownedProjects, ...memberProjects];

    // ── handlers ─────────────────────────────────────────────────────────────

    async function handleSaveProject(data: any) {
        const updated = await updateProject(project.id, data);
        setProject((p: any) => ({ ...p, ...updated }));
        setOwnedProjects(prev => prev.map(p => p.id === project.id ? { ...p, ...updated } : p));
        setModal(null);
    }

    async function handleDeleteProject() {
        await deleteProject(project.id);
        router.push('/dashboard');
    }

    async function handleSaveBoard(data: any) {
        if (modal?.type === 'board-edit') {
            const updated = await updateBoard(data.id, { name: data.name, description: data.description, project_id: data.project_id });
            if (data.project_id !== project.id) {
                // moved away — remove from this project and navigate to target
                setProject((p: any) => ({ ...p, boards: (p.boards ?? []).filter((b: any) => b.id !== data.id), boards_count: Math.max(0, (p.boards_count ?? 1) - 1) }));
                router.push(`/projects/${data.project_id}`);
            } else {
                setProject((p: any) => ({ ...p, boards: (p.boards ?? []).map((b: any) => b.id === data.id ? { ...b, ...updated } : b) }));
            }
            setModal(null);
            return;
        }
        const saved = await createBoard(data);
        setProject((p: any) => ({
            ...p,
            boards: [...(p.boards ?? []), { ...saved, cards_count: 0, owner: user, shared_with: [] }],
            boards_count: (p.boards_count ?? 0) + 1,
        }));
        setModal(null);
    }

    async function handleDeleteBoard(boardId: number) {
        await deleteBoard(boardId);
        setProject((p: any) => ({
            ...p,
            boards: (p.boards ?? []).filter((b: any) => b.id !== boardId),
            boards_count: Math.max(0, (p.boards_count ?? 1) - 1),
        }));
        setModal(null);
    }

    function handleBoardClick(board: any) {
        if (editMode && isOwner) { setModal({ type: 'board-edit', board }); return; }
        router.push(`/boards/${board.id}`);
    }

    function handleMembersUpdate(updated: any) {
        setProject((p: any) => ({ ...p, ...updated }));
        if (modal?.type === 'members') setModal({ type: 'members' });
    }

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex h-[calc(100vh-56px)] overflow-hidden" style={{ backgroundColor: '#0a0a06' }}>

            {/* mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Left sidebar ── */}
            <aside className={`
                fixed lg:relative z-40 lg:z-auto flex flex-col h-full w-56 flex-shrink-0
                transition-transform duration-200
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `} style={{ backgroundColor: '#0f0f08', borderRight: '1px solid #1e1e12' }}>
                {/* sidebar header */}
                <button onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 px-4 py-4 border-b border-[#1e1e12] hover:bg-[#1a1a10] transition-colors cursor-pointer">
                    <span style={{ color: '#5a4e28', fontSize: '10px' }}>←</span>
                    <span style={{ color: '#8a7840', fontSize: '9px' }} className="uppercase tracking-widest font-bold">All Projects</span>
                </button>

                <div className="flex-1 overflow-y-auto py-1">
                    {ownedProjects.length > 0 && (
                        <>
                            <p style={{ color: '#3a3220', fontSize: '8px' }} className="px-4 pt-3 pb-1 uppercase tracking-widest">Mine</p>
                            {ownedProjects.map(p => (
                                <FolderTab key={p.id} project={p} active={p.id === projectId}
                                    onClick={() => { router.push(`/projects/${p.id}`); setSidebarOpen(false); }} />
                            ))}
                        </>
                    )}
                    {memberProjects.length > 0 && (
                        <>
                            <p style={{ color: '#3a3220', fontSize: '8px' }} className="px-4 pt-4 pb-1 uppercase tracking-widest">Shared</p>
                            {memberProjects.map(p => (
                                <FolderTab key={p.id} project={p} active={p.id === projectId} isMember
                                    onClick={() => { router.push(`/projects/${p.id}`); setSidebarOpen(false); }} />
                            ))}
                        </>
                    )}
                </div>
            </aside>

            {/* ── Center ── */}
            <main className="flex-1 flex flex-col overflow-hidden"
                style={{ opacity: contentLoading ? 0.35 : 1, pointerEvents: contentLoading ? 'none' : undefined, transition: 'opacity 200ms ease' }}>
                {/* header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0 flex-wrap"
                    style={{ borderColor: '#1e1e12', backgroundColor: '#0d0d08' }}>
                    {/* mobile menu */}
                    <button className="lg:hidden p-1 cursor-pointer" style={{ color: '#c8b060' }}
                        onClick={() => setSidebarOpen(s => !s)}>☰</button>

                    {/* color dot + project name */}
                    <div style={{ backgroundColor: project?.color ?? 'transparent', width: 10, height: 10, borderRadius: '2px', flexShrink: 0 }} />
                    <p style={{ color: '#c8b060', fontFamily: 'Georgia, serif', fontSize: '15px' }} className="font-bold truncate flex-1">
                        {project?.name ?? ''}
                    </p>

                    {/* actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {isOwner && (
                            <>
                                <button onClick={() => setModal({ type: 'members' })}
                                    style={{ color: '#6b5a28', borderColor: '#2a2418', fontSize: '9px' }}
                                    className="uppercase tracking-widest px-2 py-1 rounded-sm border hover:border-[#4a3a20] hover:text-[#8a7040] transition-colors cursor-pointer">
                                    Members
                                </button>
                                <button onClick={() => setModal({ type: 'project-edit' })}
                                    style={{ color: '#6b5a28', borderColor: '#2a2418', fontSize: '9px' }}
                                    className="uppercase tracking-widest px-2 py-1 rounded-sm border hover:border-[#4a3a20] hover:text-[#8a7040] transition-colors cursor-pointer">
                                    ⚙ Edit
                                </button>
                            </>
                        )}
                        <button onClick={() => setEditMode(e => !e)}
                            style={{ color: editMode ? '#c8b060' : '#4a3a20', borderColor: editMode ? '#c8b06044' : '#2a2418', backgroundColor: editMode ? '#c8b06010' : 'transparent', fontSize: '9px' }}
                            className="uppercase tracking-widest px-2 py-1 rounded-sm border transition-colors cursor-pointer">
                            ⚙ {editMode ? 'Exit Edit' : 'Edit Mode'}
                        </button>
                        {isOwner && (
                            <button onClick={() => setModal({ type: 'board-new' })}
                                style={{ backgroundColor: project?.color ?? '#888', color: '#fff', fontSize: '9px' }}
                                className="uppercase tracking-widest font-bold px-3 py-1.5 rounded-sm cursor-pointer hover:opacity-90 transition-opacity">
                                + Board
                            </button>
                        )}
                    </div>
                </div>

                {/* boards grid */}
                <div className="flex-1 overflow-y-auto p-5 md:p-6">
                    {boards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p style={{ color: '#2a2418', fontSize: '40px' }}>▦</p>
                            <p style={{ color: '#5a4e28', fontSize: '11px' }} className="uppercase tracking-widest mt-3">No boards yet</p>
                            {isOwner && (
                                <button onClick={() => setModal({ type: 'board-new' })}
                                    style={{ color: project?.color ?? '#888', borderColor: (project?.color ?? '#888') + '44', fontSize: '9px' }}
                                    className="mt-4 uppercase tracking-widest px-4 py-2 rounded-sm border cursor-pointer hover:opacity-80 transition-opacity">
                                    + Create First Board
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                            {boards.map((b: any) => (
                                <BoardCard key={b.id} board={b} projectColor={project?.color ?? '#888'}
                                    editMode={editMode} isOwner={isOwner}
                                    onClick={() => handleBoardClick(b)} />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* ── Right panel (desktop) ── */}
            <aside className="hidden xl:flex flex-col w-52 flex-shrink-0 overflow-y-auto p-4 gap-4"
                style={{ backgroundColor: '#0f0f08', borderLeft: '1px solid #1e1e12', opacity: contentLoading ? 0.35 : 1, pointerEvents: contentLoading ? 'none' : undefined, transition: 'opacity 200ms ease' }}>
                {project && <RightPanel project={project} currentUserId={user?.id} onMembersClick={() => setModal({ type: 'members' })} />}
            </aside>

            {/* ── Modals ── */}
            {modal && (
                <Modal>
                    {modal.type === 'project-edit' && (
                        <ProjectEditModal project={project} onSave={handleSaveProject} onDelete={handleDeleteProject} onClose={() => setModal(null)} />
                    )}
                    {modal.type === 'board-new' && (
                        <BoardFormModal board={null} projectId={project.id} projectColor={project.color}
                            ownedProjects={ownedProjects} onSave={handleSaveBoard} onClose={() => setModal(null)} />
                    )}
                    {modal.type === 'board-edit' && (
                        <BoardFormModal board={modal.board} projectId={project.id} projectColor={project.color}
                            ownedProjects={ownedProjects} onSave={handleSaveBoard}
                            onDelete={() => handleDeleteBoard(modal.board.id)} onClose={() => setModal(null)} />
                    )}
                    {modal.type === 'members' && (
                        <MembersModal project={project} currentUserId={user?.id}
                            onUpdate={handleMembersUpdate} onClose={() => setModal(null)} />
                    )}
                </Modal>
            )}
        </div>
    );
}
