'use client'

import { useEffect, useState } from 'react'
import { TagInterface } from '@/interfaces/TagInterface'

interface BoardUser { id: number; name: string }

interface CardEditProps {
    goBack: () => void
    submit: (card: any, isNew: boolean) => void
    card: any | null
    sections: { id: number; name: string }[]
    users?: BoardUser[]
    tags?: TagInterface[]
}

const SECTION_COLORS: Record<string, string> = {
    'To Do':       '#4CAF50',
    'In Progress': '#FF9800',
    'Done':        '#1976D2',
}
const DEFAULT_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107']
const AVATAR_COLORS  = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63']

function getSectionColor(name: string, index: number): string {
    return SECTION_COLORS[name] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const CardEdit: React.FC<CardEditProps> = ({ goBack, submit, card, sections, users = [], tags = [] }) => {
    const [id, setId] = useState(0)
    const [name, setName] = useState<string>('')
    const [description, setDescription] = useState<string>('')
    const [sectionId, setSectionId] = useState<number>(sections[0]?.id ?? 1)
    const [assignedUserId, setAssignedUserId] = useState<number | null>(null)
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])

    const isNew = card === null

    useEffect(() => {
        if (card !== null) {
            setId(card.id)
            setName(card.name)
            setDescription(card.description)
            setSectionId(card.section_id)
            setAssignedUserId(card.assigned_user_id ?? null)
            setSelectedTagIds((card.tags ?? []).map((t: TagInterface) => t.id))
        }
    }, [])

    const toggleTag = (tagId: number) => {
        setSelectedTagIds(prev =>
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        )
    }

    const handleSubmit = () => {
        submit({ id, name, description, section_id: sectionId, assigned_user_id: assignedUserId, tag_ids: selectedTagIds }, isNew)
    }

    const currentSection = sections.find(s => s.id === sectionId)
    const currentSectionIndex = sections.findIndex(s => s.id === sectionId)
    const currentColor = getSectionColor(currentSection?.name ?? '', currentSectionIndex)

    return (
        <div
            style={{
                background: 'linear-gradient(to bottom, #f5e642 0%, #fef08a 6%, #fef9c3 6%)',
                boxShadow: '4px 4px 12px rgba(0,0,0,0.4), 2px 2px 4px rgba(0,0,0,0.2)',
                fontFamily: 'Georgia, serif',
            }}
            className="flex flex-col w-[95vw] max-w-[420px] min-h-[420px] md:min-h-[480px] rounded-sm relative"
        >
            {/* Glue strip */}
            <div
                style={{ background: 'linear-gradient(to bottom, #e6d800, #f5e642)' }}
                className="h-8 w-full rounded-t-sm flex items-center justify-between px-4 flex-shrink-0"
            >
                <span style={{ color: '#a89800', fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.15em' }}>
                    {isNew ? 'NEW' : `#${String(id).padStart(4, '0')}`}
                </span>
                <button onClick={goBack} style={{ color: '#a89800' }} className="text-sm hover:opacity-60 cursor-pointer transition-opacity leading-none">
                    ✕
                </button>
            </div>

            {/* Paper body */}
            <div className="flex flex-col flex-1 px-6 pt-5 pb-6 gap-3 overflow-y-auto">

                <textarea
                    autoFocus
                    placeholder="What needs to be done?"
                    rows={2}
                    style={{ color: '#1a1a1a', caretColor: '#1a1a1a' }}
                    className="w-full bg-transparent text-lg md:text-2xl font-bold placeholder-yellow-600/50 focus:outline-none resize-none leading-tight"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <div style={{ borderColor: '#d4c200', opacity: 0.5 }} className="border-t"/>

                <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add some notes..."
                    style={{ color: '#333', caretColor: '#333' }}
                    className="w-full bg-transparent text-sm placeholder-yellow-700/40 focus:outline-none resize-none leading-relaxed"
                />

                {/* Section */}
                <div className="flex gap-2 flex-wrap">
                    {sections.map((s, i) => {
                        const color = getSectionColor(s.name, i)
                        const isActive = s.id === sectionId
                        return (
                            <button
                                key={s.id}
                                onClick={() => setSectionId(s.id)}
                                style={{ borderColor: color, backgroundColor: isActive ? color : 'transparent', color: isActive ? '#fff' : color, fontSize: '10px' }}
                                className="uppercase tracking-widest px-3 py-2 rounded-full border cursor-pointer transition-all duration-150 font-bold"
                            >
                                {s.name}
                            </button>
                        )
                    })}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                        {tags.map(tag => {
                            const isActive = selectedTagIds.includes(tag.id)
                            return (
                                <button
                                    key={tag.id}
                                    onClick={() => toggleTag(tag.id)}
                                    style={{ borderColor: tag.color, backgroundColor: isActive ? tag.color : 'transparent', color: isActive ? '#fff' : tag.color, fontSize: '10px' }}
                                    className="uppercase tracking-widest px-2.5 py-1.5 rounded-full border cursor-pointer transition-all duration-150 font-bold"
                                >
                                    {tag.name}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Assign user */}
                {users.length > 0 && (
                    <div className="flex gap-2 flex-wrap items-center">
                        <button
                            onClick={() => setAssignedUserId(null)}
                            style={{ fontSize: '10px', borderColor: '#bbb', color: assignedUserId === null ? '#fff' : '#888', backgroundColor: assignedUserId === null ? '#888' : 'transparent' }}
                            className="uppercase tracking-widest px-3 py-2 rounded-full border cursor-pointer transition-all duration-150 font-bold"
                        >
                            Unassigned
                        </button>
                        {users.map((u) => {
                            const color = AVATAR_COLORS[u.id % AVATAR_COLORS.length]
                            const isActive = assignedUserId === u.id
                            return (
                                <button
                                    key={u.id}
                                    onClick={() => setAssignedUserId(isActive ? null : u.id)}
                                    style={{ borderColor: color, backgroundColor: isActive ? color : 'transparent', color: isActive ? '#fff' : color, fontSize: '10px' }}
                                    className="uppercase tracking-widest px-3 py-2 rounded-full border cursor-pointer transition-all duration-150 font-bold flex items-center gap-1"
                                >
                                    {initials(u.name)} {u.name.split(' ')[0]}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Save */}
                <button
                    onClick={handleSubmit}
                    style={{ backgroundColor: currentColor, color: '#fff', fontFamily: 'monospace', letterSpacing: '0.1em', fontSize: '11px' }}
                    className="w-full py-2.5 rounded font-bold uppercase cursor-pointer hover:opacity-90 transition-opacity duration-150 mt-auto flex-shrink-0"
                >
                    {isNew ? 'Pin it' : 'Save'}
                </button>
            </div>

            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 20px 20px', borderColor: 'transparent transparent rgba(0,0,0,0.15) transparent' }}/>
        </div>
    )
}

export default CardEdit
