'use client'

import { useState } from 'react'
import { ProjectBoard, ProjectInterface } from '@/interfaces/ProjectInterface'

// Payload produced by the board create/edit form. `id` is only set in edit mode.
export interface BoardFormData {
    id?: number;
    name: string;
    description: string;
    project_id: number;
}

// Board create/edit form. Shared by the project page (new + edit, with project-move)
// and the board page header (settings). The project-move <select> only appears when
// more than one owned project is passed.
export function BoardFormModal({ board, projectId, projectColor, ownedProjects, onSave, onDelete, onClose }: {
    board: ProjectBoard | null; projectId: number; projectColor: string; ownedProjects: ProjectInterface[];
    onSave: (d: BoardFormData) => void; onDelete?: () => void; onClose: () => void;
}) {
    const [name, setName]               = useState(board?.name ?? '');
    const [description, setDescription] = useState(board?.description ?? '');
    const [targetProjectId, setTargetProjectId] = useState<number>(projectId);
    const [loading, setLoading]         = useState(false);

    const isNew = !board;
    const targetProject = ownedProjects.find(p => p.id === targetProjectId);
    const accentColor = targetProject?.color ?? projectColor;
    const moved = !isNew && targetProjectId !== projectId;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        await onSave({ id: board?.id, name: name.trim(), description: description.trim() || '', project_id: targetProjectId });
        setLoading(false);
    }

    return (
        <div className="aero-menu rounded-2xl p-6 w-[90vw] max-w-md flex flex-col gap-5 relative">
            <span className="cf-screw" style={{ position: 'absolute', top: 8, left: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', top: 8, right: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', bottom: 8, left: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', bottom: 8, right: 8 }} />
            <div style={{ borderBottom: '1px solid var(--cf-edge, #4a463f)' }} className="pb-3 flex items-center gap-2">
                <span className="cf-led" style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
                <p style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-[0.25em] font-bold">{isNew ? 'New Board' : 'Board Settings'}</p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-widest font-bold">Name</label>
                    <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Board name…"
                        className="glass-input cf-lcd text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                    <label style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-widest font-bold">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional…" rows={2}
                        className="glass-input cf-lcd text-sm resize-none" />
                </div>
                {ownedProjects.length > 1 && (
                    <div className="flex flex-col gap-1">
                        <label style={{ fontSize: '10px', color: 'var(--cf-text-muted, #a39d8c)' }} className="cf-label uppercase tracking-widest font-bold">Project</label>
                        <div className="flex items-center gap-2">
                            <span className="cf-led flex-shrink-0" style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
                            <select value={targetProjectId} onChange={e => setTargetProjectId(Number(e.target.value))}
                                style={{ fontSize: '12px' }}
                                className="glass-input cf-lcd flex-1 cursor-pointer">
                                {ownedProjects.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                            </select>
                        </div>
                        {moved && <p style={{ fontSize: '9px', color: 'var(--cf-amber, #ffb000)' }} className="cf-mono uppercase tracking-widest">↳ Will move to "{targetProject?.name}"</p>}
                    </div>
                )}
                <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--cf-edge, #4a463f)' }}>
                    {onDelete ? (
                        <button type="button" onClick={onDelete}
                            className="aero-btn aero-btn--magenta uppercase tracking-widest font-bold px-4 py-1.5 text-[10px]">Delete</button>
                    ) : <div />}
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="aero-btn aero-btn--ghost uppercase tracking-widest font-bold px-4 py-1.5 text-[10px]">Cancel</button>
                        <button type="submit" disabled={loading || !name.trim()}
                            className="aero-btn aero-btn--cyan uppercase tracking-widest font-bold px-5 py-1.5 text-[10px]">
                            {loading ? '…' : moved ? 'Move & Save' : 'Save'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
