'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Modal from '@/components/shared/Modal';
import Icon from '@/components/ui/Icon';
import { faBars, faGear, faLock, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { BoardFormModal, BoardFormData } from '@/components/ui/BoardFormModal';
import { ProjectBoard, ProjectFormData, ProjectInterface, UserSummary } from '@/interfaces/ProjectInterface';
import { fetchUser } from '@/lib/auth';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
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
            style={{ backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length], width: size, height: size, fontSize: size * 0.42, borderColor: 'var(--cf-edge, #4a463f)' }}
            className="cf-mono rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 border-2 shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
            {initials(user.name)}
        </div>
    );
}

// ─── Left sidebar: project folder tabs ───────────────────────────────────────

function FolderTab({ project, active, onClick, isMember }: { project: ProjectInterface; active: boolean; onClick: () => void; isMember?: boolean }) {
    return (
        <button onClick={onClick} className="w-full text-left focus:outline-none">
            <div style={{
                borderLeftColor: active ? project.color : 'transparent',
                backgroundColor: active ? 'var(--cf-graphite, #2b2a26)' : 'transparent',
                boxShadow: active ? `inset 0 0 0 1px var(--cf-edge, #4a463f)` : undefined,
            }} className="flex items-center gap-2.5 px-3 py-2.5 border-l-4 rounded-r-lg hover:bg-[#1c1a16] transition-colors duration-100 cursor-pointer">
                <span className="cf-led flex-shrink-0" style={{ backgroundColor: project.color, boxShadow: `0 0 6px ${project.color}` }} />
                <div style={{ backgroundColor: 'var(--cf-graphite, #2b2a26)', color: 'var(--cf-text, #e8e4d6)', width: 26, height: 26, fontSize: '12px', borderColor: 'var(--cf-edge, #4a463f)' }}
                     className="cf-mono rounded-md flex items-center justify-center font-bold flex-shrink-0 border">
                    {project.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p style={{ color: active ? 'var(--cf-text, #e8e4d6)' : 'var(--cf-text-muted, #a39d8c)', fontSize: '12px' }} className="font-bold truncate leading-tight">
                        {project.name}
                    </p>
                    <p style={{ color: 'var(--cf-text-muted, #a39d8c)', fontSize: '9px' }} className="cf-mono truncate">
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
    board: ProjectBoard; projectColor: string; editMode: boolean; isOwner: boolean; onClick: () => void;
}) {
    const cardCount = board.cards_count ?? 0;
    return (
        <div onClick={onClick}
            className={`glass-card ${editMode && isOwner ? 'glass-card--ring' : ''} group relative cursor-pointer flex flex-col overflow-hidden transition-all duration-150 hover:-translate-y-0.5`}
            style={{ minHeight: '140px' }}
        >
            <div style={{ backgroundColor: projectColor, height: '6px', boxShadow: `inset 0 -1px 0 rgba(0,0,0,0.35)` }} className="w-full flex-shrink-0" />
            <div className="px-4 pt-3 pb-4 flex flex-col flex-1 gap-2">
                <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="cf-led flex-shrink-0" style={{ backgroundColor: projectColor, boxShadow: `0 0 6px ${projectColor}` }} />
                        <p style={{ color: 'var(--cf-ink, #2a2620)', fontSize: '13px' }} className="font-bold leading-snug flex-1 truncate">{board.name}</p>
                    </div>
                    {editMode && isOwner && (
                        <span style={{ fontSize: '9px', color: 'var(--cf-red, #ff5a4d)' }} className="cf-mono font-bold uppercase tracking-wide opacity-70 group-hover:opacity-100 flex-shrink-0">edit</span>
                    )}
                </div>
                {board.description && (
                    <p style={{ color: 'var(--cf-text-muted, #6a6453)', fontSize: '11px' }} className="line-clamp-2 leading-snug">{board.description}</p>
                )}
                <div className="mt-auto pt-2 flex items-center justify-between">
                    <span style={{ color: 'var(--cf-text-muted, #6a6453)', fontSize: '9px' }} className="cf-mono uppercase tracking-widest font-bold">
                        {cardCount} card{cardCount !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: 'var(--cf-text-muted, #6a6453)', fontSize: '9px' }} className="cf-mono">
                        {board.updated_at ? timeAgo(board.updated_at) : ''}
                    </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(42,38,32,0.15)' }}>
                    <div style={{ width: cardCount > 0 ? `${Math.min(cardCount * 8, 100)}%` : '0%', backgroundColor: projectColor }}
                         className="h-full rounded-full" />
                </div>
                {(board.owner || board.shared_with?.length > 0) && (
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        {board.owner && <Avatar user={board.owner} size={16} />}
                        {board.shared_with?.slice(0, 3).map((u) => <Avatar key={u.id} user={u} size={16} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function ProjectEditModal({ project, onSave, onDelete, onClose }: { project: ProjectInterface; onSave: (d: ProjectFormData) => void; onDelete: () => void; onClose: () => void }) {
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
        <div className="aero-menu rounded-2xl p-6 w-[90vw] max-w-md flex flex-col gap-5 relative">
            <span className="cf-screw" style={{ position: 'absolute', top: 8, left: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', top: 8, right: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', bottom: 8, left: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', bottom: 8, right: 8 }} />
            <div style={{ borderBottom: '1px solid var(--cf-edge, #4a463f)' }} className="pb-3 flex items-center gap-2">
                <span className="cf-led" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                <p style={{ color: 'var(--cf-text-muted, #a39d8c)', fontSize: '10px' }} className="cf-label uppercase tracking-[0.25em] font-bold">Edit project</p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-widest font-bold">Name</label>
                    <input autoFocus value={name} onChange={e => setName(e.target.value)}
                        className="glass-input cf-lcd text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                    <label style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-widest font-bold">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                        className="glass-input cf-lcd text-sm resize-none" />
                </div>
                <div className="flex flex-col gap-2">
                    <label style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-widest font-bold">Color</label>
                    <div className="flex gap-2 flex-wrap">
                        {PROJECT_COLORS.map(c => (
                            <button key={c} type="button" onClick={() => setColor(c)}
                                style={{ backgroundColor: c, width: 22, height: 22, borderRadius: '6px', borderColor: color === c ? 'var(--cf-phosphor, #9aa67e)' : 'var(--cf-edge, #4a463f)', boxShadow: color === c ? `0 0 10px ${c}` : undefined }}
                                className={`border-2 transition-all ${color === c ? 'scale-125' : ''}`} />
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--cf-edge, #4a463f)' }}>
                    <button type="button" onClick={onDelete}
                        className="aero-btn aero-btn--magenta uppercase tracking-widest font-bold px-4 py-1.5 text-[10px]">Delete</button>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="aero-btn aero-btn--ghost uppercase tracking-widest font-bold px-4 py-1.5 text-[10px]">Cancel</button>
                        <button type="submit" disabled={loading || !name.trim()}
                            className="aero-btn aero-btn--cyan uppercase tracking-widest font-bold px-5 py-1.5 text-[10px]">
                            {loading ? '…' : 'Save'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

type ProjectRole = 'owner' | 'member' | 'viewer';

// Each role gets a colour from the console palette so it reads at a glance.
const ROLE_META: Record<ProjectRole, { color: string; bg: string; border: string; glow: string; rank: number }> = {
    owner:  { color: 'var(--cf-amber, #ffb000)',    bg: 'rgba(255,176,0,0.15)',   border: 'rgba(255,176,0,0.5)',   glow: 'rgba(255,176,0,0.4)',   rank: 0 },
    member: { color: 'var(--cf-phosphor, #9aa67e)', bg: 'rgba(154,166,126,0.16)', border: 'rgba(154,166,126,0.5)', glow: 'rgba(154,166,126,0.4)', rank: 1 },
    viewer: { color: 'var(--cf-cyan, #6fe0ff)',     bg: 'rgba(111,224,255,0.14)', border: 'rgba(111,224,255,0.45)',glow: 'rgba(111,224,255,0.35)',rank: 2 },
};

// Segmented Viewer · Member · Owner control — same pill language as the board share dialog.
function RoleSegments({ value, onChange, disabled }: { value: ProjectRole; onChange: (r: ProjectRole) => void; disabled?: boolean }) {
    return (
        <div role="group" aria-label="Access level"
            className="inline-flex gap-0.5 p-0.5 rounded-lg flex-shrink-0"
            style={{ background: 'var(--cf-screen, #0d1410)', border: '1px solid #14130f', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)' }}>
            {(['viewer', 'member', 'owner'] as const).map(r => {
                const active = value === r;
                return (
                    <button key={r} type="button" disabled={disabled} onClick={() => !active && onChange(r)}
                        className="cf-mono uppercase font-bold rounded-md px-2 py-1 cursor-pointer transition-all duration-150 disabled:cursor-default"
                        style={{ fontSize: '9px', letterSpacing: '0.1em',
                            color: active ? ROLE_META[r].color : 'var(--cf-text-dim, #6f6a5c)',
                            background: active ? ROLE_META[r].bg : 'transparent',
                            boxShadow: active ? `0 0 8px ${ROLE_META[r].glow}` : undefined }}>
                        {r}
                    </button>
                );
            })}
        </div>
    );
}

function MembersModal({ project, currentUserId, onUpdate, onClose }: { project: ProjectInterface; currentUserId?: number; onUpdate: (p: ProjectInterface) => void; onClose: () => void }) {
    const [email, setEmail]     = useState('');
    const [role, setRole]       = useState<ProjectRole>('member');
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmId, setConfirmId] = useState<number | null>(null);

    const members = [...(project.members ?? [])].sort((a, b) => {
        if (a.id === project.owner_id) return -1;
        if (b.id === project.owner_id) return 1;
        return ROLE_META[(a.role ?? 'member') as ProjectRole].rank - ROLE_META[(b.role ?? 'member') as ProjectRole].rank;
    });

    const myRole = members.find(m => m.id === currentUserId)?.role as ProjectRole | undefined;
    const canManage = project.owner_id === currentUserId || myRole === 'owner';

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true); setError('');
        try {
            const updated = await addProjectMember(project.id, email.trim(), role);
            onUpdate(updated); setEmail('');
        } catch { setError("That email isn't a Yondra user, or they're already on the project."); }
        finally { setLoading(false); }
    }

    async function handleRole(memberId: number, next: ProjectRole) {
        setError('');
        try { onUpdate(await updateProjectMember(project.id, memberId, next)); }
        catch { setError("Couldn't change that role. The primary owner can't be demoted."); }
    }

    async function handleRemove(memberId: number) {
        setConfirmId(null);
        await removeProjectMember(project.id, memberId);
        onUpdate({ ...project, members: (project.members ?? []).filter(x => x.id !== memberId) });
    }

    return (
        <div className="aero-menu rounded-2xl p-6 w-[90vw] max-w-lg flex flex-col gap-4 relative">
            <span className="cf-screw" style={{ position: 'absolute', top: 8, left: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', top: 8, right: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', bottom: 8, left: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', bottom: 8, right: 8 }} />

            <div style={{ borderBottom: '1px solid var(--cf-edge, #4a463f)' }} className="pb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="cf-led flex-shrink-0" style={{ backgroundColor: project.color, boxShadow: `0 0 8px ${project.color}` }} />
                    <p style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-[0.25em] font-bold truncate">{project.name} · Members</p>
                    <span className="cf-mono font-bold rounded-full flex-shrink-0" style={{ fontSize: '9px', color: 'var(--cf-ink, #2a2620)', background: 'var(--cf-phosphor, #9aa67e)', padding: '1px 7px' }}>{members.length}</span>
                </div>
                <button onClick={onClose} aria-label="Close" className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer flex-shrink-0" style={{ border: '1px solid var(--cf-edge, #4a463f)', background: '#211f1b', color: 'var(--cf-text-muted, #a39d8c)' }}>
                    <Icon icon={faXmark} style={{ fontSize: '11px' }} />
                </button>
            </div>

            {/* Role legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg px-3 py-2" style={{ background: 'var(--cf-screen, #0d1410)', border: '1px solid #14130f', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                {([['owner', 'manages people'], ['member', 'edits boards'], ['viewer', 'reads only']] as const).map(([r, desc]) => (
                    <span key={r} className="flex items-center gap-1.5" style={{ fontSize: '9.5px', color: 'var(--cf-text-muted, #a39d8c)' }}>
                        <span className="rounded-full" style={{ width: 7, height: 7, background: ROLE_META[r].color, boxShadow: `0 0 6px ${ROLE_META[r].color}` }} />
                        <b className="cf-mono uppercase font-bold" style={{ color: 'var(--cf-text, #e8e4d6)', letterSpacing: '0.1em' }}>{r}</b> {desc}
                    </span>
                ))}
            </div>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto -mx-1 px-1">
                {members.map((m) => {
                    const mRole = (m.role ?? 'member') as ProjectRole;
                    const meta = ROLE_META[mRole];
                    const isPrimary = m.id === project.owner_id;
                    const isMe = m.id === currentUserId;
                    const editable = canManage && !isPrimary;
                    return (
                        <div key={m.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2 relative"
                            style={{ background: '#211f1b', border: `1px solid ${isMe ? '#514b3f' : '#38352e'}` }}>
                            <span className="rounded-r-sm" style={{ position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
                            <span className="rounded-full flex-shrink-0" style={{ boxShadow: `0 0 0 1.5px var(--cf-panel, #26241f), 0 0 0 3px ${meta.color}` }}>
                                <Avatar user={m} size={30} />
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p style={{ fontSize: '12px', color: 'var(--cf-text, #e8e4d6)' }} className="font-bold truncate">{m.name}</p>
                                    {isMe && <span className="flex-shrink-0" style={{ fontSize: '8px', letterSpacing: '0.14em', color: 'var(--cf-cyan, #6fe0ff)', border: '1px solid rgba(111,224,255,0.5)', borderRadius: 4, padding: '1px 5px' }}>YOU</span>}
                                </div>
                                <p style={{ fontSize: '9px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-mono truncate">{m.email}</p>
                            </div>

                            {isPrimary ? (
                                <div className="flex flex-col items-end flex-shrink-0">
                                    <span className="inline-flex items-center gap-1.5 rounded-md uppercase font-bold" style={{ fontSize: '9px', letterSpacing: '0.14em', color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, padding: '4px 9px' }}>
                                        <Icon icon={faLock} style={{ fontSize: '9px', opacity: 0.85 }} /> owner
                                    </span>
                                    <span style={{ fontSize: '8px', letterSpacing: '0.1em', color: 'var(--cf-text-dim, #6f6a5c)', marginTop: 3 }}>Primary · locked</span>
                                </div>
                            ) : editable ? (
                                confirmId === m.id ? (
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className="uppercase" style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--cf-red, #ff5a4d)' }}>Remove?</span>
                                        <button onClick={() => handleRemove(m.id)} className="cf-mono uppercase rounded-md px-2 py-1 cursor-pointer" style={{ fontSize: '9px', letterSpacing: '0.1em', background: 'rgba(255,90,77,0.16)', border: '1px solid rgba(255,90,77,0.55)', color: 'var(--cf-red, #ff5a4d)' }}>Yes</button>
                                        <button onClick={() => setConfirmId(null)} className="cf-mono uppercase rounded-md px-2 py-1 cursor-pointer" style={{ fontSize: '9px', letterSpacing: '0.1em', border: '1px solid var(--cf-edge, #4a463f)', color: 'var(--cf-text-muted, #a39d8c)' }}>No</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <RoleSegments value={mRole} onChange={next => handleRole(m.id, next)} />
                                        <button onClick={() => setConfirmId(m.id)} aria-label={`Remove ${m.name}`} title="Remove"
                                            className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors" style={{ color: 'var(--cf-text-dim, #6f6a5c)' }}
                                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cf-red, #ff5a4d)')}
                                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--cf-text-dim, #6f6a5c)')}>
                                            <Icon icon={faTrash} style={{ fontSize: '11px' }} />
                                        </button>
                                    </div>
                                )
                            ) : (
                                <span className="uppercase font-bold rounded-md flex-shrink-0" style={{ fontSize: '9px', letterSpacing: '0.14em', color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, padding: '4px 9px' }}>{mRole}</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {canManage && (
                <form onSubmit={handleAdd} className="flex flex-col gap-2.5 pt-4" style={{ borderTop: '1px solid var(--cf-edge, #4a463f)' }}>
                    <label style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-widest font-bold">Invite to project</label>
                    {error && <p style={{ fontSize: '10px', color: 'var(--cf-red, #ff5a4d)' }} className="cf-mono">{error}</p>}
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com"
                        style={{ fontSize: '12px' }} className="glass-input cf-lcd w-full" />
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <RoleSegments value={role} onChange={setRole} />
                        <button type="submit" disabled={loading || !email.trim()}
                            className="aero-btn aero-btn--cyan uppercase tracking-widest font-bold px-4 py-1.5 text-[10px] disabled:opacity-50">
                            {loading ? '…' : 'Send invite'}
                        </button>
                    </div>
                    <span style={{ fontSize: '9.5px', color: 'var(--cf-text-dim, #6f6a5c)' }}>They'll need a Yondra account with this email.</span>
                </form>
            )}
        </div>
    );
}

// ─── Right panel ──────────────────────────────────────────────────────────────

function RightPanel({ project, currentUserId, onMembersClick }: { project: ProjectInterface; currentUserId?: number; onMembersClick: () => void }) {
    const boards: ProjectBoard[] = project.boards ?? [];
    const totalCards = boards.reduce((s: number, b) => s + (b.cards_count ?? 0), 0);
    const members = project.members ?? [];
    // Any owner (primary or co-owner) can manage members; the primary owner
    // itself is protected from removal/demotion in the modal + backend.
    const myRole = members.find(m => m.id === currentUserId)?.role;
    const canManage = project.owner_id === currentUserId || myRole === 'owner';

    return (
        <div className="flex flex-col gap-4">
            {/* stats */}
            <div className="rounded-xl overflow-hidden" style={{
                background: 'var(--cf-graphite, #2b2a26)', border: '1px solid var(--cf-edge, #4a463f)',
                boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.4)',
            }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--cf-edge, #4a463f)' }}>
                    <p style={{ fontSize: '9px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-widest font-bold">Stats</p>
                </div>
                {[
                    { label: 'Boards', value: boards.length },
                    { label: 'Cards', value: totalCards },
                    { label: 'Members', value: members.length },
                ].map(r => (
                    <div key={r.label} className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(74,70,63,0.5)' }}>
                        <span style={{ fontSize: '9px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-widest">{r.label}</span>
                        <span style={{ fontSize: '13px', color: 'var(--cf-phosphor, #9aa67e)' }} className="cf-mono font-bold chrome-text">{r.value}</span>
                    </div>
                ))}
            </div>

            {/* members */}
            <div className="rounded-xl overflow-hidden" style={{
                background: 'var(--cf-graphite, #2b2a26)', border: '1px solid var(--cf-edge, #4a463f)',
                boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.4)',
            }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--cf-edge, #4a463f)' }}>
                    <p style={{ fontSize: '9px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-widest font-bold">Members</p>
                    {canManage && (
                        <button onClick={onMembersClick} style={{ fontSize: '8px', color: 'var(--cf-text-muted, #a39d8c)' }}
                            className="cf-mono uppercase tracking-widest cursor-pointer hover:underline">Manage</button>
                    )}
                </div>
                {members.map(m => (
                    <div key={m.id} className="flex items-center gap-2.5 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(74,70,63,0.4)' }}>
                        <Avatar user={m} size={20} />
                        <div className="flex-1 min-w-0">
                            <p style={{ fontSize: '11px', color: 'var(--cf-text, #e8e4d6)' }} className="font-bold truncate">{m.name}</p>
                            <p style={{ fontSize: '8px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-mono uppercase tracking-wide">
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
let _cachedUser:   UserSummary | null   = null;
let _cachedOwned:  ProjectInterface[]   = [];
let _cachedMember: ProjectInterface[]   = [];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectPage() {
    const params    = useParams();
    const router    = useRouter();
    const projectId = Number(params.id);

    const hasSidebar = _cachedOwned.length > 0 || _cachedMember.length > 0;

    const [user, setUser]                     = useState<UserSummary | null>(_cachedUser);
    const [project, setProject]               = useState<ProjectInterface | null>(null);
    const [ownedProjects, setOwnedProjects]   = useState<ProjectInterface[]>(_cachedOwned);
    const [memberProjects, setMemberProjects] = useState<ProjectInterface[]>(_cachedMember);
    const [editMode, setEditMode]             = useState(false);
    const [sidebarOpen, setSidebarOpen]       = useState(false);
    const [contentLoading, setContentLoading] = useState(true);

    useDocumentTitle(project?.name ? `Yondra - ${project.name}` : 'Yondra - Project');

    type ModalState =
        | { type: 'project-edit' }
        | { type: 'board-new' }
        | { type: 'board-edit'; board: ProjectBoard }
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
            // Revalidate the sidebar in the background so projects created
            // elsewhere (e.g. the dashboard "New project" flow) appear here too.
            fetchProjects()
                .then(all => {
                    const owned  = all?.owned  ?? [];
                    const member = all?.member ?? [];
                    _cachedOwned  = owned;
                    _cachedMember = member;
                    setOwnedProjects(owned);
                    setMemberProjects(member);
                })
                .catch(() => { /* keep the cached sidebar on failure */ });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // Full-page spinner only on the very first visit (no sidebar cache yet)
    if (!hasSidebar && contentLoading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - var(--app-header-h, 56px))' }}>
                <p style={{ fontSize: '12px', color: 'var(--cf-phosphor, #9aa67e)' }} className="cf-mono uppercase tracking-widest chrome-text">Loading…</p>
            </div>
        );
    }

    const boards: ProjectBoard[]  = project?.boards ?? [];
    const isOwner        = project?.owner_id === user?.id;
    // Co-owners (project_user role 'owner') can manage members too, not just the creator.
    const myRole         = project?.members?.find(m => m.id === user?.id)?.role;
    const canManage      = isOwner || myRole === 'owner';
    const allProjects    = [...ownedProjects, ...memberProjects];

    // ── handlers ─────────────────────────────────────────────────────────────

    async function handleSaveProject(data: ProjectFormData) {
        const updated = await updateProject(project!.id, data);
        setProject((p) => ({ ...p!, ...updated }));
        setOwnedProjects(prev => prev.map(p => p.id === project!.id ? { ...p, ...updated } : p));
        setModal(null);
    }

    async function handleDeleteProject() {
        await deleteProject(project!.id);
        router.push('/dashboard');
    }

    async function handleSaveBoard(data: BoardFormData) {
        if (modal?.type === 'board-edit') {
            const updated = await updateBoard(data.id!, { name: data.name, description: data.description, project_id: data.project_id });
            if (data.project_id !== project!.id) {
                // moved away — remove from this project and navigate to target
                setProject((p) => ({ ...p!, boards: (p!.boards ?? []).filter((b) => b.id !== data.id), boards_count: Math.max(0, (p!.boards_count ?? 1) - 1) }));
                router.push(`/projects/${data.project_id}`);
            } else {
                setProject((p) => ({ ...p!, boards: (p!.boards ?? []).map((b) => b.id === data.id ? { ...b, ...updated } : b) }));
            }
            setModal(null);
            return;
        }
        const saved = await createBoard(data);
        setProject((p) => ({
            ...p!,
            boards: [...(p!.boards ?? []), { ...saved, cards_count: 0, owner: user, shared_with: [] }],
            boards_count: (p!.boards_count ?? 0) + 1,
        }));
        setModal(null);
    }

    async function handleDeleteBoard(boardId: number) {
        await deleteBoard(boardId);
        setProject((p) => ({
            ...p!,
            boards: (p!.boards ?? []).filter((b) => b.id !== boardId),
            boards_count: Math.max(0, (p!.boards_count ?? 1) - 1),
        }));
        setModal(null);
    }

    function handleBoardClick(board: ProjectBoard) {
        if (editMode && isOwner) { setModal({ type: 'board-edit', board }); return; }
        router.push(`/boards/${board.id}`);
    }

    function handleMembersUpdate(updated: ProjectInterface) {
        setProject((p) => ({ ...p!, ...updated }));
        if (modal?.type === 'members') setModal({ type: 'members' });
    }

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex overflow-hidden" style={{ height: 'calc(100vh - var(--app-header-h, 56px))' }}>

            {/* mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Left sidebar ── */}
            <aside className={`
                glass-panel rounded-none z-40 lg:z-auto flex flex-col h-full w-56 flex-shrink-0
                fixed lg:relative transition-transform duration-200
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `} style={{ borderRight: '1px solid var(--cf-edge, #4a463f)' }}>
                {/* sidebar header */}
                <button onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 px-4 py-4 hover:bg-[#1c1a16] transition-colors cursor-pointer" style={{ borderBottom: '1px solid var(--cf-edge, #4a463f)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }}>←</span>
                    <span style={{ fontSize: '9px', color: 'var(--cf-text, #e8e4d6)' }} className="cf-label uppercase tracking-widest font-bold">All Projects</span>
                </button>

                <div className="flex-1 overflow-y-auto py-1">
                    {ownedProjects.length > 0 && (
                        <>
                            <p style={{ fontSize: '8px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label px-4 pt-3 pb-1 uppercase tracking-widest">Mine</p>
                            {ownedProjects.map(p => (
                                <FolderTab key={p.id} project={p} active={p.id === projectId}
                                    onClick={() => { router.push(`/projects/${p.id}`); setSidebarOpen(false); }} />
                            ))}
                        </>
                    )}
                    {memberProjects.length > 0 && (
                        <>
                            <p style={{ fontSize: '8px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label px-4 pt-4 pb-1 uppercase tracking-widest">Shared</p>
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
                <div className="glass-panel rounded-none flex items-center gap-3 px-5 py-3 border-b flex-shrink-0 flex-wrap"
                    style={{ borderColor: 'var(--cf-edge, #4a463f)' }}>
                    {/* mobile menu */}
                    <button className="lg:hidden p-1 cursor-pointer" style={{ color: 'var(--cf-text, #e8e4d6)' }}
                        onClick={() => setSidebarOpen(s => !s)}><Icon icon={faBars} /></button>

                    {/* color dot + project name */}
                    <span className="cf-led flex-shrink-0" style={{ backgroundColor: project?.color ?? 'transparent', boxShadow: project?.color ? `0 0 8px ${project.color}` : undefined }} />
                    <p style={{ fontSize: '15px' }} className="chrome-text font-bold truncate flex-1">
                        {project?.name ?? ''}
                    </p>

                    {/* actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {canManage && (
                            <button onClick={() => setModal({ type: 'members' })}
                                className="aero-btn aero-btn--ghost uppercase tracking-widest font-bold px-3 py-1.5 text-[9px]">
                                Members
                            </button>
                        )}
                        {isOwner && (
                            <button onClick={() => setModal({ type: 'project-edit' })}
                                className="aero-btn aero-btn--ghost uppercase tracking-widest font-bold px-3 py-1.5 text-[9px]">
                                <Icon icon={faGear} /> <p className='mt-1 ml-1'>Edit</p>
                            </button>
                        )}
                        <button onClick={() => setEditMode(e => !e)}
                            className={`aero-btn ${editMode ? 'aero-btn--magenta' : 'aero-btn--ghost'} uppercase tracking-widest font-bold px-3 py-1.5 text-[9px]`}>
                            <Icon icon={faGear} /> {editMode ? (
                                <p className='mt-1 ml-1'>Exit Edit Mode</p>
                            ) : (
                                <p className='mt-1 ml-1'>Edit Mode</p>
                            )}
                        </button>
                        {isOwner && (
                            <button onClick={() => setModal({ type: 'board-new' })}
                                className="aero-btn aero-btn--cyan uppercase tracking-widest font-bold px-3 py-1.5 text-[9px]">
                                + Board
                            </button>
                        )}
                    </div>
                </div>

                {/* boards grid */}
                <div className="flex-1 overflow-y-auto p-5 md:p-6">
                    {boards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p style={{ fontSize: '40px', color: 'var(--cf-edge, #4a463f)' }}>▦</p>
                            <p style={{ fontSize: '11px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-widest mt-3">No boards yet</p>
                            {isOwner && (
                                <button onClick={() => setModal({ type: 'board-new' })}
                                    className="aero-btn aero-btn--cyan mt-4 uppercase tracking-widest font-bold px-4 py-2 text-[9px]">
                                    + Create First Board
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                            {boards.map((b) => (
                                <BoardCard key={b.id} board={b} projectColor={project?.color ?? '#888'}
                                    editMode={editMode} isOwner={isOwner}
                                    onClick={() => handleBoardClick(b)} />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* ── Right panel (desktop) ── */}
            <aside className="glass-panel rounded-none hidden xl:flex flex-col w-52 flex-shrink-0 overflow-y-auto p-4 gap-4"
                style={{ borderLeft: '1px solid var(--cf-edge, #4a463f)', opacity: contentLoading ? 0.35 : 1, pointerEvents: contentLoading ? 'none' : undefined, transition: 'opacity 200ms ease' }}>
                {project && <RightPanel project={project} currentUserId={user?.id} onMembersClick={() => setModal({ type: 'members' })} />}
            </aside>

            {/* ── Modals ── */}
            {modal && (
                <Modal onClose={() => setModal(null)}>
                    {modal.type === 'project-edit' && (
                        <ProjectEditModal project={project!} onSave={handleSaveProject} onDelete={handleDeleteProject} onClose={() => setModal(null)} />
                    )}
                    {modal.type === 'board-new' && (
                        <BoardFormModal board={null} projectId={project!.id} projectColor={project!.color}
                            ownedProjects={ownedProjects} onSave={handleSaveBoard} onClose={() => setModal(null)} />
                    )}
                    {modal.type === 'board-edit' && (
                        <BoardFormModal board={modal.board} projectId={project!.id} projectColor={project!.color}
                            ownedProjects={ownedProjects} onSave={handleSaveBoard}
                            onDelete={() => handleDeleteBoard(modal.board.id)} onClose={() => setModal(null)} />
                    )}
                    {modal.type === 'members' && (
                        <MembersModal project={project!} currentUserId={user?.id}
                            onUpdate={handleMembersUpdate} onClose={() => setModal(null)} />
                    )}
                </Modal>
            )}
        </div>
    );
}

