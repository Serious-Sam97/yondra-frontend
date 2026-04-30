'use client'

import Modal from "@/components/shared/Modal";
import { SharedUser } from "@/interfaces/BoardInterface";
import { shareBoard, unshareBoard } from "@/lib/api";
import { useState } from "react";

interface ShareModalProps {
    boardId: number;
    sharedWith: SharedUser[];
    onClose: () => void;
    onUpdate: (users: SharedUser[]) => void;
}

export default function ShareModal({ boardId, sharedWith, onClose, onUpdate }: ShareModalProps) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await shareBoard(boardId, email);
            onUpdate([...sharedWith, res.user]);
            setEmail('');
        } catch (err: any) {
            setError(err.message ?? 'Failed to share board.');
        } finally {
            setLoading(false);
        }
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

                <form onSubmit={handleShare} className="flex gap-2 mb-5">
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
                </form>

                {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

                {sharedWith.length > 0 && (
                    <div>
                        <p className="text-xs uppercase tracking-widest text-gray-600 mb-3">Collaborators</p>
                        <ul className="space-y-2">
                            {sharedWith.map(user => (
                                <li key={user.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                                    <div>
                                        <p className="text-white text-sm font-medium">{user.name}</p>
                                        <p className="text-gray-500 text-xs">{user.email}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(user.id)}
                                        className="text-xs text-red-500 hover:text-red-400 cursor-pointer transition-colors uppercase tracking-widest"
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
