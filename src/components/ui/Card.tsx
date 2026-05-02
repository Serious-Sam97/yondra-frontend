import { CardInterface } from "@/interfaces/CardInterface";
import { Draggable } from "../shared/Draggable";

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];

const PRIORITY_COLORS: Record<string, string> = {
    high:   '#ef4444',
    medium: '#f97316',
    low:    '#22c55e',
};

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

    return (
        <Draggable id={`draggable-${id}`}>
            <div
                style={{
                    background: cardBackground,
                    boxShadow: '3px 3px 8px rgba(0,0,0,0.35)',
                    fontFamily: 'Georgia, serif',
                    minHeight: '120px',
                    position: 'relative',
                    borderLeft: priorityColor ? `3px solid ${priorityColor}` : undefined,
                    opacity,
                }}
                className="cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-150 rounded-sm flex flex-col"
            >
                {/* Glue strip */}
                <div style={{ background: glueBackground, height: '10px' }} className="rounded-t-sm w-full flex-shrink-0" />

                {/* Body */}
                <div className="px-3 pt-2 pb-4 flex flex-col gap-1 flex-1">
                    <p style={{ color: '#1a1a1a', fontSize: '13px', lineHeight: '1.3' }} className="font-bold">
                        {name}
                    </p>

                    {description && (
                        <p style={{ color: '#555', fontSize: '11px', lineHeight: '1.4' }} className="line-clamp-3">
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

                    {/* Done stamp */}
                    {done_at && (
                        <div style={{ fontSize: '9px', color: '#16a34a', borderColor: '#16a34a55', backgroundColor: '#16a34a15' }}
                             className="px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide flex items-center gap-1 w-fit mt-1">
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
                    position: 'absolute', bottom: 0, right: 0,
                    width: 0, height: 0, borderStyle: 'solid',
                    borderWidth: '0 0 14px 14px',
                    borderColor: 'transparent transparent rgba(0,0,0,0.12) transparent',
                }} />
            </div>
        </Draggable>
    );
}
