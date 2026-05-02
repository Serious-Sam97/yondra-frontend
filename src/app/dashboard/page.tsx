'use client';

import Modal from '@/components/shared/Modal';
import { fetchUser } from '@/lib/auth';
import {
    fetchProjects, createProject, updateProject, deleteProject,
    createBoard, updateBoard, deleteBoard,
    addProjectMember, updateProjectMember, removeProjectMember,
} from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// ─── constants ────────────────────────────────────────────────────────────────

const PROJECT_COLORS = [
    '#1976D2', '#388E3C', '#F57C00', '#7B1FA2',
    '#C62828', '#00838F', '#AD1457', '#4527A0',
];

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function Avatar({ user, size = 22 }: { user: { id: number; name: string }; size?: number }) {
    return (
        <div
            title={user.name}
            style={{
                backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length],
                width: size, height: size, fontSize: size * 0.42,
            }}
            className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 border-2 border-[#1a1a12]"
        >
            {initials(user.name)}
        </div>
    );
}

// ─── Left panel: project folder tabs ─────────────────────────────────────────

function FolderTab({
    project, active, onClick, isMember,
}: {
    project: any; active: boolean; onClick: () => void; isMember?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left group transition-all duration-150 focus:outline-none"
        >
            <div
                style={{
                    borderLeftColor: active ? project.color : 'transparent',
                    backgroundColor: active ? project.color + '18' : 'transparent',
                }}
                className={`
                    relative flex items-center gap-3 px-4 py-3 border-l-4
                    hover:bg-[#2a2a1a] transition-colors duration-100
                    ${active ? 'border-l-4' : 'border-l-4 hover:border-[#555]'}
                `}
            >
                {/* folder icon */}
                <div
                    style={{ backgroundColor: project.color + '33', color: project.color }}
                    className="w-7 h-7 rounded flex items-center justify-center text-base flex-shrink-0 font-bold"
                >
                    {project.name[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                    <p
                        style={{ color: active ? project.color : '#d4c97a' }}
                        className="text-sm font-bold truncate leading-tight"
                    >
                        {project.name}
                    </p>
                    <p className="text-[10px] text-[#888] truncate">
                        {project.boards_count ?? 0} board{project.boards_count !== 1 ? 's' : ''}
                        {isMember && <span className="ml-1 text-[#aaa]">· member</span>}
                    </p>
                </div>

                {active && (
                    <div
                        style={{ backgroundColor: project.color }}
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    />
                )}
            </div>
        </button>
    );
}

// ─── Center: board card ───────────────────────────────────────────────────────

function BoardCard({
    board, projectColor, onClick, editMode, isShared,
}: {
    board: any; projectColor: string; onClick: () => void; editMode: boolean; isShared: boolean;
}) {
    const cardCount = board.cards_count ?? 0;

    return (
        <div
            onClick={onClick}
            className={`
                group relative cursor-pointer flex flex-col overflow-hidden rounded
                transition-all duration-150 hover:-translate-y-0.5
                ${editMode && !isShared ? 'ring-2 ring-yellow-400/50' : ''}
            `}
            style={{
                background: 'linear-gradient(160deg, #f5f0dc 0%, #ede8cc 100%)',
                boxShadow: '3px 3px 0 rgba(0,0,0,0.4), 1px 1px 0 rgba(0,0,0,0.2)',
                fontFamily: 'Georgia, serif',
                border: `1px solid ${projectColor}55`,
            }}
        >
            {/* color tab at top */}
            <div style={{ backgroundColor: projectColor }} className="h-2 w-full flex-shrink-0" />

            <div className="px-4 pt-3 pb-4 flex flex-col flex-1 gap-2">
                <div className="flex items-start justify-between gap-1">
                    <p style={{ color: '#1a1a1a', fontSize: '14px' }} className="font-bold leading-snug flex-1">
                        {board.name}
                    </p>
                    {isShared && (
                        <span style={{ fontSize: '9px', color: '#1976D2', backgroundColor: '#1976D220', borderColor: '#1976D255' }}
                              className="px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide flex-shrink-0">
                            shared
                        </span>
                    )}
                    {editMode && !isShared && (
                        <span style={{ fontSize: '9px', color: '#b45309' }} className="font-bold uppercase tracking-wide flex-shrink-0 opacity-60 group-hover:opacity-100">
                            edit
                        </span>
                    )}
                </div>

                {board.description && (
                    <p style={{ color: '#666', fontSize: '11px' }} className="line-clamp-2 leading-snug">{board.description}</p>
                )}

                {/* card count bar */}
                <div className="mt-auto pt-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <span style={{ color: '#888', fontSize: '10px' }}>
                            {cardCount} {cardCount === 1 ? 'card' : 'cards'}
                        </span>
                        <span style={{ color: '#aaa', fontSize: '10px' }}>
                            {board.updated_at ? timeAgo(board.updated_at) : ''}
                        </span>
                    </div>
                    <div className="h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: '#ccc' }}>
                        <div
                            style={{ width: cardCount > 0 ? `${Math.min(cardCount * 8, 100)}%` : '0%', backgroundColor: projectColor }}
                            className="h-full rounded-full"
                        />
                    </div>
                </div>

                {/* members */}
                {(board.owner || (board.shared_with?.length > 0)) && (
                    <div className="flex items-center gap-1 flex-wrap mt-1">
                        {board.owner && <Avatar user={board.owner} size={18} />}
                        {board.shared_with?.slice(0, 3).map((u: any) => (
                            <Avatar key={u.id} user={u} size={18} />
                        ))}
                    </div>
                )}
            </div>

            {/* dog-ear */}
            <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 0, height: 0, borderStyle: 'solid',
                borderWidth: '0 0 12px 12px',
                borderColor: `transparent transparent ${projectColor}55 transparent`,
            }} />
        </div>
    );
}

// ─── Right panel: activity feed ───────────────────────────────────────────────

function RightPanel({ projects, memberProjects, selectedProject }: { projects: any[]; memberProjects: any[]; selectedProject: any | null }) {
    const allProjects = [...projects, ...memberProjects];
    const totalBoards = allProjects.reduce((s, p) => s + (p.boards_count ?? 0), 0);
    const totalCards  = projects.reduce((s, p) => s + (p.boards ?? []).reduce((b: number, board: any) => b + (board.cards_count ?? 0), 0), 0);

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* stats notepad */}
            <div
                className="rounded p-4 flex flex-col gap-3"
                style={{
                    background: 'linear-gradient(160deg, #f5f0dc 0%, #ede8cc 100%)',
                    boxShadow: '2px 2px 0 rgba(0,0,0,0.35)',
                    fontFamily: 'Georgia, serif',
                    border: '1px solid #b8a96055',
                }}
            >
                {/* notepad lines decoration */}
                <div className="border-b-2 border-[#c8a060]/30 pb-2 mb-1">
                    <p style={{ color: '#8a7a40', fontSize: '10px' }} className="uppercase tracking-widest font-bold">Stats</p>
                </div>
                <StatRow label="Projects" value={allProjects.length} />
                <StatRow label="Boards" value={totalBoards} />
                {selectedProject && (
                    <StatRow label={`${selectedProject.name} boards`} value={selectedProject.boards_count ?? 0} accent />
                )}
                <StatRow label="Members" value={
                    selectedProject
                        ? (selectedProject.members?.length ?? 1)
                        : allProjects.reduce((s, p) => s + (p.members?.length ?? 1), 0)
                } />
            </div>

            {/* members of selected project */}
            {selectedProject && selectedProject.members?.length > 0 && (
                <div
                    className="rounded p-4 flex flex-col gap-2"
                    style={{
                        background: 'linear-gradient(160deg, #f5f0dc 0%, #ede8cc 100%)',
                        boxShadow: '2px 2px 0 rgba(0,0,0,0.35)',
                        fontFamily: 'Georgia, serif',
                        border: '1px solid #b8a96055',
                    }}
                >
                    <div className="border-b-2 border-[#c8a060]/30 pb-2 mb-1">
                        <p style={{ color: '#8a7a40', fontSize: '10px' }} className="uppercase tracking-widest font-bold">Members</p>
                    </div>
                    {selectedProject.members.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-2">
                            <Avatar user={m} size={20} />
                            <div className="flex-1 min-w-0">
                                <p style={{ color: '#333', fontSize: '11px' }} className="font-bold truncate">{m.name}</p>
                                <p style={{ color: '#888', fontSize: '9px' }} className="uppercase tracking-wide">{m.role ?? 'member'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatRow({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span style={{ color: '#666', fontSize: '11px' }}>{label}</span>
            <span
                style={{ color: accent ? '#b45309' : '#333', fontSize: '13px' }}
                className="font-bold"
            >
                {value}
            </span>
        </div>
    );
}

// ─── Project form modal ───────────────────────────────────────────────────────

function ProjectFormModal({
    project, onSave, onDelete, onClose,
}: {
    project: any | null; onSave: (data: any) => void; onDelete?: () => void; onClose: () => void;
}) {
    const [name, setName] = useState(project?.name ?? '');
    const [description, setDescription] = useState(project?.description ?? '');
    const [color, setColor] = useState(project?.color ?? '#1976D2');
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
            className="rounded p-6 w-[90vw] max-w-md flex flex-col gap-5"
            style={{
                background: 'linear-gradient(160deg, #f5f0dc 0%, #ede8cc 100%)',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.5)',
                fontFamily: 'Georgia, serif',
                border: '1px solid #b8a96088',
            }}
        >
            <div className="border-b-2 border-[#c8a060]/30 pb-3">
                <p style={{ color: '#8a7a40', fontSize: '11px' }} className="uppercase tracking-widest font-bold">
                    {project ? 'Edit Project' : 'New Project'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label style={{ color: '#555', fontSize: '11px' }} className="uppercase tracking-widest font-bold">Name</label>
                    <input
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Project name..."
                        style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', backgroundColor: '#faf6e8', borderColor: '#c8b870' }}
                        className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#b45309]"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label style={{ color: '#555', fontSize: '11px' }} className="uppercase tracking-widest font-bold">Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Optional..."
                        rows={2}
                        style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', backgroundColor: '#faf6e8', borderColor: '#c8b870' }}
                        className="border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#b45309]"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label style={{ color: '#555', fontSize: '11px' }} className="uppercase tracking-widest font-bold">Color</label>
                    <div className="flex gap-2 flex-wrap">
                        {PROJECT_COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                style={{ backgroundColor: c, width: 24, height: 24, borderRadius: '50%' }}
                                className={`border-2 transition-all ${color === c ? 'border-[#1a1a1a] scale-125' : 'border-transparent'}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#c8b870]/40">
                    {onDelete ? (
                        <button
                            type="button"
                            onClick={onDelete}
                            style={{ color: '#b91c1c', fontSize: '11px' }}
                            className="uppercase tracking-widest font-bold hover:underline cursor-pointer"
                        >
                            Delete
                        </button>
                    ) : <div />}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ color: '#888', fontSize: '11px' }}
                            className="uppercase tracking-widest font-bold hover:underline cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            style={{ backgroundColor: color, color: '#fff', fontSize: '11px' }}
                            className="uppercase tracking-widest font-bold px-4 py-1.5 rounded cursor-pointer disabled:opacity-50"
                        >
                            {loading ? '...' : 'Save'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

// ─── Board form modal ─────────────────────────────────────────────────────────

function BoardFormModal({
    board, projectId, projectColor, ownedProjects, onSave, onDelete, onClose,
}: {
    board: any | null;
    projectId: number;
    projectColor: string;
    ownedProjects: any[];
    onSave: (data: any) => void;
    onDelete?: () => void;
    onClose: () => void;
}) {
    const [name, setName]               = useState(board?.name ?? '');
    const [description, setDescription] = useState(board?.description ?? '');
    const [targetProjectId, setTargetProjectId] = useState<number>(projectId);
    const [loading, setLoading]         = useState(false);

    const isNew = !board;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        await onSave({
            id: board?.id,
            name: name.trim(),
            description: description.trim() || '',
            project_id: targetProjectId,
        });
        setLoading(false);
    }

    const targetProject = ownedProjects.find(p => p.id === targetProjectId);
    const accentColor = targetProject?.color ?? projectColor;
    const moved = !isNew && targetProjectId !== projectId;

    return (
        <div
            className="rounded p-6 w-[90vw] max-w-md flex flex-col gap-5"
            style={{
                background: 'linear-gradient(160deg, #f5f0dc 0%, #ede8cc 100%)',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.5)',
                fontFamily: 'Georgia, serif',
                border: `1px solid ${accentColor}55`,
            }}
        >
            <div style={{ borderBottomColor: accentColor + '44' }} className="border-b-2 pb-3">
                <p style={{ color: '#8a7a40', fontSize: '11px' }} className="uppercase tracking-widest font-bold">
                    {isNew ? 'New Board' : 'Edit Board'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label style={{ color: '#555', fontSize: '11px' }} className="uppercase tracking-widest font-bold">Name</label>
                    <input
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Board name..."
                        style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', backgroundColor: '#faf6e8', borderColor: '#c8b870' }}
                        className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label style={{ color: '#555', fontSize: '11px' }} className="uppercase tracking-widest font-bold">Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Optional..."
                        rows={2}
                        style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', backgroundColor: '#faf6e8', borderColor: '#c8b870' }}
                        className="border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
                    />
                </div>

                {/* Project selector (move) */}
                <div className="flex flex-col gap-1">
                    <label style={{ color: '#555', fontSize: '11px' }} className="uppercase tracking-widest font-bold">
                        Project
                    </label>
                    <div className="flex items-center gap-2">
                        <div
                            style={{ backgroundColor: accentColor, width: 10, height: 10, borderRadius: 2, flexShrink: 0 }}
                        />
                        <select
                            value={targetProjectId}
                            onChange={e => setTargetProjectId(Number(e.target.value))}
                            style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', backgroundColor: '#faf6e8', borderColor: '#c8b870', fontSize: '12px' }}
                            className="flex-1 border rounded px-3 py-2 focus:outline-none cursor-pointer"
                        >
                            {ownedProjects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    {moved && (
                        <p style={{ color: '#b45309', fontSize: '10px' }} className="uppercase tracking-widest mt-0.5">
                            ↳ Will be moved to "{targetProject?.name}"
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#c8b870]/40">
                    {onDelete ? (
                        <button
                            type="button"
                            onClick={onDelete}
                            style={{ color: '#b91c1c', fontSize: '11px' }}
                            className="uppercase tracking-widest font-bold hover:underline cursor-pointer"
                        >
                            Delete
                        </button>
                    ) : <div />}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ color: '#888', fontSize: '11px' }}
                            className="uppercase tracking-widest font-bold hover:underline cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            style={{ backgroundColor: accentColor, color: '#fff', fontSize: '11px' }}
                            className="uppercase tracking-widest font-bold px-4 py-1.5 rounded cursor-pointer disabled:opacity-50"
                        >
                            {loading ? '...' : moved ? 'Move & Save' : 'Save'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

// ─── Members management modal ─────────────────────────────────────────────────

function MembersModal({
    project, currentUserId, onUpdate, onClose,
}: {
    project: any; currentUserId: number; onUpdate: (p: any) => void; onClose: () => void;
}) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'member' | 'viewer'>('member');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        setError('');
        try {
            const updated = await addProjectMember(project.id, email.trim(), role);
            onUpdate(updated);
            setEmail('');
        } catch {
            setError('User not found or already a member.');
        } finally {
            setLoading(false);
        }
    }

    async function handleRoleChange(userId: number, newRole: 'member' | 'viewer') {
        const updated = await updateProjectMember(project.id, userId, newRole);
        onUpdate(updated);
    }

    async function handleRemove(userId: number) {
        await removeProjectMember(project.id, userId);
        onUpdate({ ...project, members: project.members.filter((m: any) => m.id !== userId) });
    }

    const isOwner = project.owner_id === currentUserId;

    return (
        <div
            className="rounded p-6 w-[90vw] max-w-lg flex flex-col gap-5"
            style={{
                background: 'linear-gradient(160deg, #f5f0dc 0%, #ede8cc 100%)',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.5)',
                fontFamily: 'Georgia, serif',
                border: `1px solid ${project.color}55`,
            }}
        >
            <div style={{ borderBottomColor: project.color + '44' }} className="border-b-2 pb-3 flex items-center justify-between">
                <p style={{ color: '#8a7a40', fontSize: '11px' }} className="uppercase tracking-widest font-bold">
                    {project.name} · Members
                </p>
                <button onClick={onClose} style={{ color: '#888', fontSize: '11px' }} className="uppercase tracking-widest font-bold hover:underline cursor-pointer">
                    Close
                </button>
            </div>

            {/* existing members */}
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {project.members?.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3">
                        <Avatar user={m} size={22} />
                        <div className="flex-1 min-w-0">
                            <p style={{ color: '#1a1a1a', fontSize: '12px' }} className="font-bold truncate">{m.name}</p>
                            <p style={{ color: '#888', fontSize: '10px' }}>{m.email}</p>
                        </div>
                        {m.id === project.owner_id ? (
                            <span style={{ color: project.color, fontSize: '9px' }} className="uppercase tracking-widest font-bold">owner</span>
                        ) : isOwner ? (
                            <div className="flex items-center gap-2">
                                <select
                                    value={m.role ?? 'member'}
                                    onChange={e => handleRoleChange(m.id, e.target.value as any)}
                                    style={{ fontSize: '10px', backgroundColor: '#faf6e8', borderColor: '#c8b870', color: '#333' }}
                                    className="border rounded px-1 py-0.5 cursor-pointer"
                                >
                                    <option value="member">member</option>
                                    <option value="viewer">viewer</option>
                                </select>
                                <button
                                    onClick={() => handleRemove(m.id)}
                                    style={{ color: '#b91c1c', fontSize: '10px' }}
                                    className="font-bold hover:underline cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <span style={{ color: '#888', fontSize: '9px' }} className="uppercase tracking-widest">{m.role ?? 'member'}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* add member */}
            {isOwner && (
                <form onSubmit={handleAdd} className="flex flex-col gap-2 border-t border-[#c8b870]/40 pt-4">
                    <label style={{ color: '#555', fontSize: '11px' }} className="uppercase tracking-widest font-bold">Invite by email</label>
                    {error && <p style={{ color: '#b91c1c', fontSize: '11px' }}>{error}</p>}
                    <div className="flex gap-2">
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', backgroundColor: '#faf6e8', borderColor: '#c8b870', fontSize: '12px' }}
                            className="flex-1 border rounded px-3 py-1.5 focus:outline-none"
                        />
                        <select
                            value={role}
                            onChange={e => setRole(e.target.value as any)}
                            style={{ fontSize: '11px', backgroundColor: '#faf6e8', borderColor: '#c8b870', color: '#333' }}
                            className="border rounded px-2 py-1.5 cursor-pointer"
                        >
                            <option value="member">member</option>
                            <option value="viewer">viewer</option>
                        </select>
                        <button
                            type="submit"
                            disabled={loading || !email.trim()}
                            style={{ backgroundColor: project.color, color: '#fff', fontSize: '11px' }}
                            className="uppercase tracking-widest font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
                        >
                            {loading ? '...' : 'Add'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const router = useRouter();
    const [ownedProjects, setOwnedProjects]   = useState<any[]>([]);
    const [memberProjects, setMemberProjects] = useState<any[]>([]);
    const [user, setUser]                     = useState<any>(null);
    const [selectedId, setSelectedId]         = useState<number | null>(null);
    const [editMode, setEditMode]             = useState(false);

    // modals
    const [modal, setModal] = useState<
        | { type: 'project-new' }
        | { type: 'project-edit'; project: any }
        | { type: 'board-new'; projectId: number; projectColor: string }
        | { type: 'board-edit'; board: any; projectId: number; projectColor: string }
        | { type: 'members'; project: any }
        | null
    >(null);

    // mobile sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [userData, projectsData] = await Promise.all([fetchUser(), fetchProjects()]);
                if (userData) setUser(userData);
                if (projectsData) {
                    setOwnedProjects(projectsData.owned ?? []);
                    setMemberProjects(projectsData.member ?? []);
                    const first = projectsData.owned?.[0] ?? projectsData.member?.[0];
                    if (first) setSelectedId(first.id);
                }
            } catch {
                router.push('/login');
            }
        })();
    }, []);

    const allProjects   = [...ownedProjects, ...memberProjects];
    const selectedProject = allProjects.find(p => p.id === selectedId) ?? null;
    const selectedBoards  = selectedProject?.boards ?? [];
    const isOwner         = selectedProject?.owner_id === user?.id;

    // ── handlers ──────────────────────────────────────────────────────────────

    async function handleSaveProject(data: any) {
        if (modal?.type === 'project-edit') {
            const updated = await updateProject(modal.project.id, data);
            setOwnedProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
        } else {
            const created = await createProject(data);
            setOwnedProjects(prev => [...prev, { ...created, boards: [], boards_count: 0 }]);
            setSelectedId(created.id);
        }
        setModal(null);
    }

    async function handleDeleteProject(id: number) {
        await deleteProject(id);
        const remaining = ownedProjects.filter(p => p.id !== id);
        setOwnedProjects(remaining);
        setSelectedId(remaining[0]?.id ?? memberProjects[0]?.id ?? null);
        setModal(null);
    }

    async function handleSaveBoard(data: any) {
        if (modal?.type === 'board-edit') {
            const updated = await updateBoard(data.id, {
                name: data.name,
                description: data.description,
                project_id: data.project_id,
            });
            const sourceProjectId = modal.projectId;
            const targetProjectId = data.project_id;
            const moved = targetProjectId !== sourceProjectId;

            setOwnedProjects(prev => prev.map(p => {
                if (p.id === sourceProjectId) {
                    // remove from source (or update in place if not moved)
                    const boards = moved
                        ? (p.boards ?? []).filter((b: any) => b.id !== data.id)
                        : (p.boards ?? []).map((b: any) => b.id === data.id ? { ...b, ...updated } : b);
                    return { ...p, boards, boards_count: moved ? Math.max(0, (p.boards_count ?? 1) - 1) : p.boards_count };
                }
                if (moved && p.id === targetProjectId) {
                    // add to target project
                    return {
                        ...p,
                        boards: [...(p.boards ?? []), { ...updated, cards_count: updated.cards_count ?? 0 }],
                        boards_count: (p.boards_count ?? 0) + 1,
                    };
                }
                return p;
            }));

            if (moved) setSelectedId(targetProjectId);
            setModal(null);
            return;
        }

        const saved = await createBoard(data);
        const boardWithMeta = { ...saved, cards_count: 0, owner: user, shared_with: [] };
        setOwnedProjects(prev => prev.map(p =>
            p.id === data.project_id
                ? { ...p, boards: [...(p.boards ?? []), boardWithMeta], boards_count: (p.boards_count ?? 0) + 1 }
                : p
        ));
        setSelectedId(data.project_id);
        setModal(null);
    }

    async function handleDeleteBoard(boardId: number, projectId: number) {
        await deleteBoard(boardId);
        setOwnedProjects(prev => prev.map(p =>
            p.id === projectId
                ? { ...p, boards: (p.boards ?? []).filter((b: any) => b.id !== boardId), boards_count: Math.max(0, (p.boards_count ?? 1) - 1) }
                : p
        ));
        setModal(null);
    }

    function handleBoardClick(board: any) {
        if (editMode && isOwner) {
            setModal({ type: 'board-edit', board, projectId: selectedProject.id, projectColor: selectedProject.color });
            return;
        }
        router.push(`/boards/${board.id}`);
    }

    function handleProjectMembersUpdate(updated: any) {
        setOwnedProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
        if (modal?.type === 'members') {
            setModal({ type: 'members', project: updated });
        }
    }

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex h-[calc(100vh-56px)] overflow-hidden" style={{ backgroundColor: '#111108' }}>

            {/* ── Mobile sidebar overlay ── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Left panel ── */}
            <aside
                className={`
                    fixed lg:relative z-40 lg:z-auto
                    flex flex-col h-full w-64 flex-shrink-0
                    transition-transform duration-200
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
                style={{
                    backgroundColor: '#18180f',
                    borderRight: '1px solid #2a2a18',
                }}
            >
                {/* panel header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a18]">
                    <div>
                        <p style={{ color: '#8a7a40', fontSize: '9px' }} className="uppercase tracking-[0.3em] font-bold">Projects</p>
                        <p style={{ color: '#d4c97a', fontSize: '13px' }} className="font-bold mt-0.5">{user?.name ?? '...'}</p>
                    </div>
                    <button
                        onClick={() => setModal({ type: 'project-new' })}
                        title="New project"
                        style={{ color: '#d4c97a', backgroundColor: '#d4c97a18', borderColor: '#d4c97a33' }}
                        className="w-7 h-7 rounded border flex items-center justify-center text-lg font-bold hover:bg-[#d4c97a33] transition-colors cursor-pointer"
                    >
                        +
                    </button>
                </div>

                {/* folder list */}
                <div className="flex-1 overflow-y-auto py-2">
                    {ownedProjects.length === 0 && memberProjects.length === 0 && (
                        <p style={{ color: '#555', fontSize: '11px' }} className="px-4 py-6 text-center">No projects yet.</p>
                    )}

                    {ownedProjects.length > 0 && (
                        <>
                            <p style={{ color: '#555', fontSize: '9px' }} className="px-4 pt-2 pb-1 uppercase tracking-widest">Mine</p>
                            {ownedProjects.map(p => (
                                <FolderTab
                                    key={p.id}
                                    project={p}
                                    active={p.id === selectedId}
                                    onClick={() => { setSelectedId(p.id); setSidebarOpen(false); }}
                                />
                            ))}
                        </>
                    )}

                    {memberProjects.length > 0 && (
                        <>
                            <p style={{ color: '#555', fontSize: '9px' }} className="px-4 pt-4 pb-1 uppercase tracking-widest">Shared</p>
                            {memberProjects.map(p => (
                                <FolderTab
                                    key={p.id}
                                    project={p}
                                    active={p.id === selectedId}
                                    isMember
                                    onClick={() => { setSelectedId(p.id); setSidebarOpen(false); }}
                                />
                            ))}
                        </>
                    )}
                </div>
            </aside>

            {/* ── Center ── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* center header */}
                <div
                    className="flex items-center justify-between gap-3 px-6 py-3 border-b flex-shrink-0 flex-wrap"
                    style={{ borderColor: '#2a2a18', backgroundColor: '#14140c' }}
                >
                    {/* mobile menu button */}
                    <button
                        className="lg:hidden p-1 rounded cursor-pointer"
                        style={{ color: '#d4c97a' }}
                        onClick={() => setSidebarOpen(s => !s)}
                    >
                        ☰
                    </button>

                    {selectedProject ? (
                        <div className="flex items-center gap-3 min-w-0">
                            <div
                                style={{ backgroundColor: selectedProject.color }}
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                            />
                            <p style={{ color: '#d4c97a', fontSize: '15px' }} className="font-bold truncate">
                                {selectedProject.name}
                            </p>
                            {selectedProject.description && (
                                <p style={{ color: '#666', fontSize: '12px' }} className="truncate hidden sm:block">
                                    {selectedProject.description}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p style={{ color: '#555', fontSize: '14px' }}>Select a project</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                        {selectedProject && isOwner && (
                            <>
                                <button
                                    onClick={() => setModal({ type: 'members', project: selectedProject })}
                                    style={{ color: '#888', borderColor: '#333', fontSize: '10px' }}
                                    className="uppercase tracking-widest px-2 py-1 rounded border hover:border-[#555] hover:text-[#bbb] transition-colors cursor-pointer"
                                >
                                    Members
                                </button>
                                <button
                                    onClick={() => setModal({ type: 'project-edit', project: selectedProject })}
                                    style={{ color: '#888', borderColor: '#333', fontSize: '10px' }}
                                    className="uppercase tracking-widest px-2 py-1 rounded border hover:border-[#555] hover:text-[#bbb] transition-colors cursor-pointer"
                                >
                                    ⚙ Project
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => setEditMode(e => !e)}
                            style={{
                                color: editMode ? '#d4c97a' : '#666',
                                borderColor: editMode ? '#d4c97a55' : '#333',
                                backgroundColor: editMode ? '#d4c97a12' : 'transparent',
                                fontSize: '10px',
                            }}
                            className="uppercase tracking-widest px-2 py-1 rounded border transition-colors cursor-pointer"
                        >
                            ⚙ {editMode ? 'Exit Edit' : 'Edit'}
                        </button>

                        {selectedProject && isOwner && (
                            <button
                                onClick={() => setModal({ type: 'board-new', projectId: selectedProject.id, projectColor: selectedProject.color })}
                                style={{ backgroundColor: selectedProject.color, color: '#fff', fontSize: '10px' }}
                                className="uppercase tracking-widest font-bold px-3 py-1.5 rounded cursor-pointer hover:opacity-90 transition-opacity"
                            >
                                + Board
                            </button>
                        )}
                    </div>
                </div>

                {/* boards grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!selectedProject ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p style={{ color: '#333', fontSize: '40px' }}>▦</p>
                            <p style={{ color: '#555', fontSize: '13px' }} className="mt-2 uppercase tracking-widest">
                                Select a project from the left
                            </p>
                            <button
                                onClick={() => setModal({ type: 'project-new' })}
                                style={{ color: '#d4c97a', borderColor: '#d4c97a44', fontSize: '11px' }}
                                className="mt-4 uppercase tracking-widest px-4 py-2 rounded border hover:bg-[#d4c97a12] transition-colors cursor-pointer"
                            >
                                + New Project
                            </button>
                        </div>
                    ) : selectedBoards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p style={{ color: '#333', fontSize: '40px' }}>▦</p>
                            <p style={{ color: '#555', fontSize: '13px' }} className="mt-2 uppercase tracking-widest">No boards yet</p>
                            {isOwner && (
                                <button
                                    onClick={() => setModal({ type: 'board-new', projectId: selectedProject.id, projectColor: selectedProject.color })}
                                    style={{ color: selectedProject.color, borderColor: selectedProject.color + '44', fontSize: '11px' }}
                                    className="mt-4 uppercase tracking-widest px-4 py-2 rounded border hover:opacity-80 transition-opacity cursor-pointer"
                                >
                                    + Create First Board
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                            {selectedBoards.map((board: any) => (
                                <BoardCard
                                    key={board.id}
                                    board={board}
                                    projectColor={selectedProject.color}
                                    editMode={editMode}
                                    isShared={!isOwner}
                                    onClick={() => handleBoardClick(board)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* ── Right panel (desktop only) ── */}
            <aside
                className="hidden xl:flex flex-col w-52 flex-shrink-0 overflow-y-auto p-4 gap-4"
                style={{ backgroundColor: '#18180f', borderLeft: '1px solid #2a2a18' }}
            >
                <RightPanel
                    projects={ownedProjects}
                    memberProjects={memberProjects}
                    selectedProject={selectedProject}
                />
            </aside>

            {/* ── Modals ── */}
            {modal && (
                <Modal>
                    {modal.type === 'project-new' && (
                        <ProjectFormModal
                            project={null}
                            onSave={handleSaveProject}
                            onClose={() => setModal(null)}
                        />
                    )}
                    {modal.type === 'project-edit' && (
                        <ProjectFormModal
                            project={modal.project}
                            onSave={handleSaveProject}
                            onDelete={() => handleDeleteProject(modal.project.id)}
                            onClose={() => setModal(null)}
                        />
                    )}
                    {modal.type === 'board-new' && (
                        <BoardFormModal
                            board={null}
                            projectId={modal.projectId}
                            projectColor={modal.projectColor}
                            ownedProjects={ownedProjects}
                            onSave={handleSaveBoard}
                            onClose={() => setModal(null)}
                        />
                    )}
                    {modal.type === 'board-edit' && (
                        <BoardFormModal
                            board={modal.board}
                            projectId={modal.projectId}
                            projectColor={modal.projectColor}
                            ownedProjects={ownedProjects}
                            onSave={handleSaveBoard}
                            onDelete={() => handleDeleteBoard(modal.board.id, modal.projectId)}
                            onClose={() => setModal(null)}
                        />
                    )}
                    {modal.type === 'members' && (
                        <MembersModal
                            project={modal.project}
                            currentUserId={user?.id}
                            onUpdate={handleProjectMembersUpdate}
                            onClose={() => setModal(null)}
                        />
                    )}
                </Modal>
            )}
        </div>
    );
}
