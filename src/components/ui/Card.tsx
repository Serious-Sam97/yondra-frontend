'use client'

import { useRef } from "react";
import { CardInterface } from "@/interfaces/CardInterface";
import { Draggable } from "../shared/Draggable";

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];

// Cassette-futurism status-LED colors keyed to priority
const PRIORITY_COLORS: Record<string, string> = {
    high:   'var(--cf-red)',
    medium: 'var(--cf-amber)',
    low:    'var(--cf-phosphor)',
};

// Ink colors for the cream readout tiles
const INK       = 'var(--cf-ink)';
const INK_MUTED = '#6a6453';

// Recessed chip the colored LED sits in
const CHIP_BG = '#1c1a16';

const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const REST_SHADOW = 'inset 0 1px 0 rgba(255,255,255,0.7), 0 6px 16px rgba(0,0,0,0.4)';

function resetCard(el: HTMLDivElement, transition = `transform 400ms ${SPRING}, box-shadow 400ms ${SPRING}`) {
    el.style.transition = transition;
    el.style.transform  = '';
    el.style.boxShadow  = '';
    el.style.zIndex     = '';
}

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ user, size = 18 }: { user: { id: number; name: string }; size?: number }) {
    return (
        <div
            style={{
                backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length],
                fontSize: size * 0.5,
                width: size,
                height: size,
                border: '1.5px solid rgba(255,255,255,0.85)',
            }}
            className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            title={user.name}
        >
            {initials(user.name)}
        </div>
    );
}

function DueDateBadge({ dueDate }: { dueDate: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);

    let label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let led = 'var(--cf-cyan)';
    if (diff < 0) { led = 'var(--cf-red)'; label = `${label} OVERDUE`; }
    else if (diff === 0) { led = 'var(--cf-amber)'; label = 'TODAY'; }
    else if (diff <= 2) { led = 'var(--cf-amber)'; }
    else { led = 'var(--cf-cyan)'; }

    return (
        <span style={{ backgroundColor: CHIP_BG, fontSize: '9px', letterSpacing: '0.08em' }}
              className="cf-mono inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm uppercase flex-shrink-0">
            <span className="cf-led flex-shrink-0" style={{ background: led, boxShadow: `0 0 5px ${led}`, width: 5, height: 5 }} />
            <span style={{ color: 'var(--cf-text)' }}>{label}</span>
        </span>
    );
}

export function Card({ id, name, description, assigned_user, created_by, tags, due_date, priority, checklist_items, updated_at, done_at }: CardInterface & { color: string }) {
    const cardRef = useRef<HTMLDivElement>(null);

    const showBottom = assigned_user || created_by;
    const priorityColor = priority ? PRIORITY_COLORS[priority] : null;

    // Subtle tag identity: wash the first tag's hue into the cream face — a touch
    // stronger at the top, fading down — so the card quietly carries its tag color
    // without fighting the cold palette. Border picks up a faint matching tint.
    const tagColor = tags && tags.length > 0 ? tags[0].color : null;
    const tagTint = tagColor
        ? {
              background: `linear-gradient(to bottom, color-mix(in srgb, ${tagColor} 34%, #e6e0cb), color-mix(in srgb, ${tagColor} 18%, #d4cdb6))`,
              borderColor: `color-mix(in srgb, ${tagColor} 55%, #b9b39d)`,
          }
        : null;
    const doneItems = (checklist_items ?? []).filter(i => i.is_done).length;
    const totalItems = (checklist_items ?? []).length;

    // ── Subtle cursor-follow tilt: card leans toward the cursor, clean light shadow ──
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;   // -0.5 … 0.5
        const y = (e.clientY - rect.top)  / rect.height - 0.5;

        const shadowX = (-x * 8 + 2);
        const shadowY = (-y * 8 + 6);

        el.style.transition = `box-shadow 80ms ease-out`;
        el.style.transform  = `perspective(600px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-3px) scale(1.01)`;
        el.style.boxShadow  = `inset 0 1px 0 rgba(255,255,255,0.7), ${shadowX}px ${shadowY}px 20px rgba(0,0,0,0.45)`;
        el.style.zIndex     = '10';
    };

    const handleMouseLeave = () => {
        const el = cardRef.current;
        if (!el) return;
        resetCard(el);
    };

    // ── Press depth: card dents slightly on click ────────────────────────────
    const handlePointerDown = () => {
        const el = cardRef.current;
        if (!el) return;
        el.style.transition = `transform 60ms ease-out, box-shadow 60ms ease-out`;
        el.style.transform  = `perspective(600px) translateY(1px) scale(0.99)`;
        el.style.boxShadow  = `inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.4)`;
    };

    const handlePointerUp = () => {
        const el = cardRef.current;
        if (!el) return;
        el.style.transition = `transform 350ms ${SPRING}, box-shadow 350ms ${SPRING}`;
        el.style.transform  = `perspective(600px) translateY(-3px) scale(1.01)`;
        el.style.boxShadow  = REST_SHADOW;
    };

    // Fires when dnd-kit captures the pointer — resets pressed state cleanly
    const handlePointerCancel = () => {
        const el = cardRef.current;
        if (!el) return;
        resetCard(el, 'none');
    };

    const handlePointerLeave = () => {
        const el = cardRef.current;
        if (!el) return;
        resetCard(el);
    };

    return (
        <Draggable id={`draggable-${id}`}>
            <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onPointerLeave={handlePointerLeave}
                style={{
                    minHeight: '120px',
                    position: 'relative',
                    willChange: 'transform',
                    ...tagTint,
                    borderLeft: priorityColor ? `3px solid ${priorityColor}` : undefined,
                }}
                className="glass-card cursor-pointer flex flex-col overflow-hidden"
            >
                {/* Body */}
                <div className="px-3 pt-3 pb-3 flex flex-col gap-1.5 flex-1">
                    {/* Tags as LED chips: dark chip + colored LED + mono label */}
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {tags.map(tag => (
                                <span
                                    key={tag.id}
                                    style={{ backgroundColor: CHIP_BG, fontSize: '9px', letterSpacing: '0.08em' }}
                                    className="cf-mono inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm uppercase"
                                >
                                    <span className="cf-led flex-shrink-0" style={{ background: tag.color, boxShadow: `0 0 5px ${tag.color}`, width: 5, height: 5 }} />
                                    <span style={{ color: 'var(--cf-text)' }}>{tag.name}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    <p style={{ color: INK, fontSize: '13px', lineHeight: '1.3' }} className="font-bold">
                        {name}
                    </p>

                    {description && (
                        <p style={{ color: INK_MUTED, fontSize: '11px', lineHeight: '1.4' }} className="line-clamp-3">
                            {description}
                        </p>
                    )}

                    {/* Priority LED chip: low=green, medium=amber, high=red */}
                    {priorityColor && (
                        <span
                            style={{ backgroundColor: CHIP_BG, fontSize: '9px', letterSpacing: '0.08em', width: 'fit-content' }}
                            className="cf-mono inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm uppercase"
                        >
                            <span className="cf-led flex-shrink-0" style={{ background: priorityColor, boxShadow: `0 0 5px ${priorityColor}`, width: 5, height: 5 }} />
                            <span style={{ color: 'var(--cf-text)' }}>{priority}</span>
                        </span>
                    )}

                    {/* Done stamp — plays the slam animation on every render where done_at is set */}
                    {done_at && (
                        <div
                            key={done_at}
                            style={{ fontSize: '9px', backgroundColor: CHIP_BG, letterSpacing: '0.08em', display: 'inline-flex', width: 'fit-content' }}
                            className="stamp-in cf-mono px-1.5 py-0.5 rounded-sm uppercase items-center gap-1"
                        >
                            <span className="cf-led flex-shrink-0" style={{ background: 'var(--cf-phosphor)', boxShadow: '0 0 5px var(--cf-phosphor)', width: 5, height: 5 }} />
                            <span style={{ color: 'var(--cf-text)' }}>DONE · {new Date(done_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(done_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}

                    {/* Due date + checklist progress */}
                    {(due_date || totalItems > 0) && (
                        <div className="flex flex-col gap-1.5 mt-0.5">
                            {due_date && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <DueDateBadge dueDate={due_date} />
                                </div>
                            )}
                            {totalItems > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-sm overflow-hidden" style={{ background: '#0d1410', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)' }}>
                                        <div
                                            className="h-full"
                                            style={{
                                                width: `${(doneItems / totalItems) * 100}%`,
                                                background: '#9aa67e',
                                                boxShadow: '0 0 6px #9aa67e',
                                                transition: 'width 300ms cubic-bezier(0.16,1,0.3,1)',
                                            }}
                                        />
                                    </div>
                                    <span style={{ fontSize: '9px', color: INK_MUTED }} className="cf-mono flex-shrink-0 tabular-nums">
                                        {doneItems}/{totalItems}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bottom row: creator left, assignee right */}
                    {showBottom && (
                        <div className="mt-auto pt-1 flex items-center justify-between">
                            {created_by ? (
                                <div className="flex items-center gap-1" title={`Created by ${created_by.name}`}>
                                    <Avatar user={created_by} />
                                    <span style={{ color: INK_MUTED, fontSize: '10px' }} className="cf-mono truncate">
                                        {created_by.name.split(' ')[0]}
                                    </span>
                                </div>
                            ) : <div />}

                            {assigned_user && (
                                <div title={`Assigned to ${assigned_user.name}`}>
                                    <Avatar user={assigned_user} size={16} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Draggable>
    );
}
