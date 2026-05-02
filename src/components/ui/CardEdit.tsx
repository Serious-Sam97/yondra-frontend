'use client'

import { useEffect, useRef, useState } from 'react'
import { TagInterface } from '@/interfaces/TagInterface'
import { ChecklistItem } from '@/interfaces/CardInterface'
import {
    createChecklistItem, updateChecklistItem, deleteChecklistItem,
    getComments, createComment, deleteComment,
    getSubtasks, createSubtask, updateSubtask,
    getTemplates, createTemplate, deleteTemplate,
} from '@/lib/api'
import {
    demoCreateChecklistItem, demoUpdateChecklistItem, demoDeleteChecklistItem,
    demoGetSubtasks, demoCreateSubtask, demoToggleSubtask,
    loadDemoTemplates, saveDemoTemplate, deleteDemoTemplate,
} from '@/lib/demoStorage'

interface BoardUser { id: number; name: string }

interface Comment { id: number; body: string; user: { id: number; name: string }; created_at: string }

interface Subtask { id: number; name: string; is_done: boolean }

interface Template { id: number; name: string; template_data: any }

interface CardEditProps {
    goBack: () => void
    submit: (card: any, isNew: boolean) => void
    onDelete?: () => void
    card: any | null
    sections: { id: number; name: string }[]
    users?: BoardUser[]
    tags?: TagInterface[]
    boardId?: number
    isDemo?: boolean
    demoId?: string
    isReadOnly?: boolean
    initialTemplates?: Template[]
}

const SECTION_COLORS: Record<string, string> = {
    'To Do':       '#4CAF50',
    'In Progress': '#FF9800',
    'Done':        '#1976D2',
}
const DEFAULT_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107']
const AVATAR_COLORS  = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63']
const PRIORITY_OPTS: { value: 'low' | 'medium' | 'high'; label: string; color: string }[] = [
    { value: 'low',    label: 'Low',    color: '#22c55e' },
    { value: 'medium', label: 'Medium', color: '#f97316' },
    { value: 'high',   label: 'High',   color: '#ef4444' },
]

function getSectionColor(name: string, index: number): string {
    return SECTION_COLORS[name] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
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

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const CardEdit: React.FC<CardEditProps> = ({
    goBack, submit, onDelete, card, sections, users = [], tags = [],
    boardId, isDemo = false, demoId = 'demo', isReadOnly = false, initialTemplates = [],
}) => {
    const [id, setId] = useState(0)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [sectionId, setSectionId] = useState<number>(sections[0]?.id ?? 1)
    const [assignedUserId, setAssignedUserId] = useState<number | null>(null)
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
    const [dueDate, setDueDate] = useState('')
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | null>(null)
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
    const [newChecklistText, setNewChecklistText] = useState('')
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('')
    const [loadingComments, setLoadingComments] = useState(false)
    const [subtasks, setSubtasks] = useState<Subtask[]>([])
    const [newSubtaskName, setNewSubtaskName] = useState('')
    const [loadingSubtasks, setLoadingSubtasks] = useState(false)
    const [templates, setTemplates] = useState<Template[]>(initialTemplates)
    const [showTemplatePicker, setShowTemplatePicker] = useState(false)
    const [templateNameInput, setTemplateNameInput] = useState('')
    const [showSaveTemplate, setShowSaveTemplate] = useState(false)
    const [mentionUsers, setMentionUsers] = useState<BoardUser[]>([])
    const [mentionAnchor, setMentionAnchor] = useState<number>(-1)
    const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'comments' | 'subtasks'>('details')
    const commentInputRef = useRef<HTMLTextAreaElement>(null)

    const isNew = card === null

    useEffect(() => {
        if (card !== null) {
            setId(card.id)
            setName(card.name)
            setDescription(card.description ?? '')
            setSectionId(card.section_id)
            setAssignedUserId(card.assigned_user_id ?? null)
            setSelectedTagIds((card.tags ?? []).map((t: TagInterface) => t.id))
            setDueDate(card.due_date ?? '')
            setPriority(card.priority ?? null)
            setChecklistItems(card.checklist_items ?? [])
        }
    }, [])

    useEffect(() => {
        if (!isNew && !isDemo && boardId && card?.id) {
            setLoadingComments(true)
            getComments(boardId, card.id)
                .then(data => setComments(Array.isArray(data) ? data : []))
                .catch(() => {})
                .finally(() => setLoadingComments(false))
        }
    }, [])

    useEffect(() => {
        if (!isNew && card?.id) {
            setLoadingSubtasks(true)
            if (isDemo) {
                setSubtasks(demoGetSubtasks(demoId, card.id).map(s => ({ id: s.id, name: s.name, is_done: s.is_done ?? false })))
                setLoadingSubtasks(false)
            } else if (boardId) {
                getSubtasks(boardId, card.id)
                    .then(data => setSubtasks(Array.isArray(data) ? data : []))
                    .catch(() => {})
                    .finally(() => setLoadingSubtasks(false))
            }
        }
    }, [])

    useEffect(() => {
        if (isDemo) {
            setTemplates(loadDemoTemplates(demoId))
        } else if (boardId && initialTemplates.length === 0) {
            getTemplates(boardId).then(data => setTemplates(Array.isArray(data) ? data : [])).catch(() => {})
        }
    }, [])

    const toggleTag = (tagId: number) => {
        if (isReadOnly) return
        setSelectedTagIds(prev =>
            prev.includes(tagId) ? prev.filter(i => i !== tagId) : [...prev, tagId]
        )
    }

    const handleSubmit = () => {
        if (isReadOnly) return
        submit({
            id, name, description,
            section_id: sectionId,
            assigned_user_id: assignedUserId,
            tag_ids: selectedTagIds,
            due_date: dueDate || null,
            priority: priority ?? null,
            checklist_items: checklistItems,
        }, isNew)
    }

    // --- Templates ---

    const handleSaveTemplate = async () => {
        const tname = templateNameInput.trim()
        if (!tname) return
        const data = { name: tname, description, tag_ids: selectedTagIds, priority, due_date: dueDate || null }
        if (isDemo) {
            const t = saveDemoTemplate(demoId, tname, data)
            setTemplates(prev => [...prev, t])
        } else if (boardId) {
            const t = await createTemplate(boardId, { name: tname, template_data: data }).catch(() => null)
            if (t) setTemplates(prev => [...prev, t])
        }
        setTemplateNameInput('')
        setShowSaveTemplate(false)
    }

    const handleApplyTemplate = (t: Template) => {
        const d = t.template_data as any
        if (d.description !== undefined) setDescription(d.description)
        if (d.tag_ids !== undefined) setSelectedTagIds(d.tag_ids)
        if (d.priority !== undefined) setPriority(d.priority)
        if (d.due_date !== undefined) setDueDate(d.due_date ?? '')
        setShowTemplatePicker(false)
    }

    const handleDeleteTemplate = async (tId: number) => {
        if (isDemo) {
            deleteDemoTemplate(demoId, tId)
        } else if (boardId) {
            await deleteTemplate(boardId, tId).catch(() => {})
        }
        setTemplates(prev => prev.filter(t => t.id !== tId))
    }

    // --- Checklist ---

    const handleAddChecklistItem = async () => {
        const text = newChecklistText.trim()
        if (!text) return
        setNewChecklistText('')
        if (isDemo) {
            const item = demoCreateChecklistItem(demoId, id, text)
            setChecklistItems(prev => [...prev, item])
        } else if (boardId && id) {
            const item = await createChecklistItem(boardId, id, text)
            setChecklistItems(prev => [...prev, item])
        } else {
            setChecklistItems(prev => [...prev, { id: Date.now(), text, is_done: false, position: prev.length }])
        }
    }

    const handleToggleItem = async (item: ChecklistItem) => {
        const updated = { ...item, is_done: !item.is_done }
        setChecklistItems(prev => prev.map(i => i.id === item.id ? updated : i))
        if (!isNew) {
            if (isDemo) demoUpdateChecklistItem(demoId, id, item.id, { is_done: updated.is_done })
            else if (boardId) updateChecklistItem(boardId, id, item.id, { is_done: updated.is_done })
        }
    }

    const handleDeleteItem = async (item: ChecklistItem) => {
        setChecklistItems(prev => prev.filter(i => i.id !== item.id))
        if (!isNew) {
            if (isDemo) demoDeleteChecklistItem(demoId, id, item.id)
            else if (boardId) deleteChecklistItem(boardId, id, item.id)
        }
    }

    // --- Comments with @mention ---

    const handleCommentChange = (val: string) => {
        setNewComment(val)
        const cursor = val.lastIndexOf('@')
        if (cursor !== -1 && /^@\w*$/.test(val.slice(cursor))) {
            const query = val.slice(cursor + 1).toLowerCase()
            setMentionAnchor(cursor)
            setMentionUsers(users.filter(u => u.name.split(' ')[0].toLowerCase().startsWith(query)))
        } else {
            setMentionAnchor(-1)
            setMentionUsers([])
        }
    }

    const handlePickMention = (user: BoardUser) => {
        const firstName = user.name.split(' ')[0]
        const before = newComment.slice(0, mentionAnchor)
        setNewComment(`${before}@${firstName} `)
        setMentionAnchor(-1)
        setMentionUsers([])
        commentInputRef.current?.focus()
    }

    const handleAddComment = async () => {
        const body = newComment.trim()
        if (!body || !boardId || !id) return
        setNewComment('')
        const comment = await createComment(boardId, id, body)
        setComments(prev => [comment, ...prev])
    }

    const handleDeleteComment = async (commentId: number) => {
        if (!boardId || !id) return
        await deleteComment(boardId, id, commentId)
        setComments(prev => prev.filter(c => c.id !== commentId))
    }

    // --- Subtasks ---

    const handleAddSubtask = async () => {
        const n = newSubtaskName.trim()
        if (!n) return
        setNewSubtaskName('')
        if (isDemo) {
            const s = demoCreateSubtask(demoId, id, { name: n })
            setSubtasks(prev => [...prev, { id: s.id, name: s.name, is_done: false }])
        } else if (boardId && id) {
            const s = await createSubtask(boardId, id, { name: n })
            setSubtasks(prev => [...prev, { id: s.id, name: s.name, is_done: s.is_done ?? false }])
        }
    }

    const handleToggleSubtask = async (s: Subtask) => {
        setSubtasks(prev => prev.map(i => i.id === s.id ? { ...i, is_done: !i.is_done } : i))
        if (isDemo) {
            demoToggleSubtask(demoId, s.id)
        } else if (boardId && id) {
            updateSubtask(boardId, id, s.id, { is_done: !s.is_done }).catch(() => {})
        }
    }

    const currentSection = sections.find(s => s.id === sectionId)
    const currentSectionIndex = sections.findIndex(s => s.id === sectionId)
    const currentColor = getSectionColor(currentSection?.name ?? '', currentSectionIndex)
    const doneCount = checklistItems.filter(i => i.is_done).length
    const doneSubtasks = subtasks.filter(s => s.is_done).length
    const primaryTagColor = selectedTagIds.length > 0
        ? (tags.find(t => t.id === selectedTagIds[0])?.color ?? null)
        : null;
    const cardBackground = primaryTagColor
        ? blendWithCream(primaryTagColor)
        : 'linear-gradient(to bottom, #f5e642 0%, #fef08a 6%, #fef9c3 6%)';
    const glueBackground = primaryTagColor
        ? primaryTagColor
        : 'linear-gradient(to bottom, #e6d800, #f5e642)';
    const glueTextColor = primaryTagColor ? 'rgba(255,255,255,0.85)' : '#a89800';

    const tabs = isNew
        ? []
        : (['details', 'checklist', 'subtasks', 'comments'] as const)

    return (
        <div
            style={{
                background: cardBackground,
                boxShadow: '4px 4px 12px rgba(0,0,0,0.4), 2px 2px 4px rgba(0,0,0,0.2)',
                fontFamily: 'Georgia, serif',
                maxHeight: '90vh',
            }}
            className="flex flex-col w-[95vw] max-w-[480px] rounded-sm relative"
        >
            {/* Glue strip */}
            <div
                style={{ background: glueBackground }}
                className="h-8 w-full rounded-t-sm flex items-center justify-between px-4 flex-shrink-0"
            >
                <div className="flex items-center gap-2">
                    <span style={{ color: glueTextColor, fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.15em' }}>
                        {isNew ? 'NEW' : `#${String(id).padStart(4, '0')}`}
                    </span>
                    {!isNew && card?.created_at && (
                        <span style={{ color: glueTextColor, fontFamily: 'monospace', fontSize: '10px', opacity: 0.7 }}>
                            · {new Date(card.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    )}
                    {isReadOnly && (
                        <span style={{ color: glueTextColor, fontFamily: 'monospace', fontSize: '9px', opacity: 0.6, letterSpacing: '0.1em' }}>
                            · READ ONLY
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {!isNew && !isReadOnly && onDelete && (
                        <button onClick={onDelete} style={{ color: primaryTagColor ? 'rgba(255,200,200,0.9)' : '#cc0000' }} className="text-xs hover:opacity-60 cursor-pointer transition-opacity" title="Archive card">
                            🗑
                        </button>
                    )}
                    <button onClick={goBack} style={{ color: glueTextColor }} className="text-sm hover:opacity-60 cursor-pointer transition-opacity leading-none">
                        ✕
                    </button>
                </div>
            </div>

            {/* Tabs (only for existing cards) */}
            {!isNew && (
                <div className="flex border-b border-yellow-300/40 px-4 pt-2 gap-4 flex-shrink-0" style={{ backgroundColor: cardBackground as string }}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{ color: activeTab === tab ? '#7a6500' : '#bba000', fontSize: '10px', borderBottom: activeTab === tab ? '2px solid #7a6500' : '2px solid transparent' }}
                            className="uppercase tracking-widest font-bold pb-2 cursor-pointer transition-all"
                        >
                            {tab === 'checklist' && checklistItems.length > 0 ? `checklist ${doneCount}/${checklistItems.length}` :
                             tab === 'comments' && comments.length > 0 ? `comments ${comments.length}` :
                             tab === 'subtasks' && subtasks.length > 0 ? `subtasks ${doneSubtasks}/${subtasks.length}` :
                             tab}
                        </button>
                    ))}
                </div>
            )}

            {/* Body */}
            <div className="flex flex-col flex-1 px-6 pt-4 pb-6 gap-3 overflow-y-auto" style={{ maxHeight: '70vh' }}>

                {/* Details tab (or always shown if new) */}
                {(isNew || activeTab === 'details') && (
                    <>
                        <textarea
                            autoFocus
                            placeholder="What needs to be done?"
                            rows={2}
                            disabled={isReadOnly}
                            style={{ color: '#1a1a1a', caretColor: '#1a1a1a' }}
                            className="w-full bg-transparent text-lg md:text-xl font-bold placeholder-yellow-600/50 focus:outline-none resize-none leading-tight disabled:opacity-70"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <div style={{ borderColor: '#d4c200', opacity: 0.5 }} className="border-t"/>

                        <textarea
                            rows={3}
                            disabled={isReadOnly}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add some notes..."
                            style={{ color: '#333', caretColor: '#333' }}
                            className="w-full bg-transparent text-sm placeholder-yellow-700/40 focus:outline-none resize-none leading-relaxed disabled:opacity-70"
                        />

                        {/* Template buttons */}
                        <div className="flex gap-2 flex-wrap">
                            {templates.length > 0 && (
                                <button
                                    onClick={() => setShowTemplatePicker(v => !v)}
                                    style={{ fontSize: '9px', borderColor: '#bba000', color: '#7a6500' }}
                                    className="uppercase tracking-widest px-2 py-1 rounded border cursor-pointer hover:opacity-70 transition-opacity font-bold"
                                >
                                    From Template ▾
                                </button>
                            )}
                            {!isReadOnly && (
                                <button
                                    onClick={() => setShowSaveTemplate(v => !v)}
                                    style={{ fontSize: '9px', borderColor: '#bba000', color: '#7a6500' }}
                                    className="uppercase tracking-widest px-2 py-1 rounded border cursor-pointer hover:opacity-70 transition-opacity font-bold"
                                >
                                    Save as Template
                                </button>
                            )}
                        </div>

                        {/* Template picker dropdown */}
                        {showTemplatePicker && templates.length > 0 && (
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderColor: '#d4c200' }} className="border rounded p-2 flex flex-col gap-1">
                                {templates.map(t => (
                                    <div key={t.id} className="flex items-center justify-between gap-2 group">
                                        <button
                                            onClick={() => handleApplyTemplate(t)}
                                            style={{ color: '#555', fontSize: '11px' }}
                                            className="flex-1 text-left hover:text-black cursor-pointer truncate"
                                        >
                                            {t.name}
                                        </button>
                                        {!isReadOnly && (
                                            <button
                                                onClick={() => handleDeleteTemplate(t.id)}
                                                style={{ color: '#ccc', fontSize: '10px' }}
                                                className="opacity-0 group-hover:opacity-100 hover:text-red-500 cursor-pointer flex-shrink-0 transition-all"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Save template inline form */}
                        {showSaveTemplate && (
                            <div className="flex gap-2 items-center">
                                <input
                                    autoFocus
                                    value={templateNameInput}
                                    onChange={e => setTemplateNameInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplate(); if (e.key === 'Escape') setShowSaveTemplate(false) }}
                                    placeholder="Template name..."
                                    style={{ color: '#333', backgroundColor: 'rgba(255,255,255,0.5)', borderColor: '#d4c200', fontSize: '11px' }}
                                    className="flex-1 border rounded px-2 py-1 focus:outline-none placeholder-yellow-600/40"
                                />
                                <button onClick={handleSaveTemplate} style={{ backgroundColor: '#d4c200', color: '#fff', fontSize: '10px' }} className="px-2 py-1 rounded font-bold cursor-pointer hover:opacity-80">Save</button>
                            </div>
                        )}

                        {/* Due date + Priority row */}
                        <div className="flex gap-3 flex-wrap items-center">
                            <div className="flex flex-col gap-1">
                                <label style={{ color: '#a89800', fontSize: '9px', letterSpacing: '0.1em' }} className="uppercase font-bold">Due date</label>
                                <input
                                    type="date"
                                    disabled={isReadOnly}
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    style={{ color: '#333', backgroundColor: 'rgba(255,255,255,0.5)', borderColor: '#d4c200', fontSize: '12px' }}
                                    className="border rounded px-2 py-1 focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label style={{ color: '#a89800', fontSize: '9px', letterSpacing: '0.1em' }} className="uppercase font-bold">Priority</label>
                                <div className="flex gap-1.5">
                                    {PRIORITY_OPTS.map(opt => (
                                        <button
                                            key={opt.value}
                                            disabled={isReadOnly}
                                            onClick={() => setPriority(priority === opt.value ? null : opt.value)}
                                            style={{
                                                borderColor: opt.color,
                                                backgroundColor: priority === opt.value ? opt.color : 'transparent',
                                                color: priority === opt.value ? '#fff' : opt.color,
                                                fontSize: '9px',
                                            }}
                                            className="uppercase tracking-widest px-2 py-1 rounded-full border cursor-pointer transition-all duration-150 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Section */}
                        <div className="flex gap-2 flex-wrap">
                            {sections.map((s, i) => {
                                const color = getSectionColor(s.name, i)
                                const isActive = s.id === sectionId
                                return (
                                    <button
                                        key={s.id}
                                        disabled={isReadOnly}
                                        onClick={() => setSectionId(s.id)}
                                        style={{ borderColor: color, backgroundColor: isActive ? color : 'transparent', color: isActive ? '#fff' : color, fontSize: '10px' }}
                                        className="uppercase tracking-widest px-3 py-2 rounded-full border cursor-pointer transition-all duration-150 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
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
                                            disabled={isReadOnly}
                                            onClick={() => toggleTag(tag.id)}
                                            style={{ borderColor: tag.color, backgroundColor: isActive ? tag.color : 'transparent', color: isActive ? '#fff' : tag.color, fontSize: '10px' }}
                                            className="uppercase tracking-widest px-2.5 py-1.5 rounded-full border cursor-pointer transition-all duration-150 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
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
                                    disabled={isReadOnly}
                                    onClick={() => setAssignedUserId(null)}
                                    style={{ fontSize: '10px', borderColor: '#bbb', color: assignedUserId === null ? '#fff' : '#888', backgroundColor: assignedUserId === null ? '#888' : 'transparent' }}
                                    className="uppercase tracking-widest px-3 py-2 rounded-full border cursor-pointer transition-all duration-150 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Unassigned
                                </button>
                                {users.map((u) => {
                                    const color = AVATAR_COLORS[u.id % AVATAR_COLORS.length]
                                    const isActive = assignedUserId === u.id
                                    return (
                                        <button
                                            key={u.id}
                                            disabled={isReadOnly}
                                            onClick={() => setAssignedUserId(isActive ? null : u.id)}
                                            style={{ borderColor: color, backgroundColor: isActive ? color : 'transparent', color: isActive ? '#fff' : color, fontSize: '10px' }}
                                            className="uppercase tracking-widest px-3 py-2 rounded-full border cursor-pointer transition-all duration-150 font-bold flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {initials(u.name)} {u.name.split(' ')[0]}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Save */}
                        {!isReadOnly && (
                            <button
                                onClick={handleSubmit}
                                style={{ backgroundColor: currentColor, color: '#fff', fontFamily: 'monospace', letterSpacing: '0.1em', fontSize: '11px' }}
                                className="w-full py-2.5 rounded font-bold uppercase cursor-pointer hover:opacity-90 transition-opacity duration-150 mt-2 flex-shrink-0"
                            >
                                {isNew ? 'Pin it' : 'Save'}
                            </button>
                        )}
                    </>
                )}

                {/* Checklist tab */}
                {!isNew && activeTab === 'checklist' && (
                    <div className="flex flex-col gap-2">
                        {checklistItems.length === 0 && (
                            <p style={{ color: '#999', fontSize: '12px' }} className="text-center py-4">No items yet. Add one below.</p>
                        )}
                        {checklistItems.map(item => (
                            <div key={item.id} className="flex items-center gap-2 group">
                                <input
                                    type="checkbox"
                                    checked={item.is_done}
                                    disabled={isReadOnly}
                                    onChange={() => handleToggleItem(item)}
                                    className="cursor-pointer accent-yellow-600 w-4 h-4 flex-shrink-0 disabled:cursor-not-allowed"
                                />
                                <span
                                    style={{
                                        color: item.is_done ? '#999' : '#222',
                                        textDecoration: item.is_done ? 'line-through' : 'none',
                                        fontSize: '13px',
                                        flex: 1,
                                    }}
                                >
                                    {item.text}
                                </span>
                                {!isReadOnly && (
                                    <button
                                        onClick={() => handleDeleteItem(item)}
                                        style={{ color: '#ccc', fontSize: '10px' }}
                                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 cursor-pointer transition-all"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Progress bar */}
                        {checklistItems.length > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-yellow-200 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${(doneCount / checklistItems.length) * 100}%`, backgroundColor: '#22c55e' }}
                                        className="h-full rounded-full transition-all duration-300"
                                    />
                                </div>
                                <span style={{ fontSize: '10px', color: '#999' }}>{doneCount}/{checklistItems.length}</span>
                            </div>
                        )}

                        {/* Add item */}
                        {!isReadOnly && (
                            <div className="flex gap-2 mt-2">
                                <input
                                    value={newChecklistText}
                                    onChange={e => setNewChecklistText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddChecklistItem() }}
                                    placeholder="Add item..."
                                    style={{ color: '#333', backgroundColor: 'rgba(255,255,255,0.5)', borderColor: '#d4c200', fontSize: '12px' }}
                                    className="flex-1 border rounded px-2 py-1.5 focus:outline-none placeholder-yellow-600/40"
                                />
                                <button
                                    onClick={handleAddChecklistItem}
                                    style={{ backgroundColor: '#d4c200', color: '#fff', fontSize: '11px' }}
                                    className="px-3 py-1.5 rounded font-bold cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    +
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Subtasks tab */}
                {!isNew && activeTab === 'subtasks' && (
                    <div className="flex flex-col gap-2">
                        {loadingSubtasks && <p style={{ color: '#999', fontSize: '12px' }} className="text-center py-4">Loading...</p>}
                        {!loadingSubtasks && subtasks.length === 0 && (
                            <p style={{ color: '#999', fontSize: '12px' }} className="text-center py-4">No subtasks yet.</p>
                        )}
                        {subtasks.map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={s.is_done}
                                    disabled={isReadOnly}
                                    onChange={() => handleToggleSubtask(s)}
                                    className="cursor-pointer accent-yellow-600 w-4 h-4 flex-shrink-0 disabled:cursor-not-allowed"
                                />
                                <span style={{ color: s.is_done ? '#999' : '#222', textDecoration: s.is_done ? 'line-through' : 'none', fontSize: '13px', flex: 1 }}>
                                    {s.name}
                                </span>
                            </div>
                        ))}

                        {/* Progress bar */}
                        {subtasks.length > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-yellow-200 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${(doneSubtasks / subtasks.length) * 100}%`, backgroundColor: '#22c55e' }}
                                        className="h-full rounded-full transition-all duration-300"
                                    />
                                </div>
                                <span style={{ fontSize: '10px', color: '#999' }}>{doneSubtasks}/{subtasks.length}</span>
                            </div>
                        )}

                        {/* Add subtask */}
                        {!isReadOnly && (
                            <div className="flex gap-2 mt-2">
                                <input
                                    value={newSubtaskName}
                                    onChange={e => setNewSubtaskName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask() }}
                                    placeholder="Add subtask..."
                                    style={{ color: '#333', backgroundColor: 'rgba(255,255,255,0.5)', borderColor: '#d4c200', fontSize: '12px' }}
                                    className="flex-1 border rounded px-2 py-1.5 focus:outline-none placeholder-yellow-600/40"
                                />
                                <button
                                    onClick={handleAddSubtask}
                                    style={{ backgroundColor: '#d4c200', color: '#fff', fontSize: '11px' }}
                                    className="px-3 py-1.5 rounded font-bold cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    +
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Comments tab */}
                {!isNew && activeTab === 'comments' && (
                    <div className="flex flex-col gap-3">
                        {/* Compose */}
                        {!isDemo && (
                            <div className="flex flex-col gap-2">
                                <div className="relative">
                                    <textarea
                                        ref={commentInputRef}
                                        value={newComment}
                                        onChange={e => handleCommentChange(e.target.value)}
                                        placeholder="Write a comment... (type @ to mention)"
                                        rows={2}
                                        style={{ color: '#333', backgroundColor: 'rgba(255,255,255,0.5)', borderColor: '#d4c200', fontSize: '12px' }}
                                        className="w-full border rounded px-3 py-2 focus:outline-none resize-none placeholder-yellow-600/40"
                                    />
                                    {/* @mention dropdown — positioned below the textarea */}
                                    {mentionUsers.length > 0 && (
                                        <div style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#d4c200', zIndex: 10 }} className="absolute top-full left-0 right-0 border rounded shadow-lg flex flex-col">
                                            {mentionUsers.map(u => (
                                                <button
                                                    key={u.id}
                                                    onMouseDown={e => { e.preventDefault(); handlePickMention(u); }}
                                                    style={{ fontSize: '12px', color: '#333' }}
                                                    className="px-3 py-2 text-left hover:bg-yellow-100 cursor-pointer transition-colors"
                                                >
                                                    @{u.name.split(' ')[0]} <span style={{ color: '#999', fontSize: '10px' }}>{u.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    style={{ backgroundColor: '#d4c200', color: '#fff', fontSize: '11px' }}
                                    className="self-end px-4 py-1.5 rounded font-bold cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                                >
                                    Post
                                </button>
                            </div>
                        )}
                        {isDemo && (
                            <p style={{ color: '#999', fontSize: '12px' }} className="text-center py-2">Comments are not available in demo mode.</p>
                        )}

                        {/* Thread */}
                        {loadingComments && <p style={{ color: '#999', fontSize: '12px' }} className="text-center">Loading...</p>}
                        {comments.map(comment => (
                            <div key={comment.id} className="flex flex-col gap-0.5 group">
                                <div className="flex items-center gap-2">
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>{comment.user?.name}</span>
                                    <span style={{ fontSize: '10px', color: '#aaa' }}>
                                        {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        style={{ color: '#ccc', fontSize: '10px' }}
                                        className="ml-auto opacity-0 group-hover:opacity-100 hover:text-red-500 cursor-pointer transition-all"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <p style={{ fontSize: '12px', color: '#333', lineHeight: '1.4' }}>
                                    {comment.body.split(/(@\w+)/g).map((part, i) =>
                                        /^@\w+$/.test(part)
                                            ? <span key={i} style={{ color: '#a07800', fontWeight: 'bold' }}>{part}</span>
                                            : part
                                    )}
                                </p>
                                <div style={{ borderColor: '#e6d800', opacity: 0.3 }} className="border-b mt-1"/>
                            </div>
                        ))}
                        {!loadingComments && !isDemo && comments.length === 0 && (
                            <p style={{ color: '#999', fontSize: '12px' }} className="text-center py-2">No comments yet.</p>
                        )}
                    </div>
                )}
            </div>

            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 20px 20px', borderColor: 'transparent transparent rgba(0,0,0,0.15) transparent' }}/>
        </div>
    )
}

export default CardEdit
