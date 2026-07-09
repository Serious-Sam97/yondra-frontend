'use client'

import { useState } from 'react'
import {
    DndContext, DragOverlay, PointerSensor, TouchSensor, closestCorners,
    useSensor, useSensors, useDraggable, useDroppable,
    type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import Icon from '@/components/ui/Icon'
import { faPlay, faTrash, faLayerGroup, faBolt, faChartLine, faFlagCheckered, faGripVertical, faCalendarDays, faPen } from '@fortawesome/free-solid-svg-icons'
import type { SprintInterface } from '@/interfaces/SprintInterface'
import type { CardInterface } from '@/interfaces/CardInterface'
import { toNumber } from '@/lib/currency'

const PRIORITY_COLOR: Record<string, string> = { high: '#ff5a4d', medium: '#ffb000', low: '#9aa67e' }
const AVATAR_COLORS = ['#9aa67e', '#ffb000', '#6fe0ff', '#ff5a4d', '#c08bff', '#ffd24a', '#6fe0ff', '#ff8fa3']

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ user }: { user: { id: number; name: string } }) {
    return (
        <div className="cf-mono rounded-full flex items-center justify-center font-bold flex-shrink-0"
            style={{ width: 24, height: 24, fontSize: 11, backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length], color: 'var(--cf-ink)', border: '1px solid var(--cf-edge)' }}
            title={`Assigned to ${user.name}`}>
            {initials(user.name)}
        </div>
    )
}

// Drop-zone id ⇄ sprint id. Backlog is the null sprint.
const groupIdFor = (sprintId: number | null) => sprintId === null ? 'backlog' : `sprint-${sprintId}`
const sprintIdFromGroup = (groupId: string): number | null => groupId === 'backlog' ? null : Number(groupId.replace('sprint-', ''))

// A single planning row: grip handle (drag), priority LED, name, points, move dropdown.
function TicketRow({ card, targets, onAssign, onClick, canManage }: {
    card: CardInterface;
    targets: { id: number | null; label: string }[];
    onAssign: (cardId: number, sprintId: number | null) => void;
    onClick: (card: CardInterface) => void;
    canManage: boolean;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `ticket-${card.id}`,
        data: { card },
        disabled: !canManage,
    })

    return (
        <div ref={setNodeRef} className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors"
            style={{ borderTop: '1px solid var(--cf-edge)', opacity: isDragging ? 0.4 : 1 }}>
            {canManage && (
                <button {...attributes} {...listeners} tabIndex={-1} aria-label="Drag ticket"
                    className="cursor-grab active:cursor-grabbing flex-shrink-0 -ml-1 px-0.5 hover:opacity-100"
                    style={{ touchAction: 'none', color: 'var(--cf-text-muted)', opacity: 0.5, fontSize: '13px' }}>
                    <Icon icon={faGripVertical} />
                </button>
            )}
            {/* Priority LED (color = priority; grey = none) */}
            <span className="cf-led rounded-full flex-shrink-0" style={{ width: 9, height: 9,
                background: card.priority ? PRIORITY_COLOR[card.priority] : 'var(--cf-edge)', boxShadow: card.priority ? `0 0 6px ${PRIORITY_COLOR[card.priority]}` : 'none' }}
                title={card.priority ? `${card.priority} priority` : 'no priority'} />
            <button onClick={() => onClick(card)} className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer">
                {card.ticket_key && <span className="cf-mono font-bold flex-shrink-0" style={{ fontSize: '12px', color: 'var(--cf-text-muted)' }}>{card.ticket_key}</span>}
                <span className="cf-mono truncate" style={{ fontSize: '14px', color: 'var(--cf-text)' }}>{card.name}</span>
            </button>

            {/* Tags — up to 2 chips + overflow count */}
            {(card.tags ?? []).length > 0 && (
                <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                    {(card.tags ?? []).slice(0, 2).map(tag => (
                        <span key={tag.id} className="aero-pill cf-mono uppercase tracking-wide px-1.5 py-0.5 font-bold whitespace-nowrap"
                            style={{ fontSize: '10px', color: tag.color, borderColor: tag.color + '88', boxShadow: `0 0 6px ${tag.color}44` }}>
                            {tag.name}
                        </span>
                    ))}
                    {(card.tags ?? []).length > 2 && (
                        <span className="cf-mono" style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }}>+{(card.tags ?? []).length - 2}</span>
                    )}
                </div>
            )}

            {/* Priority label (compact) */}
            {card.priority && (
                <span className="cf-mono uppercase tracking-widest font-bold flex-shrink-0 hidden lg:inline" style={{ fontSize: '10px', color: PRIORITY_COLOR[card.priority] }}>
                    {card.priority}
                </span>
            )}

            {card.story_points != null && (
                <span className="cf-mono tabular-nums flex-shrink-0 font-bold" style={{ fontSize: '12px', color: 'var(--cf-cyan)' }}>{toNumber(card.story_points)} pts</span>
            )}

            {/* Assignee */}
            {card.assigned_user ? <Avatar user={card.assigned_user} /> : <div className="rounded-full flex-shrink-0" style={{ width: 24, height: 24, border: '1px dashed var(--cf-edge)' }} title="Unassigned" />}
            {canManage && (
                <select
                    value={String(card.sprint_id ?? '')}
                    onChange={e => onAssign(Number(card.id), e.target.value === '' ? null : Number(e.target.value))}
                    onClick={e => e.stopPropagation()}
                    className="glass-input cf-mono flex-shrink-0 cursor-pointer"
                    style={{ fontSize: '13px', padding: '4px 6px', width: 150, maxWidth: 150 }}
                    title="Move to sprint"
                >
                    {targets.map(t => <option key={String(t.id)} value={String(t.id ?? '')} className="text-black">{t.label}</option>)}
                </select>
            )}
        </div>
    )
}

// One droppable group (a future/active sprint, or the product backlog).
function Group({ sprintId, title, subtitle, led, cards, targets, onAssign, onCardClick, canManage, headerActions, quickCreate, subheader }: {
    sprintId: number | null;
    title: React.ReactNode;
    subtitle?: string;
    led: string;
    cards: CardInterface[];
    targets: { id: number | null; label: string }[];
    onAssign: (cardId: number, sprintId: number | null) => void;
    onCardClick: (card: CardInterface) => void;
    canManage: boolean;
    headerActions?: React.ReactNode;
    quickCreate?: (name: string) => void;
    subheader?: React.ReactNode;
}) {
    const [open, setOpen] = useState(true)
    const [draft, setDraft] = useState('')
    const points = cards.reduce((s, c) => s + toNumber(c.story_points), 0)
    const { setNodeRef, isOver } = useDroppable({ id: groupIdFor(sprintId) })

    const submit = () => { const n = draft.trim(); if (!n) return; quickCreate?.(n); setDraft('') }

    return (
        <div className="glass-panel rounded-xl overflow-hidden mb-3"
            style={isOver ? { boxShadow: '0 0 0 2px var(--cf-phosphor)', transition: 'box-shadow 120ms' } : undefined}>
            <div className="flex items-center gap-2 px-3 py-2.5">
                <button onClick={() => setOpen(o => !o)} className="cf-mono flex items-center gap-2 cursor-pointer flex-1 min-w-0 text-left">
                    <span className="cf-led flex-shrink-0" style={{ background: led, boxShadow: `0 0 6px ${led}`, width: 6, height: 6 }} />
                    <span className="uppercase tracking-widest font-bold truncate" style={{ fontSize: '13px', color: 'var(--cf-text)' }}>{title}</span>
                    <span style={{ fontSize: '11px', color: 'var(--cf-text-muted)' }}>{cards.length} · {points} pts</span>
                    {subtitle && <span className="cf-mono truncate hidden md:inline" style={{ fontSize: '11px', color: 'var(--cf-text-muted)' }}>{subtitle}</span>}
                </button>
                {headerActions}
            </div>
            {subheader}

            {/* Droppable body — dropping anywhere here reassigns the ticket to this group */}
            <div ref={setNodeRef}>
                {open && (
                    <div>
                        {cards.length === 0 && (
                            <p className="cf-mono text-center py-4" style={{ fontSize: '10px', color: isOver ? 'var(--cf-phosphor)' : 'var(--cf-text-muted)', borderTop: '1px solid var(--cf-edge)' }}>
                                {isOver ? 'Drop here' : 'Empty'}
                            </p>
                        )}
                        {cards.map(c => (
                            <TicketRow key={c.id} card={c} targets={targets} onAssign={onAssign} onClick={onCardClick} canManage={canManage} />
                        ))}
                        {canManage && quickCreate && (
                            <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderTop: '1px solid var(--cf-edge)' }}>
                                <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit() }}
                                    placeholder="+ Add ticket…" className="glass-input cf-lcd" style={{ fontSize: '14px', width: '100%', maxWidth: 360, padding: '6px 10px' }} />
                                <button onClick={submit} disabled={!draft.trim()}
                                    className="aero-btn aero-btn--cyan text-[11px] uppercase tracking-widest font-bold px-3 py-1.5 cursor-pointer disabled:opacity-40">Add</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// --- Date helpers (local 'YYYY-MM-DD' strings) ---
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function todayStr() { return ymd(new Date()) }
function addDays(dateStr: string, n: number) { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d) }
function diffDays(a: string, b: string) { return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000) }
function daysUntil(end: string) { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(end + 'T00:00:00').getTime() - t.getTime()) / 86400000) }
function fmtDate(d?: string | null) { return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' }

const DURATIONS = [{ label: '1 week', weeks: 1 }, { label: '2 weeks', weeks: 2 }, { label: '3 weeks', weeks: 3 }, { label: '4 weeks', weeks: 4 }]

// A sprint's schedule line: date range + duration/days-left, with inline editing.
function SprintDates({ sprint, canManage, onUpdate }: {
    sprint: SprintInterface;
    canManage: boolean;
    onUpdate?: (dates: { start_date: string; end_date: string }) => void;
}) {
    const [editing, setEditing] = useState(false)
    const [start, setStart] = useState(sprint.start_date ?? todayStr())
    const [end, setEnd] = useState(sprint.end_date ?? addDays(sprint.start_date ?? todayStr(), 14))
    const dur = sprint.start_date && sprint.end_date ? diffDays(sprint.start_date, sprint.end_date) : null
    const left = sprint.status === 'active' && sprint.end_date ? daysUntil(sprint.end_date) : null

    if (editing && canManage && onUpdate) {
        return (
            <div className="flex items-center gap-2 flex-wrap px-3 pb-3" style={{ marginTop: -2 }}>
                <input type="date" value={start} onChange={e => { const v = e.target.value; setStart(v); if (dur != null && diffDays(v, end) < 0) setEnd(addDays(v, dur)) }} className="glass-input cf-lcd" style={{ fontSize: '13px', padding: '4px 6px' }} />
                <span style={{ color: 'var(--cf-text-muted)', fontSize: '12px' }}>→</span>
                <input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} className="glass-input cf-lcd" style={{ fontSize: '13px', padding: '4px 6px' }} />
                <button onClick={() => { onUpdate({ start_date: start, end_date: end }); setEditing(false) }}
                    className="aero-btn aero-btn--cyan text-[11px] uppercase tracking-widest font-bold px-3 py-1.5 cursor-pointer">Save</button>
                <button onClick={() => { setStart(sprint.start_date ?? todayStr()); setEnd(sprint.end_date ?? todayStr()); setEditing(false) }}
                    className="aero-btn aero-btn--ghost text-[11px] uppercase tracking-widest px-3 py-1.5 cursor-pointer">Cancel</button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2.5 px-3 pb-3 flex-wrap" style={{ marginTop: -2 }}>
            <span className="cf-mono inline-flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--cf-text-muted)' }}>
                <Icon icon={faCalendarDays} style={{ fontSize: 12 }} /> {fmtDate(sprint.start_date)} – {fmtDate(sprint.end_date)}
                {dur != null && <span>· {dur}d</span>}
            </span>
            {left != null && (
                <span className="cf-mono font-bold" style={{ fontSize: '12px', color: left < 0 ? 'var(--cf-red)' : left <= 2 ? 'var(--cf-amber)' : 'var(--cf-phosphor)' }}>
                    {left < 0 ? `${Math.abs(left)}d overdue` : left === 0 ? 'due today' : `${left}d left`}
                </span>
            )}
            {canManage && onUpdate && (
                <button onClick={() => setEditing(true)} title="Edit dates" className="btn-physical cursor-pointer" style={{ color: 'var(--cf-text-muted)', fontSize: '12px' }}>
                    <Icon icon={faPen} />
                </button>
            )}
        </div>
    )
}

// New-sprint form: name + start (defaulted) + a duration select that fills the end date.
function CreateSprintForm({ suggestedStart, onCreate }: {
    suggestedStart: string;
    onCreate: (data: { name: string; start_date: string; end_date: string }) => void;
}) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [start, setStart] = useState(suggestedStart)
    const [weeks, setWeeks] = useState<number | null>(2)
    const [end, setEnd] = useState(addDays(suggestedStart, 14))

    const reset = () => { setName(''); setStart(suggestedStart); setWeeks(2); setEnd(addDays(suggestedStart, 14)) }
    const changeStart = (s: string) => { setStart(s); if (weeks) setEnd(addDays(s, weeks * 7)) }
    const changeWeeks = (w: number | null) => { setWeeks(w); if (w) setEnd(addDays(start, w * 7)) }
    const submit = () => { const n = name.trim(); if (!n) return; onCreate({ name: n, start_date: start, end_date: end }); reset(); setOpen(false) }

    if (!open) {
        return (
            <button onClick={() => { reset(); setOpen(true) }}
                className="aero-btn aero-btn--ghost text-[10px] uppercase tracking-widest font-bold px-3 py-2 mb-4 self-start cursor-pointer inline-flex items-center gap-1.5">
                <Icon icon={faBolt} style={{ fontSize: '9px' }} /> New sprint
            </button>
        )
    }

    const label = { fontSize: '10px', color: 'var(--cf-text-muted)' }
    return (
        <div className="glass-panel rounded-xl p-4 mb-4 flex flex-col gap-3">
            <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit() }}
                placeholder="Sprint name…" className="glass-input cf-lcd text-sm" style={{ maxWidth: 340, padding: '6px 10px' }} />
            <div className="flex gap-3 flex-wrap items-end">
                <div className="flex flex-col gap-1.5">
                    <label className="cf-mono uppercase tracking-widest" style={label}>Start</label>
                    <input type="date" value={start} onChange={e => changeStart(e.target.value)} className="glass-input cf-lcd" style={{ fontSize: '14px', padding: '6px 8px' }} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="cf-mono uppercase tracking-widest" style={label}>Duration</label>
                    <select value={weeks ?? ''} onChange={e => changeWeeks(e.target.value === '' ? null : Number(e.target.value))}
                        className="glass-input cf-lcd cursor-pointer" style={{ fontSize: '14px', padding: '6px 8px' }}>
                        {DURATIONS.map(d => <option key={d.weeks} value={d.weeks} className="text-black">{d.label}</option>)}
                        <option value="" className="text-black">Custom</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="cf-mono uppercase tracking-widest" style={label}>End</label>
                    <input type="date" value={end} min={start} onChange={e => { setEnd(e.target.value); setWeeks(null) }} className="glass-input cf-lcd" style={{ fontSize: '14px', padding: '6px 8px' }} />
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={submit} disabled={!name.trim()}
                    className="aero-btn aero-btn--cyan text-[11px] uppercase tracking-widest font-bold px-4 py-2 cursor-pointer disabled:opacity-40">Create sprint</button>
                <button onClick={() => setOpen(false)} className="aero-btn aero-btn--ghost text-[11px] uppercase tracking-widest px-4 py-2 cursor-pointer">Cancel</button>
            </div>
        </div>
    )
}

// Jira-style sprint-planning backlog: future sprints (with Start) + product backlog +
// completed sprints. Drag a ticket between groups to (re)assign its sprint.
export function SprintBacklog({
    sprints, cards, canManage,
    onAssignSprint, onCreateSprint, onStartSprint, onDeleteSprint, onUpdateSprintDates, onQuickCreate, onCardClick, onOpenReport,
}: {
    sprints: SprintInterface[];
    cards: CardInterface[];
    canManage: boolean;
    onAssignSprint: (cardId: number, sprintId: number | null) => void;
    onCreateSprint: (data: { name: string; start_date: string; end_date: string }) => void;
    onStartSprint: (id: number) => void;
    onDeleteSprint: (id: number) => void;
    onUpdateSprintDates: (id: number, dates: { start_date: string; end_date: string }) => void;
    onQuickCreate: (name: string, sprintId: number | null) => void;
    onCardClick: (card: CardInterface) => void;
    onOpenReport: (sprint: SprintInterface) => void;
}) {
    const [dragCard, setDragCard] = useState<CardInterface | null>(null)
    const activeSprint = sprints.find(s => s.status === 'active') ?? null
    const futureSprints = sprints.filter(s => s.status === 'future')
    const completedSprints = sprints.filter(s => s.status === 'completed')

    // Suggest the next sprint to start the day after the latest one ends (else today).
    const lastEnd = sprints.map(s => s.end_date).filter(Boolean).sort().pop() as string | undefined
    const suggestedStart = lastEnd ? addDays(lastEnd, 1) : todayStr()

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    )

    const handleDragStart = (e: DragStartEvent) => setDragCard(e.active.data.current?.card ?? null)
    const handleDragEnd = (e: DragEndEvent) => {
        setDragCard(null)
        const card = e.active.data.current?.card as CardInterface | undefined
        if (!card || !e.over) return
        const target = sprintIdFromGroup(String(e.over.id))
        if ((card.sprint_id ?? null) !== target) onAssignSprint(Number(card.id), target)
    }

    // Move-to-sprint dropdown options: Backlog + active + all future sprints.
    const targets: { id: number | null; label: string }[] = [
        { id: null, label: 'Backlog' },
        ...(activeSprint ? [{ id: activeSprint.id, label: `${activeSprint.name} (active)` }] : []),
        ...futureSprints.map(s => ({ id: s.id, label: s.name })),
    ]

    return (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDragCard(null)}>
            <div className="flex flex-col pb-8 w-full mx-auto" style={{ maxWidth: 900 }}>
                {/* Active sprint (managed on the Board; still a drop target for planning) */}
                {activeSprint && (
                    <Group
                        sprintId={activeSprint.id}
                        title={activeSprint.name}
                        subtitle="active"
                        led="var(--cf-phosphor)"
                        cards={cards.filter(c => c.sprint_id === activeSprint.id)}
                        targets={targets}
                        onAssign={onAssignSprint}
                        onCardClick={onCardClick}
                        canManage={canManage}
                        subheader={<SprintDates sprint={activeSprint} canManage={canManage} onUpdate={canManage ? (dates) => onUpdateSprintDates(activeSprint.id, dates) : undefined} />}
                        headerActions={
                            <button onClick={() => onOpenReport(activeSprint)} title="Sprint report"
                                className="btn-physical px-1.5 cursor-pointer" style={{ color: 'var(--cf-text-muted)', fontSize: '11px' }}>
                                <Icon icon={faChartLine} />
                            </button>
                        }
                    />
                )}

                {/* Future sprints */}
                {futureSprints.map(s => (
                    <Group
                        key={s.id}
                        sprintId={s.id}
                        title={s.name}
                        led="var(--cf-cyan)"
                        cards={cards.filter(c => c.sprint_id === s.id)}
                        targets={targets}
                        onAssign={onAssignSprint}
                        onCardClick={onCardClick}
                        canManage={canManage}
                        subheader={<SprintDates sprint={s} canManage={canManage} onUpdate={canManage ? (dates) => onUpdateSprintDates(s.id, dates) : undefined} />}
                        quickCreate={canManage ? (name) => onQuickCreate(name, s.id) : undefined}
                        headerActions={canManage && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => onStartSprint(s.id)}
                                    disabled={!!activeSprint}
                                    title={activeSprint ? 'Complete the active sprint first' : 'Start sprint'}
                                    className="aero-btn aero-btn--cyan text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 cursor-pointer inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <Icon icon={faPlay} style={{ fontSize: '8px' }} /> Start
                                </button>
                                <button onClick={() => onDeleteSprint(s.id)} title="Delete sprint"
                                    className="btn-physical px-1.5 cursor-pointer" style={{ color: 'var(--cf-text-muted)', fontSize: '10px' }}>
                                    <Icon icon={faTrash} />
                                </button>
                            </div>
                        )}
                    />
                ))}

                {/* Create a sprint (dates + duration) */}
                {canManage && <CreateSprintForm suggestedStart={suggestedStart} onCreate={onCreateSprint} />}

                {/* Product backlog */}
                <Group
                    sprintId={null}
                    title="Backlog"
                    led="var(--cf-text-muted)"
                    cards={cards.filter(c => (c.sprint_id ?? null) === null)}
                    targets={targets}
                    onAssign={onAssignSprint}
                    onCardClick={onCardClick}
                    canManage={canManage}
                    quickCreate={canManage ? (name) => onQuickCreate(name, null) : undefined}
                    headerActions={<Icon icon={faLayerGroup} style={{ color: 'var(--cf-text-muted)', fontSize: '10px' }} />}
                />

                {/* Completed sprints — view report */}
                {completedSprints.length > 0 && (
                    <div className="mt-2">
                        <p className="cf-mono uppercase tracking-widest font-bold mb-2" style={{ fontSize: '11px', color: 'var(--cf-text-muted)' }}>Completed</p>
                        <div className="flex flex-col gap-1.5">
                            {completedSprints.map(s => (
                                <button key={s.id} onClick={() => onOpenReport(s)}
                                    className="glass-panel flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer text-left">
                                    <Icon icon={faFlagCheckered} style={{ color: 'var(--cf-phosphor)', fontSize: '12px' }} />
                                    <span className="cf-mono uppercase tracking-widest font-bold flex-1 truncate" style={{ fontSize: '12px', color: 'var(--cf-text)' }}>{s.name}</span>
                                    <span className="cf-mono tabular-nums" style={{ fontSize: '11px', color: 'var(--cf-text-muted)' }}>{s.completed_points ?? 0}/{s.committed_points ?? 0} pts</span>
                                    <span className="aero-pill cf-mono inline-flex items-center gap-1 px-2 py-1 font-bold" style={{ fontSize: '11px', color: 'var(--cf-cyan)' }}><Icon icon={faChartLine} /> Report</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating preview of the dragged ticket */}
            <DragOverlay dropAnimation={null}>
                {dragCard ? (
                    <div className="glass-panel flex items-center gap-2 px-3 py-2 rounded-lg" style={{ boxShadow: '0 12px 28px rgba(0,0,0,0.6)', cursor: 'grabbing' }}>
                        <span className="cf-led w-2 h-2 rounded-full flex-shrink-0" style={{ background: dragCard.priority ? PRIORITY_COLOR[dragCard.priority] : 'var(--cf-edge)' }} />
                        <span className="cf-mono truncate" style={{ fontSize: '12px', color: 'var(--cf-text)', maxWidth: 240 }}>{dragCard.name}</span>
                        {dragCard.story_points != null && <span className="cf-mono" style={{ fontSize: '9px', color: 'var(--cf-cyan)' }}>{toNumber(dragCard.story_points)} pts</span>}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
