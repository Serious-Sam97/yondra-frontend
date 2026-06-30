'use client'

import { useState } from 'react'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { reorderSections } from '@/lib/api'

const SECTION_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107']

interface Section { id: number; name: string }

interface BoardConfigProps {
    boardId: number
    sections: Section[]
    onClose: () => void
    onSectionsReordered: (sections: Section[]) => void
}

function SortableRow({ section, index, color }: { section: Section; index: number; color: string }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition: transition ?? undefined,
                zIndex: isDragging ? 10 : undefined,
                boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.5)' : undefined,
            }}
            className="glass-card flex items-center gap-3 rounded-lg px-3 py-2.5"
        >
            <button
                {...attributes}
                {...listeners}
                style={{ touchAction: 'none' }}
                className="cursor-grab active:cursor-grabbing flex-shrink-0 p-1 -m-1 hover:opacity-70"
                tabIndex={-1}
                aria-label="Drag to reorder"
            >
                <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" style={{ color: 'rgba(42,38,32,0.5)' }}>
                    <circle cx="3" cy="3"  r="1.5"/><circle cx="9" cy="3"  r="1.5"/>
                    <circle cx="3" cy="8"  r="1.5"/><circle cx="9" cy="8"  r="1.5"/>
                    <circle cx="3" cy="13" r="1.5"/><circle cx="9" cy="13" r="1.5"/>
                </svg>
            </button>
            <div style={{ backgroundColor: color }} className="neon-dot w-2 h-2 rounded-full flex-shrink-0" />
            <span className="cf-label text-xs uppercase tracking-widest font-bold flex-1 truncate" style={{ color: 'var(--cf-ink)' }}>{section.name}</span>
            <span className="cf-mono text-[10px]" style={{ color: 'rgba(42,38,32,0.5)' }}>{index + 1}</span>
        </div>
    )
}

export function BoardConfig({ boardId, sections: initialSections, onClose, onSectionsReordered }: BoardConfigProps) {
    const [sections, setSections] = useState(initialSections)
    const [saving, setSaving] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
    )

    const handleDragEnd = (event: any) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = sections.findIndex(s => s.id === active.id)
        const newIndex = sections.findIndex(s => s.id === over.id)
        setSections(prev => arrayMove(prev, oldIndex, newIndex))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await reorderSections(boardId, sections.map(s => s.id))
            onSectionsReordered(sections)
            onClose()
        } catch {
            // keep modal open so the user can retry
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="aero-menu p-6 w-[95vw] max-w-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="cf-led" style={{ background: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)' }} />
                    <p className="cf-label text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--cf-text-muted)' }}>Board config</p>
                </div>
                <button onClick={onClose} className="cursor-pointer transition-colors" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
            </div>

            <div className="flex flex-col gap-3">
                <p className="cf-label text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--cf-text-muted)' }}>Section order</p>
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="flex flex-col gap-2">
                            {sections.map((s, i) => (
                                <SortableRow
                                    key={s.id}
                                    section={s}
                                    index={i}
                                    color={SECTION_COLORS[initialSections.findIndex(orig => orig.id === s.id) % SECTION_COLORS.length]}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                <p className="cf-mono text-[10px]" style={{ color: 'var(--cf-text-muted)' }}>Hold and drag a row to reorder</p>
            </div>

            <div className="border-t pt-4 flex justify-end gap-3" style={{ borderColor: 'var(--cf-edge)' }}>
                <button onClick={onClose} className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest px-4 py-2">
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold disabled:opacity-50 px-4 py-2"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    )
}
