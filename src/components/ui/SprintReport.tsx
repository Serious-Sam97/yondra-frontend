'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { faArrowLeft, faChartLine, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { SprintInterface, SprintReportData, SprintReportTicket } from '@/interfaces/SprintInterface'
import type { CardInterface } from '@/interfaces/CardInterface'
import { getSprintReport } from '@/lib/api'
import { toNumber } from '@/lib/currency'

// Build a report client-side (demo mode / fallback). A completed sprint reads its
// frozen snapshot (so moved-out tickets still count); otherwise it uses live cards.
function localReport(sprint: SprintInterface, cards: CardInterface[]): SprintReportData {
    const tickets: SprintReportTicket[] = sprint.report_snapshot && sprint.report_snapshot.length
        ? sprint.report_snapshot.map(t => ({ id: t.id, name: t.name, points: t.points ?? 0, done_at: t.done_at ?? null, assigned_user: t.assigned_user ?? null }))
        : cards.map(c => ({
            id: Number(c.id), name: c.name, points: toNumber(c.story_points), done_at: c.done_at ?? null, assigned_user: c.assigned_user ?? null,
        }))
    const completed = tickets.filter(t => t.done_at)
    const notCompleted = tickets.filter(t => !t.done_at)
    const committed = sprint.committed_points ?? tickets.reduce((s, t) => s + (t.points ?? 0), 0)
    const completedPts = completed.reduce((s, t) => s + (t.points ?? 0), 0)

    // Per-day burndown from done_at over the sprint window.
    const start = sprint.started_at ? new Date(sprint.started_at) : sprint.start_date ? new Date(sprint.start_date + 'T00:00:00') : new Date()
    const end = sprint.completed_at ? new Date(sprint.completed_at) : sprint.end_date ? new Date(sprint.end_date + 'T00:00:00') : new Date()
    start.setHours(0, 0, 0, 0)
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
    const burndown = Array.from({ length: days }, (_, i) => {
        const day = new Date(start.getTime() + i * 86400000); day.setHours(23, 59, 59, 999)
        const burned = completed.filter(t => t.done_at && new Date(t.done_at) <= day).reduce((s, t) => s + (t.points ?? 0), 0)
        return {
            date: day.toISOString().slice(0, 10),
            remaining: Math.max(0, committed - burned),
            ideal: Math.round(committed * (1 - (days > 1 ? i / (days - 1) : 1)) * 10) / 10,
        }
    })
    return { sprint, committed_points: committed, completed_points: completedPts, completed, not_completed: notCompleted, burndown }
}

const AVATAR_COLORS = ['#9aa67e', '#ffb000', '#6fe0ff', '#ff5a4d', '#c08bff', '#ffd24a', '#6fe0ff', '#ff8fa3']
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }

// Median of a numeric list (0 when empty).
function median(nums: number[]): number {
    if (nums.length === 0) return 0
    const s = [...nums].sort((a, b) => a - b)
    const mid = Math.floor(s.length / 2)
    return s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 10) / 10
}

// Aggregate the report's tickets per assignee (median + totals) for the breakdown table.
function byAssignee(tickets: SprintReportTicket[]) {
    const groups = new Map<string, { name: string; id: number | null; tickets: SprintReportTicket[] }>()
    for (const t of tickets) {
        const key = t.assigned_user ? String(t.assigned_user.id) : 'unassigned'
        if (!groups.has(key)) groups.set(key, { name: t.assigned_user?.name ?? 'Unassigned', id: t.assigned_user?.id ?? null, tickets: [] })
        groups.get(key)!.tickets.push(t)
    }
    return [...groups.values()].map(g => {
        const done = g.tickets.filter(t => t.done_at)
        const pts = g.tickets.map(t => t.points ?? 0)
        return {
            name: g.name, id: g.id,
            total: g.tickets.length, done: done.length,
            totalPts: pts.reduce((a, b) => a + b, 0),
            donePts: done.reduce((a, b) => a + (b.points ?? 0), 0),
            median: median(g.tickets.map(t => t.points ?? 0)),
        }
    }).sort((a, b) => b.donePts - a.donePts || b.totalPts - a.totalPts)
}

function Burndown({ data, big = false }: { data: SprintReportData['burndown']; big?: boolean }) {
    const W = 320, H = big ? 200 : 150, PAD = 8
    if (data.length < 2) return <p className="cf-mono" style={{ fontSize: big ? '13px' : '11px', color: 'var(--cf-text-muted)' }}>Not enough days to chart.</p>
    const max = Math.max(1, ...data.map(d => Math.max(d.remaining, d.ideal)))
    const x = (i: number) => PAD + (i / (data.length - 1)) * (W - 2 * PAD)
    const y = (v: number) => PAD + (1 - v / max) * (H - 2 * PAD)
    const line = (key: 'remaining' | 'ideal') => data.map((d, i) => `${x(i)},${y(d[key])}`).join(' ')
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: big ? 260 : 170 }}>
            <polyline points={line('ideal')} fill="none" stroke="var(--cf-text-muted)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
            <polyline points={line('remaining')} fill="none" stroke="var(--cf-phosphor)" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 4px var(--cf-phosphor))' }} />
            {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.remaining)} r={big ? 3 : 2.5} fill="var(--cf-phosphor)" />)}
        </svg>
    )
}

function Velocity({ sprints, big = false }: { sprints: SprintInterface[]; big?: boolean }) {
    const done = sprints.filter(s => s.status === 'completed').slice(-7)
    if (done.length === 0) return <p className="cf-mono" style={{ fontSize: big ? '13px' : '11px', color: 'var(--cf-text-muted)' }}>No completed sprints yet.</p>
    const MAX_PX = big ? 160 : 100
    const bw = big ? 16 : 12
    const max = Math.max(1, ...done.map(s => Math.max(s.committed_points ?? 0, s.completed_points ?? 0)))
    const px = (v: number) => Math.max(2, Math.round((v / max) * MAX_PX))
    return (
        <div className="flex items-end gap-3 justify-around" style={{ height: MAX_PX + 24 }}>
            {done.map(s => (
                <div key={s.id} className="flex flex-col items-center gap-1" style={{ minWidth: 0, flex: '1 1 0' }}>
                    <div className="flex items-end gap-1 justify-center" style={{ height: MAX_PX }}>
                        <div title={`Committed ${s.committed_points ?? 0}`} style={{ width: bw, height: px(s.committed_points ?? 0), background: 'var(--cf-text-muted)' }} />
                        <div title={`Completed ${s.completed_points ?? 0}`} style={{ width: bw, height: px(s.completed_points ?? 0), background: 'var(--cf-cyan)', boxShadow: '0 0 6px var(--cf-cyan)' }} />
                    </div>
                    <span className="cf-mono truncate w-full text-center" style={{ fontSize: big ? '10px' : '8px', color: 'var(--cf-text-muted)' }} title={s.name}>{s.name}</span>
                </div>
            ))}
        </div>
    )
}

// Horizontal bars of median story points — overall + one per assignee.
function MedianBars({ people, overall, big = false }: { people: ReturnType<typeof byAssignee>; overall: number; big?: boolean }) {
    const rows = [{ name: 'All tickets', id: -1 as number | null, median: overall }, ...people]
    const max = Math.max(1, ...rows.map(r => r.median))
    return (
        <div className="flex flex-col gap-1.5">
            {rows.map(r => {
                const isAll = r.id === -1
                const color = isAll ? 'var(--cf-phosphor)' : r.id !== null ? AVATAR_COLORS[r.id % AVATAR_COLORS.length] : 'var(--cf-text-muted)'
                return (
                    <div key={String(r.id)} className="flex items-center gap-2">
                        <span className="cf-mono truncate flex-shrink-0 text-right" style={{ width: big ? 128 : 96, fontSize: big ? '12px' : '9px', color: isAll ? 'var(--cf-text)' : 'var(--cf-text-muted)', fontWeight: isAll ? 700 : 400 }} title={r.name}>{r.name}</span>
                        <div className={`flex-1 ${big ? 'h-5' : 'h-3.5'} rounded-sm overflow-hidden`} style={{ background: '#0d1410' }}>
                            <div className="h-full rounded-sm" style={{ width: `${(r.median / max) * 100}%`, minWidth: r.median > 0 ? 3 : 0, background: color, boxShadow: `0 0 6px ${color}66`, transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)' }} />
                        </div>
                        <span className="cf-mono tabular-nums flex-shrink-0 text-right" style={{ width: big ? 34 : 26, fontSize: big ? '14px' : '10px', color, fontWeight: 700 }}>{r.median}</span>
                    </div>
                )
            })}
        </div>
    )
}

export function SprintReport({ boardId, sprint, sprints, cards, isDemo, onClose, variant = 'modal' }: {
    boardId: number;
    sprint: SprintInterface;
    sprints: SprintInterface[];
    cards: CardInterface[];
    isDemo?: boolean;
    onClose: () => void;
    // 'modal' floats in a capped, scrollable panel; 'page' fills a dedicated route
    // (the page itself provides the max-width, padding and scrolling).
    variant?: 'modal' | 'page';
}) {
    const isPage = variant === 'page'
    const [report, setReport] = useState<SprintReportData>(() => localReport(sprint, cards))

    useEffect(() => {
        if (isDemo || boardId === 0) return
        getSprintReport(boardId, sprint.id).then(setReport).catch(() => { /* keep local fallback */ })
    }, [boardId, sprint.id, isDemo])

    const pct = report.committed_points ? Math.round((report.completed_points / report.committed_points) * 100) : 0
    const allTickets = [...report.completed, ...report.not_completed]
    // Median ticket size (only tickets that carry an estimate).
    const overallMedian = median(allTickets.map(t => t.points ?? 0).filter(p => p > 0))
    const people = byAssignee(allTickets)

    // One sizing knob: the page has room to breathe, the modal doesn't.
    const fs = (m: number, p: number) => (isPage ? p : m)
    const panelCls = `glass-panel rounded-xl ${isPage ? 'p-5' : 'p-4'} flex flex-col`
    const cols = isPage ? '1fr 80px 112px 72px' : '1fr 64px 88px 56px'
    const avatar = isPage ? 24 : 18

    const Tile = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
        <div className={`glass-panel rounded-xl flex flex-col items-center gap-1.5 flex-1 ${isPage ? 'px-4 py-5 min-w-[128px]' : 'px-3 py-3.5 min-w-[88px]'}`}
            style={{ borderTop: `2px solid ${color}` }}>
            <p className="font-bold tabular-nums leading-none" style={{ fontSize: fs(30, 46), color }}>{value}</p>
            <p className="cf-mono uppercase tracking-widest text-center leading-tight" style={{ fontSize: fs(8, 11), color: 'var(--cf-text-muted)' }}>{label}</p>
        </div>
    )

    const medianPanel = (
        <div className={`${panelCls} gap-3`}>
            <p className="cf-mono uppercase tracking-widest font-bold" style={{ fontSize: fs(9, 12), color: 'var(--cf-text-muted)' }}>Median story points</p>
            <MedianBars people={people} overall={overallMedian} big={isPage} />
        </div>
    )

    const assigneePanel = (
        <div className={`${panelCls} gap-2`}>
            <p className="cf-mono uppercase tracking-widest font-bold" style={{ fontSize: fs(9, 12), color: 'var(--cf-text-muted)' }}>By assignee</p>
            {/* Header row */}
            <div className="grid items-center gap-2 pb-1" style={{ gridTemplateColumns: cols, borderBottom: '1px solid var(--cf-edge)' }}>
                <span className="cf-mono uppercase tracking-widest" style={{ fontSize: fs(8, 11), color: 'var(--cf-text-muted)' }}>Person</span>
                <span className="cf-mono uppercase tracking-widest text-right" style={{ fontSize: fs(8, 11), color: 'var(--cf-text-muted)' }}>Tickets</span>
                <span className="cf-mono uppercase tracking-widest text-right" style={{ fontSize: fs(8, 11), color: 'var(--cf-text-muted)' }}>Points</span>
                <span className="cf-mono uppercase tracking-widest text-right" style={{ fontSize: fs(8, 11), color: 'var(--cf-text-muted)' }}>Median</span>
            </div>
            {people.length === 0 ? (
                <p className="cf-mono" style={{ fontSize: fs(10, 13), color: 'var(--cf-text-muted)' }}>—</p>
            ) : people.map(p => (
                <div key={p.id ?? 'unassigned'} className={`grid items-center gap-2 ${isPage ? 'py-0.5' : ''}`} style={{ gridTemplateColumns: cols }}>
                    <span className="flex items-center gap-2 min-w-0">
                        {p.id !== null ? (
                            <span className="cf-mono rounded-full flex items-center justify-center font-bold flex-shrink-0"
                                style={{ width: avatar, height: avatar, fontSize: fs(8, 10), backgroundColor: AVATAR_COLORS[p.id % AVATAR_COLORS.length], color: 'var(--cf-ink)', border: '1px solid var(--cf-edge)' }}>{initials(p.name)}</span>
                        ) : (
                            <span className="rounded-full flex-shrink-0" style={{ width: avatar, height: avatar, border: '1px dashed var(--cf-edge)' }} />
                        )}
                        <span className="cf-mono truncate" style={{ fontSize: fs(11, 14), color: p.id !== null ? 'var(--cf-text)' : 'var(--cf-text-muted)' }}>{p.name}</span>
                    </span>
                    <span className="cf-mono tabular-nums text-right" style={{ fontSize: fs(10, 13), color: 'var(--cf-text)' }}>
                        <span style={{ color: 'var(--cf-phosphor)' }}>{p.done}</span>/{p.total}
                    </span>
                    <span className="cf-mono tabular-nums text-right" style={{ fontSize: fs(10, 13), color: 'var(--cf-text)' }}>
                        <span style={{ color: 'var(--cf-phosphor)' }}>{p.donePts}</span>/{p.totalPts}
                    </span>
                    <span className="cf-mono tabular-nums text-right font-bold" style={{ fontSize: fs(10, 13), color: 'var(--cf-cyan)' }}>{p.median}</span>
                </div>
            ))}
        </div>
    )

    return (
        <div className={isPage
            ? 'w-full flex flex-col gap-6'
            : 'aero-menu rounded-2xl p-6 w-[92vw] max-w-2xl flex flex-col gap-5 max-h-[88vh] overflow-y-auto'}>
            {isPage && (
                <button onClick={onClose} className="cf-label flex items-center gap-1.5 cursor-pointer transition-colors duration-150 self-start"
                    style={{ color: 'var(--cf-text-muted)' }}>
                    <Icon icon={faArrowLeft} style={{ fontSize: 11 }} /> Back to board
                </button>
            )}
            <div className="flex items-center gap-2.5 pb-3" style={{ borderBottom: '1px solid var(--cf-edge)' }}>
                <Icon icon={faChartLine} style={{ color: 'var(--cf-phosphor)', fontSize: isPage ? 22 : 15 }} />
                <div className="flex flex-col">
                    <p className="chrome-text font-bold" style={{ fontSize: isPage ? '26px' : '15px' }}>{sprint.name}</p>
                    <p className="cf-mono uppercase tracking-[0.25em]" style={{ fontSize: fs(8, 10), color: 'var(--cf-text-muted)' }}>Sprint report</p>
                </div>
                {!isPage && (
                    <button onClick={onClose} aria-label="Close" className="ml-auto btn-physical cursor-pointer" style={{ color: 'var(--cf-text-muted)' }}><Icon icon={faXmark} /></button>
                )}
            </div>

            {/* Summary tiles — spread across the full width on the page */}
            <div className={isPage ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3' : 'flex gap-2.5 flex-wrap'}>
                <Tile label="Committed pts" value={report.committed_points} color="var(--cf-text)" />
                <Tile label="Completed pts" value={report.completed_points} color="var(--cf-phosphor)" />
                <Tile label="Done tickets" value={report.completed.length} color="var(--cf-cyan)" />
                <Tile label="Not done" value={report.not_completed.length} color="var(--cf-amber)" />
                <Tile label="Complete" value={`${pct}%`} color="var(--cf-cyan)" />
                <Tile label="Median pts" value={overallMedian} color="var(--cf-text)" />
            </div>

            {/* Overall completion bar */}
            <div className="flex items-center gap-3">
                <div className={`flex-1 ${isPage ? 'h-3' : 'h-2'} rounded-full overflow-hidden`} style={{ background: '#0d1410', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--cf-phosphor)', boxShadow: '0 0 8px var(--cf-phosphor)', transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)' }} />
                </div>
                <span className="cf-mono tabular-nums flex-shrink-0" style={{ fontSize: fs(10, 13), color: 'var(--cf-text-muted)' }}>
                    {report.completed_points}/{report.committed_points} pts
                </span>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className={`${panelCls} gap-2`}>
                    <p className="cf-mono uppercase tracking-widest font-bold" style={{ fontSize: fs(9, 12), color: 'var(--cf-text-muted)' }}>Burndown</p>
                    <Burndown data={report.burndown} big={isPage} />
                    <div className="flex gap-3">
                        <span className="cf-mono inline-flex items-center gap-1" style={{ fontSize: fs(8, 11), color: 'var(--cf-text-muted)' }}><span style={{ width: 10, height: 2, background: 'var(--cf-phosphor)', display: 'inline-block' }} /> Remaining</span>
                        <span className="cf-mono inline-flex items-center gap-1" style={{ fontSize: fs(8, 11), color: 'var(--cf-text-muted)' }}><span style={{ width: 10, height: 2, background: 'var(--cf-text-muted)', display: 'inline-block' }} /> Ideal</span>
                    </div>
                </div>
                <div className={`${panelCls} gap-2`}>
                    <p className="cf-mono uppercase tracking-widest font-bold" style={{ fontSize: fs(9, 12), color: 'var(--cf-text-muted)' }}>Velocity</p>
                    <Velocity sprints={sprints} big={isPage} />
                    <div className="flex gap-3">
                        <span className="cf-mono inline-flex items-center gap-1" style={{ fontSize: fs(8, 11), color: 'var(--cf-text-muted)' }}><span style={{ width: 8, height: 8, background: 'var(--cf-text-muted)', display: 'inline-block' }} /> Committed</span>
                        <span className="cf-mono inline-flex items-center gap-1" style={{ fontSize: fs(8, 11), color: 'var(--cf-text-muted)' }}><span style={{ width: 8, height: 8, background: 'var(--cf-cyan)', display: 'inline-block' }} /> Completed</span>
                    </div>
                </div>
            </div>

            {/* Median story points + per-assignee breakdown — paired two-up on the page */}
            <div className={isPage ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 items-start' : 'flex flex-col gap-5'}>
                {medianPanel}
                {assigneePanel}
            </div>

            {/* Ticket lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <TicketList title={`Completed (${report.completed.length})`} tickets={report.completed} color="var(--cf-phosphor)" big={isPage} />
                <TicketList title={`Not completed (${report.not_completed.length})`} tickets={report.not_completed} color="var(--cf-amber)" big={isPage} />
            </div>
        </div>
    )
}

function TicketList({ title, tickets, color, big = false }: { title: string; tickets: SprintReportTicket[]; color: string; big?: boolean }) {
    return (
        <div className={`glass-panel rounded-xl ${big ? 'p-5 gap-2.5' : 'p-4 gap-2'} flex flex-col`}>
            <p className="cf-mono uppercase tracking-widest font-bold" style={{ fontSize: big ? '12px' : '9px', color }}>{title}</p>
            {tickets.length === 0 ? (
                <p className="cf-mono" style={{ fontSize: big ? '13px' : '10px', color: 'var(--cf-text-muted)' }}>—</p>
            ) : tickets.map(t => (
                <div key={t.id} className={`flex items-center gap-2 ${big ? 'py-1 border-b last:border-b-0' : ''}`} style={big ? { borderColor: 'var(--cf-edge)' } : undefined}>
                    <span className="cf-mono flex-1 truncate" style={{ fontSize: big ? '14px' : '11px', color: 'var(--cf-text)' }}>{t.name}</span>
                    {t.points != null && <span className="cf-mono tabular-nums flex-shrink-0" style={{ fontSize: big ? '11px' : '9px', color: 'var(--cf-cyan)' }}>{t.points} pts</span>}
                </div>
            ))}
        </div>
    )
}
