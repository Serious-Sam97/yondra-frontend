'use client'

import { useState } from 'react'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { reorderSections, updateBoard } from '@/lib/api'
import { updateDemoBoard, demoReorderSections } from '@/lib/demoStorage'

const SECTION_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107']

interface Section { id: number; name: string }

interface BoardSettingsProps {
    boardId: number
    isDemo: boolean
    demoId: string
    name: string
    description: string
    sections: Section[]
    onMetaSaved: (name: string, description: string) => void
    onSectionsReordered: (sections: Section[]) => void
    onDelete: () => void
    onClose: () => void
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

export function BoardSettings({ boardId, isDemo, demoId, name: initialName, description: initialDesc, sections: initialSections, onMetaSaved, onSectionsReordered, onDelete, onClose }: BoardSettingsProps) {
    const [name, setName] = useState(initialName)
    const [description, setDescription] = useState(initialDesc)
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
        const trimmed = name.trim()
        if (!trimmed) return
        setSaving(true)
        try {
            // board meta
            if (isDemo) updateDemoBoard(demoId, trimmed, description.trim())
            else await updateBoard(boardId, { name: trimmed, description: description.trim() })
            onMetaSaved(trimmed, description.trim())

            // section order (only if it actually changed)
            const changed = sections.some((s, i) => s.id !== initialSections[i]?.id)
            if (changed) {
                if (isDemo) demoReorderSections(demoId, sections.map(s => s.id))
                else await reorderSections(boardId, sections.map(s => s.id))
                onSectionsReordered(sections)
            }
            onClose()
        } catch {
            // keep the modal open so the user can retry
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="aero-menu rounded-2xl p-6 w-[90vw] max-w-md flex flex-col gap-5 relative max-h-[85vh] overflow-y-auto">
            <span className="cf-screw" style={{ position: 'absolute', top: 8, left: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', top: 8, right: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', bottom: 8, left: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', bottom: 8, right: 8 }} />

            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--cf-edge)' }}>
                <div className="flex items-center gap-2">
                    <span className="cf-led" style={{ background: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)' }} />
                    <p className="cf-label uppercase tracking-[0.25em] font-bold" style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }}>Board Settings</p>
                </div>
                <button onClick={onClose} className="cursor-pointer transition-colors" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
            </div>

            {/* Board meta */}
            <div className="flex flex-col gap-1">
                <label className="cf-label uppercase tracking-widest font-bold" style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }}>Name</label>
                <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Board name…" className="glass-input cf-lcd text-sm" />
            </div>
            <div className="flex flex-col gap-1">
                <label className="cf-label uppercase tracking-widest font-bold" style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional…" rows={2} className="glass-input cf-lcd text-sm resize-none" />
            </div>

            {/* Section order */}
            {sections.length > 0 && (
                <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: 'var(--cf-edge)' }}>
                    <label className="cf-label uppercase tracking-widest font-bold" style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }}>Section order</label>
                    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            <div className="flex flex-col gap-2">
                                {sections.map((s, i) => (
                                    <SortableRow key={s.id} section={s} index={i} color={SECTION_COLORS[initialSections.findIndex(orig => orig.id === s.id) % SECTION_COLORS.length]} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                    <p className="cf-mono text-[10px]" style={{ color: 'var(--cf-text-muted)' }}>Hold and drag a row to reorder</p>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--cf-edge)' }}>
                <button type="button" onClick={onDelete} className="aero-btn aero-btn--magenta uppercase tracking-widest font-bold px-4 py-1.5 text-[10px]">Delete</button>
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="aero-btn aero-btn--ghost uppercase tracking-widest font-bold px-4 py-1.5 text-[10px]">Cancel</button>
                    <button type="button" onClick={handleSave} disabled={saving || !name.trim()} className="aero-btn aero-btn--cyan uppercase tracking-widest font-bold px-5 py-1.5 text-[10px] disabled:opacity-50">
                        {saving ? '…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    )
}
