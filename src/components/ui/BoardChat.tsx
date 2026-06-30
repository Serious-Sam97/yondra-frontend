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
        <div className="aero-menu w-[95vw] max-w-md flex flex-col" style={{ maxHeight: '80vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--cf-edge)' }}>
                <div className="flex items-center gap-2">
                    <span className="cf-led" style={{ background: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)' }} />
                    <p className="cf-label text-xs uppercase tracking-widest" style={{ color: 'var(--cf-text-muted)' }}>Board Chat</p>
                </div>
                <button onClick={onClose} className="cursor-pointer transition-colors" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
            </div>

            {/* Messages */}
            <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4 flex-1">
                {messages.length === 0 && (
                    <p className="cf-mono text-xs text-center py-8" style={{ color: 'var(--cf-text-muted)' }}>No messages yet. Say something!</p>
                )}
                {messages.map(msg => {
                    const isOwn = msg.user.id === currentUserId;
                    return (
                        <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-end gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                                <div
                                    className={`px-3 py-2 rounded-md text-sm leading-snug break-words whitespace-pre-wrap ${
                                        isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
                                    }`}
                                    style={{
                                        maxWidth: '100%',
                                        color: 'var(--cf-text)',
                                        background: isOwn ? 'rgba(154,166,126,0.10)' : '#232220',
                                        border: isOwn ? '1px solid rgba(154,166,126,0.35)' : '1px solid var(--cf-edge)',
                                    }}
                                >
                                    {msg.body}
                                </div>
                                {isOwn && (
                                    <button
                                        onClick={() => onDelete(msg.id)}
                                        className="cursor-pointer transition-colors text-xs flex-shrink-0 pb-1 hover:text-[var(--cf-red)]"
                                        style={{ color: 'var(--cf-text-muted)' }}
                                        title="Delete"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <span className="cf-mono text-xs px-1" style={{ color: 'var(--cf-text-muted)' }}>
                                {!isOwn && <span className="font-medium" style={{ color: 'var(--cf-text)' }}>{msg.user.name} · </span>}
                                {formatTime(msg.created_at)}
                            </span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 px-4 py-3 border-t flex-shrink-0" style={{ borderColor: 'var(--cf-edge)' }}>
                <textarea
                    ref={inputRef}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… (Enter to send)"
                    rows={1}
                    className="glass-input flex-1 text-sm px-3 py-2 resize-none"
                    style={{ minHeight: '38px', maxHeight: '120px' }}
                />
                <button
                    onClick={handleSend}
                    disabled={!body.trim() || sending}
                    className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 flex-shrink-0"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
