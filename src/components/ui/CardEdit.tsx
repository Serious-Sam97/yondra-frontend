'use client'

import { useEffect, useRef, useState } from 'react'
import { playComplete } from '@/lib/sound'
import { hapticDone } from '@/lib/haptics'
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
import Icon from '@/components/ui/Icon'
import { faTrash } from '@fortawesome/free-solid-svg-icons'

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
    { value: 'low',    label: 'Low',    color: '#9aa67e' },
    { value: 'medium', label: 'Medium', color: '#ffb000' },
    { value: 'high',   label: 'High',   color: '#ff5a4d' },
]

function getSectionColor(name: string, index: number): string {
    return SECTION_COLORS[name] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
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
    const titleRef = useRef<HTMLTextAreaElement>(null)
    const descRef  = useRef<HTMLTextAreaElement>(null)
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
    const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 })

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
        if (updated.is_done) { playComplete(); hapticDone(); }
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
        if (!s.is_done) { playComplete(); hapticDone(); }
        setSubtasks(prev => prev.map(i => i.id === s.id ? { ...i, is_done: !i.is_done } : i))
        if (isDemo) {
            demoToggleSubtask(demoId, s.id)
        } else if (boardId && id) {
            updateSubtask(boardId, id, s.id, { is_done: !s.is_done }).catch(() => {})
        }
    }

    const doneCount = checklistItems.filter(i => i.is_done).length
    const doneSubtasks = subtasks.filter(s => s.is_done).length

    const tabs: Array<'details' | 'checklist' | 'subtasks' | 'comments'> = isNew
        ? []
        : ['details', 'checklist', 'subtasks', 'comments']

    // Measure tab button positions for sliding indicator
    useEffect(() => {
        const idx = tabs.indexOf(activeTab)
        const btn = tabRefs.current[idx]
        if (btn) setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth })
    }, [activeTab, tabs.length])

    return (
        <div
            className="aero-menu flex flex-col w-full min-h-[100svh] sm:min-h-0 sm:w-[95vw] sm:max-w-[480px] sm:h-auto sm:max-h-[90vh] relative"
        >
            {/* Glue strip */}
            <div
                style={{ borderColor: 'var(--cf-edge)' }}
                className="h-9 w-full flex items-center justify-between px-4 flex-shrink-0 border-b"
            >
                <div className="flex items-center gap-2">
                    <span className="cf-led" style={{ background: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)' }} />
                    <span className="chrome-text" style={{ fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.15em' }}>
                        {isNew ? 'NEW' : `#${String(id).padStart(4, '0')}`}
                    </span>
                    {!isNew && card?.created_at && (
                        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--cf-text-muted)' }}>
                            · {new Date(card.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    )}
                    {isReadOnly && (
                        <span style={{ fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--cf-amber)' }}>
                            · READ ONLY
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {!isNew && !isReadOnly && onDelete && (
                        <button onClick={onDelete} style={{ color: 'var(--cf-red)' }} className="text-xs hover:opacity-60 cursor-pointer transition-opacity" title="Archive card">
                            <Icon icon={faTrash} />
                        </button>
                    )}
                    <button onClick={goBack} className="text-sm cursor-pointer transition-colors leading-none" style={{ color: 'var(--cf-text-muted)' }}>
                        ✕
                    </button>
                </div>
            </div>

            {/* Tabs (only for existing cards) */}
            {!isNew && (
                <div className="relative flex border-b px-4 pt-2 gap-4 flex-shrink-0" style={{ borderColor: 'var(--cf-edge)' }}>
                    {tabs.map((tab, i) => {
                        const isActive = activeTab === tab
                        return (
                            <button
                                key={tab}
                                ref={el => { tabRefs.current[i] = el }}
                                onClick={() => setActiveTab(tab)}
                                style={{ color: isActive ? 'var(--cf-phosphor)' : 'var(--cf-text-muted)', fontSize: '10px' }}
                                className="cf-mono uppercase tracking-widest font-bold pb-2 cursor-pointer transition-colors flex items-center gap-1.5"
                            >
                                <span className="cf-led" style={{ width: 6, height: 6, background: isActive ? 'var(--cf-phosphor)' : 'var(--cf-edge)', boxShadow: isActive ? '0 0 6px var(--cf-phosphor)' : 'none' }} />
                                {tab === 'checklist' && checklistItems.length > 0 ? `checklist ${doneCount}/${checklistItems.length}` :
                                 tab === 'comments' && comments.length > 0 ? `comments ${comments.length}` :
                                 tab === 'subtasks' && subtasks.length > 0 ? `subtasks ${doneSubtasks}/${subtasks.length}` :
                                 tab}
                            </button>
                        )
                    })}
                    {/* Sliding indicator — springs between tabs */}
                    <div style={{
                        position: 'absolute',
                        bottom: -1,
                        left: tabIndicator.left,
                        width: tabIndicator.width,
                        height: 2,
                        backgroundColor: 'var(--cf-phosphor)',
                        borderRadius: 1,
                        boxShadow: '0 0 8px var(--cf-phosphor)',
                        transition: 'left 240ms cubic-bezier(0.34,1.56,0.64,1), width 240ms cubic-bezier(0.34,1.56,0.64,1)',
                    }} />
                </div>
            )}

            {/* Body */}
            <div className="flex flex-col sm:flex-1 px-6 pt-4 pb-6 gap-3 sm:overflow-y-auto">

                {/* Details tab (or always shown if new) */}
                {(isNew || activeTab === 'details') && (
                    <>
                        <textarea
                            ref={titleRef}
                            autoFocus
                            placeholder="What needs to be done?"
                            rows={2}
                            disabled={isReadOnly}
                            style={{ color: 'var(--cf-text)', caretColor: 'var(--cf-phosphor)' }}
                            className="w-full bg-transparent text-lg md:text-xl font-bold placeholder-white/40 focus:outline-none resize-none leading-tight disabled:opacity-70"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                titleRef.current?.animate(
                                    [{ filter: 'blur(1.4px)' }, { filter: 'blur(0)' }],
                                    { duration: 90, easing: 'ease-out' }
                                )
                            }}
                        />

                        <div style={{ borderColor: 'var(--cf-edge)' }} className="border-t"/>

                        <textarea
                            ref={descRef}
                            rows={3}
                            disabled={isReadOnly}
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value)
                                descRef.current?.animate(
                                    [{ filter: 'blur(1.2px)' }, { filter: 'blur(0)' }],
                                    { duration: 85, easing: 'ease-out' }
                                )
                            }}
                            placeholder="Add some notes..."
                            style={{ color: 'var(--cf-text)', caretColor: 'var(--cf-phosphor)' }}
                            className="w-full bg-transparent text-sm placeholder-white/35 focus:outline-none resize-none leading-relaxed disabled:opacity-70"
                        />

                        {/* Template buttons */}
                        <div className="flex gap-2 flex-wrap">
                            {templates.length > 0 && (
                                <button
                                    onClick={() => setShowTemplatePicker(v => !v)}
                                    style={{ fontSize: '9px' }}
                                    className="aero-pill uppercase tracking-widest px-2.5 py-1 cursor-pointer font-bold text-white/80 hover:text-white"
                                >
                                    From Template ▾
                                </button>
                            )}
                            {!isReadOnly && (
                                <button
                                    onClick={() => setShowSaveTemplate(v => !v)}
                                    style={{ fontSize: '9px' }}
                                    className="aero-pill uppercase tracking-widest px-2.5 py-1 cursor-pointer font-bold text-white/80 hover:text-white"
                                >
                                    Save as Template
                                </button>
                            )}
                        </div>

                        {/* Template picker dropdown */}
                        {showTemplatePicker && templates.length > 0 && (
                            <div style={{ background: '#1c1a16', borderColor: 'var(--cf-edge)' }} className="border rounded-lg p-2 flex flex-col gap-1">
                                {templates.map(t => (
                                    <div key={t.id} className="flex items-center justify-between gap-2 group">
                                        <button
                                            onClick={() => handleApplyTemplate(t)}
                                            style={{ fontSize: '11px', color: 'var(--cf-text-muted)' }}
                                            className="cf-mono flex-1 text-left hover:text-[var(--cf-phosphor)] cursor-pointer truncate"
                                        >
                                            {t.name}
                                        </button>
                                        {!isReadOnly && (
                                            <button
                                                onClick={() => handleDeleteTemplate(t.id)}
                                                style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }}
                                                className="opacity-0 group-hover:opacity-100 hover:text-[var(--cf-red)] cursor-pointer flex-shrink-0 transition-all"
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
                                    style={{ fontSize: '11px' }}
                                    className="glass-input flex-1 px-2 py-1"
                                />
                                <button onClick={handleSaveTemplate} style={{ fontSize: '10px' }} className="aero-btn aero-btn--cyan px-3 py-1 font-bold cursor-pointer">Save</button>
                            </div>
                        )}

                        {/* Due date + Priority row */}
                        <div className="flex gap-3 flex-wrap items-center">
                            <div className="flex flex-col gap-1">
                                <label style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--cf-text-muted)' }} className="cf-label uppercase font-bold">Due date</label>
                                <input
                                    type="date"
                                    disabled={isReadOnly}
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    style={{ fontSize: '12px' }}
                                    className="glass-input px-2 py-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--cf-text-muted)' }} className="cf-label uppercase font-bold">Priority</label>
                                <div className="flex gap-1.5">
                                    {PRIORITY_OPTS.map(opt => {
                                        const isActive = priority === opt.value
                                        return (
                                        <button
                                            key={opt.value}
                                            disabled={isReadOnly}
                                            onClick={() => setPriority(isActive ? null : opt.value)}
                                            style={{
                                                borderColor: opt.color,
                                                backgroundColor: isActive ? opt.color : '#1c1a16',
                                                color: isActive ? '#1c1a16' : opt.color,
                                                boxShadow: isActive ? `0 0 8px ${opt.color}` : 'none',
                                                fontSize: '9px',
                                            }}
                                            className="cf-mono uppercase tracking-widest px-2 py-1 rounded-sm border cursor-pointer font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                        >
                                            {opt.label}
                                        </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Section */}
                        <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--cf-text-muted)' }} className="cf-label uppercase font-bold">Section</label>
                            <div className="flex gap-2 flex-wrap">
                                {sections.map((s, i) => {
                                    const color = getSectionColor(s.name, i)
                                    const isActive = s.id === sectionId
                                    return (
                                        <button
                                            key={s.id}
                                            disabled={isReadOnly}
                                            onClick={() => setSectionId(s.id)}
                                            style={{ borderColor: color, backgroundColor: isActive ? color : '#1c1a16', color: isActive ? '#1c1a16' : color, boxShadow: isActive ? `0 0 8px ${color}` : 'none', fontSize: '10px' }}
                                            className="cf-mono uppercase tracking-widest px-3 py-1.5 rounded-sm border cursor-pointer font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                        >
                                            {s.name}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--cf-text-muted)' }} className="cf-label uppercase font-bold">Tags</label>
                                <div className="flex gap-1.5 flex-wrap">
                                    {tags.map(tag => {
                                        const isActive = selectedTagIds.includes(tag.id)
                                        return (
                                            <button
                                                key={tag.id}
                                                disabled={isReadOnly}
                                                onClick={() => toggleTag(tag.id)}
                                                style={{ borderColor: tag.color, backgroundColor: isActive ? tag.color : '#1c1a16', color: isActive ? '#1c1a16' : tag.color, boxShadow: isActive ? `0 0 8px ${tag.color}` : 'none', fontSize: '10px' }}
                                                className="cf-mono uppercase tracking-widest px-2.5 py-1 rounded-sm border cursor-pointer font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                            >
                                                {tag.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Assign user */}
                        {users.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--cf-text-muted)' }} className="cf-label uppercase font-bold">
                                    Assign{assignedUserId !== null ? ` · ${users.find(u => u.id === assignedUserId)?.name ?? ''}` : ''}
                                </label>
                                <div className="flex gap-2 flex-wrap items-center">
                                    <button
                                        disabled={isReadOnly}
                                        onClick={() => setAssignedUserId(null)}
                                        title="Unassigned"
                                        style={{ fontSize: '9px', borderColor: 'var(--cf-edge)', color: assignedUserId === null ? 'var(--cf-text)' : 'var(--cf-text-muted)', backgroundColor: assignedUserId === null ? 'var(--cf-graphite)' : '#1c1a16', width: 32, height: 32 }}
                                        className="cf-mono rounded-sm border-2 flex items-center justify-center font-bold cursor-pointer disabled:opacity-60 flex-shrink-0 transition-all"
                                    >
                                        —
                                    </button>
                                    {users.map((u) => {
                                        const color = AVATAR_COLORS[u.id % AVATAR_COLORS.length]
                                        const isActive = assignedUserId === u.id
                                        return (
                                            <button
                                                key={u.id}
                                                disabled={isReadOnly}
                                                onClick={() => setAssignedUserId(isActive ? null : u.id)}
                                                title={u.name}
                                                style={{ borderColor: color, backgroundColor: isActive ? color : '#1c1a16', color: isActive ? '#1c1a16' : color, boxShadow: isActive ? `0 0 8px ${color}` : 'none', fontSize: '10px', width: 32, height: 32 }}
                                                className="cf-mono rounded-sm border-2 flex items-center justify-center font-bold cursor-pointer disabled:opacity-60 flex-shrink-0 transition-all"
                                            >
                                                {initials(u.name)}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Save */}
                        {!isReadOnly && (
                            <button
                                onClick={handleSubmit}
                                style={{ fontFamily: 'monospace', letterSpacing: '0.1em', fontSize: '11px' }}
                                className="aero-btn aero-btn--cyan w-full py-2.5 font-bold uppercase cursor-pointer mt-2 flex-shrink-0"
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
                            <p style={{ fontSize: '12px', color: 'var(--cf-text-muted)' }} className="cf-mono text-center py-4">No items yet. Add one below.</p>
                        )}
                        {checklistItems.map(item => (
                            <div key={item.id} className="flex items-center gap-2 group">
                                {/* key changes on toggle → React remounts → check-pop replays */}
                                <div key={`${item.id}-${item.is_done}`} className="check-pop flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={item.is_done}
                                        disabled={isReadOnly}
                                        onChange={() => handleToggleItem(item)}
                                        className="cursor-pointer accent-[var(--cf-phosphor)] w-4 h-4 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <span
                                    style={{
                                        color: item.is_done ? 'var(--cf-text-muted)' : 'var(--cf-text)',
                                        textDecoration: item.is_done ? 'line-through' : 'none',
                                        fontSize: '13px',
                                        flex: 1,
                                        transition: 'color 200ms ease, text-decoration-color 200ms ease',
                                    }}
                                >
                                    {item.text}
                                </span>
                                {!isReadOnly && (
                                    <button
                                        onClick={() => handleDeleteItem(item)}
                                        style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }}
                                        className="opacity-0 group-hover:opacity-100 hover:text-[var(--cf-red)] cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Progress bar */}
                        {checklistItems.length > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--cf-screen)' }}>
                                    <div
                                        style={{ width: `${(doneCount / checklistItems.length) * 100}%`, backgroundColor: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)' }}
                                        className="h-full rounded-full transition-all duration-300"
                                    />
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }} className="cf-mono">{doneCount}/{checklistItems.length}</span>
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
                                    style={{ fontSize: '12px' }}
                                    className="glass-input flex-1 px-2 py-1.5"
                                />
                                <button
                                    onClick={handleAddChecklistItem}
                                    style={{ fontSize: '11px' }}
                                    className="aero-btn aero-btn--cyan px-3 py-1.5 font-bold cursor-pointer"
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
                        {loadingSubtasks && <p style={{ fontSize: '12px', color: 'var(--cf-text-muted)' }} className="cf-mono text-center py-4">Loading...</p>}
                        {!loadingSubtasks && subtasks.length === 0 && (
                            <p style={{ fontSize: '12px', color: 'var(--cf-text-muted)' }} className="cf-mono text-center py-4">No subtasks yet.</p>
                        )}
                        {subtasks.map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                                <div key={`${s.id}-${s.is_done}`} className="check-pop flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={s.is_done}
                                        disabled={isReadOnly}
                                        onChange={() => handleToggleSubtask(s)}
                                        className="cursor-pointer accent-[var(--cf-phosphor)] w-4 h-4 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <span style={{ color: s.is_done ? 'var(--cf-text-muted)' : 'var(--cf-text)', textDecoration: s.is_done ? 'line-through' : 'none', fontSize: '13px', flex: 1, transition: 'color 200ms ease' }}>
                                    {s.name}
                                </span>
                            </div>
                        ))}

                        {/* Progress bar */}
                        {subtasks.length > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--cf-screen)' }}>
                                    <div
                                        style={{ width: `${(doneSubtasks / subtasks.length) * 100}%`, backgroundColor: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)' }}
                                        className="h-full rounded-full transition-all duration-300"
                                    />
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }} className="cf-mono">{doneSubtasks}/{subtasks.length}</span>
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
                                    style={{ fontSize: '12px' }}
                                    className="glass-input flex-1 px-2 py-1.5"
                                />
                                <button
                                    onClick={handleAddSubtask}
                                    style={{ fontSize: '11px' }}
                                    className="aero-btn aero-btn--cyan px-3 py-1.5 font-bold cursor-pointer"
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
                                        style={{ fontSize: '12px' }}
                                        className="glass-input w-full px-3 py-2 resize-none"
                                    />
                                    {/* @mention dropdown — positioned below the textarea */}
                                    {mentionUsers.length > 0 && (
                                        <div style={{ background: '#1c1a16', borderColor: 'var(--cf-edge)', zIndex: 10 }} className="absolute top-full left-0 right-0 border rounded-lg shadow-lg flex flex-col">
                                            {mentionUsers.map(u => (
                                                <button
                                                    key={u.id}
                                                    onMouseDown={e => { e.preventDefault(); handlePickMention(u); }}
                                                    style={{ fontSize: '12px', color: 'var(--cf-text)' }}
                                                    className="cf-mono px-3 py-2 text-left hover:bg-white/5 cursor-pointer transition-colors"
                                                >
                                                    @{u.name.split(' ')[0]} <span style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }}>{u.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    style={{ fontSize: '11px' }}
                                    className="aero-btn aero-btn--cyan self-end px-4 py-1.5 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Post
                                </button>
                            </div>
                        )}
                        {isDemo && (
                            <p style={{ fontSize: '12px', color: 'var(--cf-text-muted)' }} className="cf-mono text-center py-2">Comments are not available in demo mode.</p>
                        )}

                        {/* Thread */}
                        {loadingComments && <p style={{ fontSize: '12px', color: 'var(--cf-text-muted)' }} className="cf-mono text-center">Loading...</p>}
                        {comments.map(comment => (
                            <div key={comment.id} className="flex flex-col gap-0.5 group">
                                <div className="flex items-center gap-2">
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--cf-text)' }}>{comment.user?.name}</span>
                                    <span style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }} className="cf-mono">
                                        {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }}
                                        className="ml-auto opacity-0 group-hover:opacity-100 hover:text-[var(--cf-red)] cursor-pointer transition-all"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <p style={{ fontSize: '12px', lineHeight: '1.4', color: 'var(--cf-text)' }}>
                                    {comment.body.split(/(@\w+)/g).map((part, i) =>
                                        /^@\w+$/.test(part)
                                            ? <span key={i} style={{ color: 'var(--cf-phosphor)', fontWeight: 'bold' }}>{part}</span>
                                            : part
                                    )}
                                </p>
                                <div style={{ borderColor: 'var(--cf-edge)' }} className="border-b mt-1"/>
                            </div>
                        ))}
                        {!loadingComments && !isDemo && comments.length === 0 && (
                            <p style={{ fontSize: '12px', color: 'var(--cf-text-muted)' }} className="cf-mono text-center py-2">No comments yet.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CardEdit
