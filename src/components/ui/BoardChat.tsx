'use client'

import { useEffect, useRef, useState } from 'react';

interface Message {
    id: number;
    body: string;
    created_at: string;
    user: { id: number; name: string };
}

interface BoardChatProps {
    messages: Message[];
    currentUserId: number;
    onSend: (body: string) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    onClose: () => void;
}

export default function BoardChat({ messages, currentUserId, onSend, onDelete, onClose }: BoardChatProps) {
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const trimmed = body.trim();
        if (!trimmed || sending) return;
        setSending(true);
        try {
            await onSend(trimmed);
            setBody('');
            inputRef.current?.focus();
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-[95vw] max-w-md flex flex-col" style={{ maxHeight: '80vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
                <p className="text-xs uppercase tracking-widest text-gray-400">Board Chat</p>
                <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer transition-colors">✕</button>
            </div>

            {/* Messages */}
            <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4 flex-1">
                {messages.length === 0 && (
                    <p className="text-gray-600 text-xs text-center py-8">No messages yet. Say something!</p>
                )}
                {messages.map(msg => {
                    const isOwn = msg.user.id === currentUserId;
                    return (
                        <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-end gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                                <div
                                    className={`px-3 py-2 rounded-2xl text-sm leading-snug break-words whitespace-pre-wrap ${
                                        isOwn
                                            ? 'bg-amber-400 text-black rounded-br-sm'
                                            : 'bg-gray-800 text-white rounded-bl-sm'
                                    }`}
                                    style={{ maxWidth: '100%' }}
                                >
                                    {msg.body}
                                </div>
                                {isOwn && (
                                    <button
                                        onClick={() => onDelete(msg.id)}
                                        className="text-gray-700 hover:text-red-400 cursor-pointer transition-colors text-xs flex-shrink-0 pb-1"
                                        title="Delete"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <span className="text-gray-600 text-xs px-1">
                                {!isOwn && <span className="text-gray-500 font-medium">{msg.user.name} · </span>}
                                {formatTime(msg.created_at)}
                            </span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 px-4 py-3 border-t border-gray-800 flex-shrink-0">
                <textarea
                    ref={inputRef}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… (Enter to send)"
                    rows={1}
                    className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder-gray-600 resize-none"
                    style={{ minHeight: '38px', maxHeight: '120px' }}
                />
                <button
                    onClick={handleSend}
                    disabled={!body.trim() || sending}
                    className="text-xs uppercase tracking-widest font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl cursor-pointer transition-all duration-150 flex-shrink-0"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
