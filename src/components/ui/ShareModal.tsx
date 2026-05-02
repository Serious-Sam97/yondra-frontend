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
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-[90%] max-w-md">
                <div className="flex items-center justify-between mb-5">
                    <p className="text-xs uppercase tracking-widest text-gray-400">Share Board</p>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors cursor-pointer">✕</button>
                </div>

                <form onSubmit={handleShare} className="flex flex-col gap-3 mb-5">
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="Invite by email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-amber-400 placeholder-gray-600"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="text-xs uppercase tracking-widest px-4 py-2 rounded-lg border-2 border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-black font-bold cursor-pointer transition-all duration-200 disabled:opacity-50"
                        >
                            {loading ? '...' : 'Invite'}
                        </button>
                    </div>

                    {/* Permission toggle for new invite */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 uppercase tracking-widest">Invite as</span>
                        <div className="flex rounded-lg overflow-hidden border border-gray-700">
                            <button
                                type="button"
                                onClick={() => setInvitePermission('write')}
                                className={`text-xs px-3 py-1.5 uppercase tracking-widest font-bold cursor-pointer transition-all duration-150 ${invitePermission === 'write' ? 'bg-amber-400 text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                Write
                            </button>
                            <button
                                type="button"
                                onClick={() => setInvitePermission('read')}
                                className={`text-xs px-3 py-1.5 uppercase tracking-widest font-bold cursor-pointer transition-all duration-150 ${invitePermission === 'read' ? 'bg-amber-400 text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                Read
                            </button>
                        </div>
                    </div>
                </form>

                {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

                {sharedWith.length > 0 && (
                    <div>
                        <p className="text-xs uppercase tracking-widest text-gray-600 mb-3">Collaborators</p>
                        <ul className="space-y-2">
                            {sharedWith.map(user => (
                                <li key={user.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-3 gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{user.name}</p>
                                        <p className="text-gray-500 text-xs truncate">{user.email}</p>
                                    </div>

                                    {/* Permission toggle */}
                                    <button
                                        onClick={() => handleTogglePermission(user)}
                                        className={`text-xs px-2.5 py-1 rounded-full border font-bold uppercase tracking-widest cursor-pointer transition-all duration-150 flex-shrink-0 ${
                                            user.permission === 'write'
                                                ? 'border-amber-600 text-amber-400 hover:bg-amber-400 hover:text-black'
                                                : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
                                        }`}
                                        title="Click to toggle permission"
                                    >
                                        {user.permission === 'write' ? 'Write' : 'Read'}
                                    </button>

                                    <button
                                        onClick={() => handleRemove(user.id)}
                                        className="text-xs text-red-500 hover:text-red-400 cursor-pointer transition-colors uppercase tracking-widest flex-shrink-0"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {sharedWith.length === 0 && (
                    <p className="text-gray-600 text-xs text-center py-4">No collaborators yet</p>
                )}
            </div>
        </Modal>
    );
}
