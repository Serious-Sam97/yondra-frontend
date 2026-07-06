'use client'

import Modal from "@/components/shared/Modal";
import Icon from "@/components/ui/Icon";
import { faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { BoardPermission, SharedUser } from "@/interfaces/BoardInterface";
import { getShareCandidates, shareBoard, shareBoardWithUser, unshareBoard, updateSharePermission } from "@/lib/api";
import { useEffect, useState } from "react";

interface ShareCandidate {
    id: number;
    name: string;
    email: string;
    role: string;
    shared: boolean;
    permission?: BoardPermission;
}

// Board access levels, coloured to match the project roles: owner→amber,
// write→phosphor (edit), read→cyan (view).
const PERM_META: Record<BoardPermission, { color: string; bg: string; border: string; glow: string; rank: number }> = {
    read:  { color: 'var(--cf-cyan, #6fe0ff)',     bg: 'rgba(111,224,255,0.14)', border: 'rgba(111,224,255,0.45)',glow: 'rgba(111,224,255,0.35)',rank: 0 },
    write: { color: 'var(--cf-phosphor, #9aa67e)', bg: 'rgba(154,166,126,0.16)', border: 'rgba(154,166,126,0.5)', glow: 'rgba(154,166,126,0.4)', rank: 1 },
    owner: { color: 'var(--cf-amber, #ffb000)',    bg: 'rgba(255,176,0,0.15)',   border: 'rgba(255,176,0,0.5)',   glow: 'rgba(255,176,0,0.4)',   rank: 2 },
};

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();

// Small avatar with a permission-coloured ring.
function RingAvatar({ id, name, ring }: { id: number; name: string; ring: string }) {
    return (
        <span className="rounded-full flex-shrink-0" style={{ boxShadow: `0 0 0 1.5px var(--cf-panel, #26241f), 0 0 0 3px ${ring}` }}>
            <span className="cf-mono rounded-full flex items-center justify-center text-white font-bold" title={name}
                style={{ width: 30, height: 30, fontSize: 12, backgroundColor: AVATAR_COLORS[id % AVATAR_COLORS.length] }}>
                {initials(name)}
            </span>
        </span>
    );
}

// Segmented Read · Write · Owner control — same language as the project roles.
function PermSegments({ value, onChange }: { value: BoardPermission; onChange: (p: BoardPermission) => void }) {
    return (
        <div role="group" aria-label="Access level"
            className="inline-flex gap-0.5 p-0.5 rounded-lg flex-shrink-0"
            style={{ background: 'var(--cf-screen, #0d1410)', border: '1px solid #14130f', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)' }}>
            {(['read', 'write', 'owner'] as const).map(p => {
                const active = value === p;
                return (
                    <button key={p} type="button" onClick={() => !active && onChange(p)}
                        className="cf-mono uppercase font-bold rounded-md px-2 py-1 cursor-pointer transition-all duration-150"
                        style={{ fontSize: '9px', letterSpacing: '0.1em',
                            color: active ? PERM_META[p].color : 'var(--cf-text-dim, #6f6a5c)',
                            background: active ? PERM_META[p].bg : 'transparent',
                            boxShadow: active ? `0 0 8px ${PERM_META[p].glow}` : undefined }}>
                        {p}
                    </button>
                );
            })}
        </div>
    );
}

interface ShareModalProps {
    boardId: number;
    sharedWith: SharedUser[];
    onClose: () => void;
    onUpdate: (users: SharedUser[]) => void;
}

export default function ShareModal({ boardId, sharedWith, onClose, onUpdate }: ShareModalProps) {
    const [email, setEmail] = useState('');
    const [invitePermission, setInvitePermission] = useState<BoardPermission>('write');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [candidates, setCandidates] = useState<ShareCandidate[]>([]);
    const [addingId, setAddingId] = useState<number | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);

    useEffect(() => {
        let active = true;
        getShareCandidates(boardId)
            .then((res: ShareCandidate[]) => { if (active) setCandidates(res ?? []); })
            .catch(() => { /* no parent project / not owner — silently hide the picker */ });
        return () => { active = false; };
    }, [boardId]);

    // Project members who aren't already shared onto the board.
    const availableMembers = candidates.filter(
        c => !c.shared && !sharedWith.some(u => u.id === c.id)
    );

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await shareBoard(boardId, email, invitePermission);
            onUpdate([...sharedWith, res.user]);
            setEmail('');
        } catch (err) {
            setError((err as Error).message ?? 'Failed to share board.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (member: ShareCandidate) => {
        setError('');
        setAddingId(member.id);
        try {
            const res = await shareBoardWithUser(boardId, member.id, invitePermission);
            onUpdate([...sharedWith, res.user]);
            setCandidates(prev => prev.map(c => c.id === member.id ? { ...c, shared: true } : c));
        } catch (err) {
            setError((err as Error).message ?? 'Failed to add member.');
        } finally {
            setAddingId(null);
        }
    };

    const handleSetPermission = async (user: SharedUser, next: BoardPermission) => {
        setError('');
        onUpdate(sharedWith.map(u => u.id === user.id ? { ...u, permission: next } : u));
        try { await updateSharePermission(boardId, user.id, next); }
        catch { setError("Couldn't change that access level."); }
    };

    const handleRemove = async (userId: number) => {
        setConfirmId(null);
        await unshareBoard(boardId, userId);
        onUpdate(sharedWith.filter(u => u.id !== userId));
    };

    return (
        <Modal>
            <div className="aero-menu rounded-2xl p-6 w-[90vw] max-w-md flex flex-col gap-4 relative">
                <span className="cf-screw" style={{ position: 'absolute', top: 8, left: 8 }} />
                <span className="cf-screw" style={{ position: 'absolute', top: 8, right: 8 }} />
                <span className="cf-screw" style={{ position: 'absolute', bottom: 8, left: 8 }} />
                <span className="cf-screw" style={{ position: 'absolute', bottom: 8, right: 8 }} />

                <div style={{ borderBottom: '1px solid var(--cf-edge, #4a463f)' }} className="pb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="cf-led flex-shrink-0" style={{ background: 'var(--cf-phosphor)', boxShadow: '0 0 8px var(--cf-phosphor)' }} />
                        <p className="cf-label uppercase tracking-[0.25em] font-bold truncate" style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }}>Share board</p>
                        {sharedWith.length > 0 && (
                            <span className="cf-mono font-bold rounded-full flex-shrink-0" style={{ fontSize: '9px', color: 'var(--cf-ink, #2a2620)', background: 'var(--cf-phosphor, #9aa67e)', padding: '1px 7px' }}>{sharedWith.length}</span>
                        )}
                    </div>
                    <button onClick={onClose} aria-label="Close" className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer flex-shrink-0" style={{ border: '1px solid var(--cf-edge, #4a463f)', background: '#211f1b', color: 'var(--cf-text-muted, #a39d8c)' }}>
                        <Icon icon={faXmark} style={{ fontSize: '11px' }} />
                    </button>
                </div>

                {/* Permission legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg px-3 py-2" style={{ background: 'var(--cf-screen, #0d1410)', border: '1px solid #14130f', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                    {([['owner', 'manages sharing'], ['write', 'edits cards'], ['read', 'views only']] as const).map(([p, desc]) => (
                        <span key={p} className="flex items-center gap-1.5" style={{ fontSize: '9.5px', color: 'var(--cf-text-muted, #a39d8c)' }}>
                            <span className="rounded-full" style={{ width: 7, height: 7, background: PERM_META[p].color, boxShadow: `0 0 6px ${PERM_META[p].color}` }} />
                            <b className="cf-mono uppercase font-bold" style={{ color: 'var(--cf-text, #e8e4d6)', letterSpacing: '0.1em' }}>{p}</b> {desc}
                        </span>
                    ))}
                </div>

                {error && <p className="cf-mono" style={{ fontSize: '10px', color: 'var(--cf-red)' }}>{error}</p>}

                {/* Collaborators */}
                {sharedWith.length > 0 && (
                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto -mx-1 px-1">
                        {sharedWith.map(user => {
                            const perm = (user.permission ?? 'write') as BoardPermission;
                            const meta = PERM_META[perm];
                            return (
                                <div key={user.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2 relative" style={{ background: '#211f1b', border: '1px solid #38352e' }}>
                                    <span className="rounded-r-sm" style={{ position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
                                    <RingAvatar id={user.id} name={user.name} ring={meta.color} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate" style={{ fontSize: '12px', color: 'var(--cf-text, #e8e4d6)' }}>{user.name}</p>
                                        <p className="cf-mono truncate" style={{ fontSize: '9px', color: 'var(--cf-text-muted, #a39d8c)' }}>{user.email}</p>
                                    </div>
                                    {confirmId === user.id ? (
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className="uppercase" style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--cf-red, #ff5a4d)' }}>Remove?</span>
                                            <button onClick={() => handleRemove(user.id)} className="cf-mono uppercase rounded-md px-2 py-1 cursor-pointer" style={{ fontSize: '9px', letterSpacing: '0.1em', background: 'rgba(255,90,77,0.16)', border: '1px solid rgba(255,90,77,0.55)', color: 'var(--cf-red, #ff5a4d)' }}>Yes</button>
                                            <button onClick={() => setConfirmId(null)} className="cf-mono uppercase rounded-md px-2 py-1 cursor-pointer" style={{ fontSize: '9px', letterSpacing: '0.1em', border: '1px solid var(--cf-edge, #4a463f)', color: 'var(--cf-text-muted, #a39d8c)' }}>No</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <PermSegments value={perm} onChange={next => handleSetPermission(user, next)} />
                                            <button onClick={() => setConfirmId(user.id)} aria-label={`Remove ${user.name}`} title="Remove"
                                                className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors" style={{ color: 'var(--cf-text-dim, #6f6a5c)' }}
                                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--cf-red, #ff5a4d)')}
                                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--cf-text-dim, #6f6a5c)')}>
                                                <Icon icon={faTrash} style={{ fontSize: '11px' }} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {sharedWith.length === 0 && (
                    <p className="cf-mono text-center py-3" style={{ fontSize: '10px', color: 'var(--cf-text-dim, #6f6a5c)' }}>Not shared with anyone yet</p>
                )}

                {/* Add from the parent project's members */}
                {availableMembers.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                        <p className="cf-label uppercase tracking-widest font-bold" style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }}>Add from project</p>
                        {availableMembers.map(member => (
                            <div key={member.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2" style={{ background: '#211f1b', border: '1px solid #38352e' }}>
                                <RingAvatar id={member.id} name={member.name} ring="var(--cf-text-dim, #6f6a5c)" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate" style={{ fontSize: '12px', color: 'var(--cf-text, #e8e4d6)' }}>{member.name}</p>
                                    <p className="cf-mono truncate" style={{ fontSize: '9px', color: 'var(--cf-text-muted, #a39d8c)' }}>{member.email}</p>
                                </div>
                                <button onClick={() => handleAddMember(member)} disabled={addingId === member.id}
                                    className="cf-mono uppercase font-bold rounded-md px-3 py-1.5 cursor-pointer transition-all duration-150 flex-shrink-0 disabled:opacity-50"
                                    style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--cf-phosphor)', background: 'rgba(154,166,126,0.16)', border: '1px solid rgba(154,166,126,0.5)', boxShadow: '0 0 8px rgba(154,166,126,0.4)' }}
                                    title={`Grant ${invitePermission} access`}>
                                    {addingId === member.id ? '…' : '+ Add'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Invite by email */}
                <form onSubmit={handleShare} className="flex flex-col gap-2.5 pt-4" style={{ borderTop: '1px solid var(--cf-edge, #4a463f)' }}>
                    <label className="cf-label uppercase tracking-widest font-bold" style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }}>Invite by email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" required
                        style={{ fontSize: '12px' }} className="glass-input cf-lcd w-full" />
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <PermSegments value={invitePermission} onChange={setInvitePermission} />
                        <button type="submit" disabled={loading || !email.trim()}
                            className="aero-btn aero-btn--cyan uppercase tracking-widest font-bold px-4 py-1.5 text-[10px] disabled:opacity-50">
                            {loading ? '…' : 'Send invite'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
