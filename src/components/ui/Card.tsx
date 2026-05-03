'use client'

import { useRef } from "react";
import { CardInterface } from "@/interfaces/CardInterface";
import { Draggable } from "../shared/Draggable";

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];

const PRIORITY_COLORS: Record<string, string> = {
    high:   '#ef4444',
    medium: '#f97316',
    low:    '#22c55e',
};

const SPRING    = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const EASE_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

function resetCard(el: HTMLDivElement, transition = `transform 400ms ${SPRING}, box-shadow 400ms ${SPRING}`) {
    el.style.transition = transition;
    el.style.transform  = '';
    el.style.boxShadow  = '3px 3px 8px rgba(0,0,0,0.35)';
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
    let color = '#888';
    if (diff < 0) { color = '#ef4444'; label = `${label} (overdue)`; }
    else if (diff === 0) { color = '#f97316'; label = 'Today'; }
    else if (diff <= 2) { color = '#eab308'; }

    return (
        <span style={{ color, fontSize: '9px', borderColor: color + '55', backgroundColor: color + '15' }}
              className="px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide flex-shrink-0">
            {label}
        </span>
    );
}

function cardAgeOpacity(updatedAt?: string | null): number {
    if (!updatedAt) return 1;
    const days = (Date.now() - new Date(updatedAt).getTime()) / 86400000;
    if (days < 3) return 1;
    if (days < 7) return 0.82;
    if (days < 14) return 0.65;
    return 0.48;
}

function blendWithCream(hex: string, amount = 0.18): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.round(254 + (r - 254) * amount);
    const ng = Math.round(249 + (g - 249) * amount);
    const nb = Math.round(195 + (b - 195) * amount);
    return `rgb(${nr},${ng},${nb})`;
}

export function Card({ id, name, description, assigned_user, created_by, tags, due_date, priority, checklist_items, updated_at, done_at }: CardInterface & { color: string }) {
    const cardRef = useRef<HTMLDivElement>(null);

    const showBottom = assigned_user || created_by;
    const priorityColor = priority ? PRIORITY_COLORS[priority] : null;
    const doneItems = (checklist_items ?? []).filter(i => i.is_done).length;
    const totalItems = (checklist_items ?? []).length;
    const primaryTagColor = tags?.[0]?.color ?? null;
    const opacity = cardAgeOpacity(updated_at);

    const cardBackground = primaryTagColor
        ? blendWithCream(primaryTagColor)
        : 'linear-gradient(to bottom, #f5e642 0%, #fef08a 5%, #fef9c3 5%)';
    const glueBackground = primaryTagColor
        ? primaryTagColor
        : 'linear-gradient(to bottom, #e6d800, #f5e642)';

    // ── 3-D tilt: card leans toward the cursor like paper being examined ──────
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;   // -0.5 … 0.5
        const y = (e.clientY - rect.top)  / rect.height - 0.5;

        // Directional shadow — light source stays top-left of screen
        const shadowX = (-x * 10 + 3);
        const shadowY = (-y * 10 + 5);

        el.style.transition = `box-shadow 80ms ease-out`;
        el.style.transform  = `perspective(600px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-4px) scale(1.01)`;
        el.style.boxShadow  = `${shadowX}px ${shadowY}px 22px rgba(0,0,0,0.45), ${shadowX * 0.4}px ${shadowY * 0.4}px 8px rgba(0,0,0,0.25)`;
        el.style.zIndex     = '10';
    };

    const handleMouseLeave = () => {
        const el = cardRef.current;
        if (!el) return;
        resetCard(el);
    };

    // ── Press depth: card dents into the surface on click ────────────────────
    const handlePointerDown = () => {
        const el = cardRef.current;
        if (!el) return;
        el.style.transition = `transform 60ms ease-out, box-shadow 60ms ease-out`;
        el.style.transform  = `perspective(600px) translateY(2px) scale(0.985)`;
        el.style.boxShadow  = `1px 1px 4px rgba(0,0,0,0.28)`;
    };

    const handlePointerUp = () => {
        const el = cardRef.current;
        if (!el) return;
        // Spring bounce back with a slight overshoot — like paper springing off a surface
        el.style.transition = `transform 350ms ${SPRING}, box-shadow 350ms ${EASE_EXPO}`;
        el.style.transform  = `perspective(600px) translateY(-4px) scale(1.01)`;
        el.style.boxShadow  = `3px 6px 18px rgba(0,0,0,0.42), 1px 2px 6px rgba(0,0,0,0.22)`;
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
                    background: cardBackground,
                    boxShadow: '3px 3px 8px rgba(0,0,0,0.35)',
                    fontFamily: 'Georgia, serif',
                    minHeight: '120px',
                    position: 'relative',
                    borderLeft: priorityColor ? `3px solid ${priorityColor}` : undefined,
                    opacity,
                    willChange: 'transform',
                }}
                className="sticky-note cursor-pointer rounded-sm flex flex-col"
            >
                {/* Glue strip */}
                <div style={{ background: glueBackground, height: '10px' }} className="rounded-t-sm w-full flex-shrink-0" />

                {/* Body — sits above the ::after grain layer via relative positioning */}
                <div className="px-3 pt-2 pb-4 flex flex-col gap-1 flex-1" style={{ position: 'relative', zIndex: 2 }}>
                    <p style={{ color: '#1a1a1a', fontSize: '13px', lineHeight: '1.3' }} className="font-bold ink-text">
                        {name}
                    </p>

                    {description && (
                        <p style={{ color: '#555', fontSize: '11px', lineHeight: '1.4' }} className="line-clamp-3 ink-text">
                            {description}
                        </p>
                    )}

                    {/* Tags */}
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {tags.map(tag => (
                                <span
                                    key={tag.id}
                                    style={{ backgroundColor: tag.color + '33', color: tag.color, borderColor: tag.color + '66', fontSize: '9px' }}
                                    className="px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-wide"
                                >
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Done stamp — plays the slam animation on every render where done_at is set */}
                    {done_at && (
                        <div
                            key={done_at}
                            style={{ fontSize: '9px', color: '#16a34a', borderColor: '#16a34a55', backgroundColor: '#16a34a15', display: 'inline-flex', width: 'fit-content' }}
                            className="stamp-in px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide items-center gap-1 mt-1"
                        >
                            ✓ Done · {new Date(done_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(done_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}

                    {/* Due date + checklist progress */}
                    {(due_date || totalItems > 0) && (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {due_date && <DueDateBadge dueDate={due_date} />}
                            {totalItems > 0 && (
                                <span style={{ fontSize: '9px', color: doneItems === totalItems ? '#22c55e' : '#888', borderColor: (doneItems === totalItems ? '#22c55e' : '#888') + '55', backgroundColor: (doneItems === totalItems ? '#22c55e' : '#888') + '15' }}
                                      className="px-1.5 py-0.5 rounded border font-bold flex-shrink-0">
                                    ✓ {doneItems}/{totalItems}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Bottom row: creator left, assignee right */}
                    {showBottom && (
                        <div className="mt-auto pt-1 flex items-center justify-between">
                            {created_by ? (
                                <div className="flex items-center gap-1" title={`Created by ${created_by.name}`}>
                                    <Avatar user={created_by} />
                                    <span style={{ color: '#666', fontSize: '10px' }} className="truncate">
                                        {created_by.name.split(' ')[0]}
                                    </span>
                                </div>
                            ) : <div />}

                            {assigned_user && (
                                <div title={`Assigned to ${assigned_user.name}`} style={{ marginRight: '16px' }}>
                                    <Avatar user={assigned_user} size={16} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Dog-ear */}
                <div style={{
                    position: 'absolute', bottom: 0, right: 0, zIndex: 3,
                    width: 0, height: 0, borderStyle: 'solid',
                    borderWidth: '0 0 14px 14px',
                    borderColor: 'transparent transparent rgba(0,0,0,0.12) transparent',
                }} />
            </div>
        </Draggable>
    );
}
