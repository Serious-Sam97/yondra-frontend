'use client'

import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
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
                opacity: isDragging ? 0.4 : 1,
            }}
            className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2.5"
        >
            <button
                {...attributes}
                {...listeners}
                className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 p-1 -m-1"
                tabIndex={-1}
                aria-label="Drag to reorder"
            >
                <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                    <circle cx="3" cy="3"  r="1.5"/><circle cx="9" cy="3"  r="1.5"/>
                    <circle cx="3" cy="8"  r="1.5"/><circle cx="9" cy="8"  r="1.5"/>
                    <circle cx="3" cy="13" r="1.5"/><circle cx="9" cy="13" r="1.5"/>
                </svg>
            </button>
            <div style={{ backgroundColor: color }} className="w-2 h-2 rounded-full flex-shrink-0" />
            <span className="text-xs uppercase tracking-widest font-bold text-gray-300 flex-1 truncate">{section.name}</span>
            <span className="text-[10px] text-gray-600">{index + 1}</span>
        </div>
    )
}

export function BoardConfig({ boardId, sections: initialSections, onClose, onSectionsReordered }: BoardConfigProps) {
    const [sections, setSections] = useState(initialSections)
    const [saving, setSaving] = useState(false)
    const [activeId, setActiveId] = useState<number | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
    )

    const handleDragEnd = (event: any) => {
        setActiveId(null)
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

    const activeSection = activeId != null ? sections.find(s => s.id === activeId) : null

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-[95vw] max-w-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Board Config</p>
                <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer transition-colors">✕</button>
            </div>

            {/* Section order */}
            <div className="flex flex-col gap-3">
                <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Section Order</p>
                <DndContext
                    sensors={sensors}
                    onDragStart={e => setActiveId(e.active.id as number)}
                    onDragEnd={handleDragEnd}
                >
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
                    <DragOverlay dropAnimation={null}>
                        {activeSection && (
                            <div className="flex items-center gap-3 bg-gray-750 border border-amber-400/30 rounded-lg px-3 py-2.5 shadow-2xl">
                                <div className="text-gray-400 flex-shrink-0">
                                    <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                                        <circle cx="3" cy="3"  r="1.5"/><circle cx="9" cy="3"  r="1.5"/>
                                        <circle cx="3" cy="8"  r="1.5"/><circle cx="9" cy="8"  r="1.5"/>
                                        <circle cx="3" cy="13" r="1.5"/><circle cx="9" cy="13" r="1.5"/>
                                    </svg>
                                </div>
                                <span className="text-xs uppercase tracking-widest font-bold text-gray-200">{activeSection.name}</span>
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
                <p className="text-[10px] text-gray-600">Hold and drag a row to reorder</p>
            </div>

            <div className="border-t border-gray-800 pt-4 flex justify-end gap-3">
                <button onClick={onClose} className="btn-physical text-xs uppercase tracking-widest text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg cursor-pointer">
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-physical text-xs uppercase tracking-widest font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-50 px-4 py-2 rounded-lg cursor-pointer"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    )
}
