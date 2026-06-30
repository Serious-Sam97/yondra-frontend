'use client'

import Modal from "@/components/shared/Modal";
import { SharedUser } from "@/interfaces/BoardInterface";
import { shareBoard, unshareBoard, updateSharePermission } from "@/lib/api";
import { useState } from "react";

interface ShareModalProps {
    boardId: number;
    sharedWith: SharedUser[];
    onClose: () => void;
    onUpdate: (users: SharedUser[]) => void;
}

export default function ShareModal({ boardId, sharedWith, onClose, onUpdate }: ShareModalProps) {
    const [email, setEmail] = useState('');
    const [invitePermission, setInvitePermission] = useState<'read' | 'write'>('write');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await shareBoard(boardId, email, invitePermission);
            onUpdate([...sharedWith, res.user]);
            setEmail('');
        } catch (err: any) {
            setError(err.message ?? 'Failed to share board.');
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePermission = async (user: SharedUser) => {
        const next: 'read' | 'write' = user.permission === 'write' ? 'read' : 'write';
        await updateSharePermission(boardId, user.id, next);
        onUpdate(sharedWith.map(u => u.id === user.id ? { ...u, permission: next } : u));
    };

    const handleRemove = async (userId: number) => {
        await unshareBoard(boardId, userId);
        onUpdate(sharedWith.filter(u => u.id !== userId));
    };

    return (
        <Modal>
            <div className="aero-menu p-6 w-[90%] max-w-md">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <span className="cf-led" style={{ background: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)' }} />
                        <p className="cf-label text-xs uppercase tracking-widest" style={{ color: 'var(--cf-text-muted)' }}>Share board</p>
                    </div>
                    <button onClick={onClose} className="transition-colors cursor-pointer" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
                </div>

                <form onSubmit={handleShare} className="flex flex-col gap-3 mb-5">
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="Invite by email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="glass-input flex-1 text-sm px-3 py-2"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest px-4 py-2 disabled:opacity-50"
                        >
                            {loading ? '...' : 'Invite'}
                        </button>
                    </div>

                    {/* Permission toggle for new invite */}
                    <div className="flex items-center gap-2">
                        <span className="cf-label text-xs uppercase tracking-widest" style={{ color: 'var(--cf-text-muted)' }}>Invite as</span>
                        <div className="flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => setInvitePermission('write')}
                                className="aero-pill text-xs px-3 py-1.5 uppercase tracking-widest font-bold cursor-pointer transition-all duration-150"
                                style={invitePermission === 'write'
                                    ? { background: 'rgba(154,166,126,0.16)', borderColor: 'rgba(154,166,126,0.55)', color: 'var(--cf-phosphor)', boxShadow: '0 0 8px rgba(154,166,126,0.4)' }
                                    : { color: 'var(--cf-text-muted)' }}
                            >
                                Write
                            </button>
                            <button
                                type="button"
                                onClick={() => setInvitePermission('read')}
                                className="aero-pill text-xs px-3 py-1.5 uppercase tracking-widest font-bold cursor-pointer transition-all duration-150"
                                style={invitePermission === 'read'
                                    ? { background: 'rgba(154,166,126,0.16)', borderColor: 'rgba(154,166,126,0.55)', color: 'var(--cf-phosphor)', boxShadow: '0 0 8px rgba(154,166,126,0.4)' }
                                    : { color: 'var(--cf-text-muted)' }}
                            >
                                Read
                            </button>
                        </div>
                    </div>
                </form>

                {error && <p className="cf-mono text-xs mb-4" style={{ color: 'var(--cf-red)' }}>{error}</p>}

                {sharedWith.length > 0 && (
                    <div>
                        <p className="cf-label text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--cf-text-muted)' }}>Collaborators</p>
                        <ul className="space-y-2">
                            {sharedWith.map(user => (
                                <li key={user.id} className="glass-card flex items-center justify-between rounded-lg px-3 py-3 gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--cf-ink)' }}>{user.name}</p>
                                        <p className="text-xs truncate" style={{ color: 'rgba(42,38,32,0.6)' }}>{user.email}</p>
                                    </div>

                                    {/* Permission toggle */}
                                    <button
                                        onClick={() => handleTogglePermission(user)}
                                        className="aero-pill text-xs px-2.5 py-1 font-bold uppercase tracking-widest cursor-pointer transition-all duration-150 flex-shrink-0"
                                        style={user.permission === 'write'
                                            ? { background: 'rgba(154,166,126,0.16)', borderColor: 'rgba(154,166,126,0.55)', color: 'var(--cf-ink)', boxShadow: '0 0 8px rgba(154,166,126,0.4)' }
                                            : { color: 'rgba(42,38,32,0.6)' }}
                                        title="Click to toggle permission"
                                    >
                                        {user.permission === 'write' ? 'Write' : 'Read'}
                                    </button>

                                    <button
                                        onClick={() => handleRemove(user.id)}
                                        className="text-xs cursor-pointer transition-colors uppercase tracking-widest flex-shrink-0 hover:opacity-70"
                                        style={{ color: 'var(--cf-red)' }}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {sharedWith.length === 0 && (
                    <p className="cf-mono text-xs text-center py-4" style={{ color: 'var(--cf-text-muted)' }}>No collaborators yet</p>
                )}
            </div>
        </Modal>
    );
}
