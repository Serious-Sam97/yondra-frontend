import { useEffect, useState } from "react"
import Icon from "@/components/ui/Icon"
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons"

interface ProjectEditProps {
    cancel: () => void
    submit: (project: any) => void
    onDelete?: () => void
    project?: any
}

const ProjectEdit: React.FC<ProjectEditProps> = ({cancel, submit, onDelete, project}) => {
    const [id, setId] = useState<number | string | null>(null)
    const [name, setName] = useState<string>('')
    const [description, setDescription] = useState<string>('')
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (project !== null) {
            setId(project.id)
            setName(project.name)
            setDescription(project.description)
        }
    }, [])

    const handleSubmit = () => {
        submit({
            id,
            name,
            description
        })
    }

    if (confirmDelete) {
        return (
            <div className="aero-menu flex flex-col gap-6 rounded-2xl p-6 relative">
                <span className="cf-screw" style={{ position: 'absolute', top: 8, left: 8 }} />
                <span className="cf-screw" style={{ position: 'absolute', top: 8, right: 8 }} />
                <span className="cf-screw" style={{ position: 'absolute', bottom: 8, left: 8 }} />
                <span className="cf-screw" style={{ position: 'absolute', bottom: 8, right: 8 }} />
                <div className="flex flex-col items-center text-center gap-3 py-4">
                    <p className="text-3xl" style={{ color: 'var(--cf-amber, #ffb000)' }}><Icon icon={faTriangleExclamation} /></p>
                    <p className="cf-mono text-lg font-bold" style={{ color: 'var(--cf-text, #e8e4d6)' }}>Delete "{name}"?</p>
                    <p className="text-sm" style={{ color: 'var(--cf-text-muted, #a39d8c)' }}>This action cannot be undone. All sections and cards will be permanently deleted.</p>
                </div>
                <div className="flex justify-between">
                    <button onClick={() => setConfirmDelete(false)} type="button" className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest">
                        Go back
                    </button>
                    <button onClick={onDelete} type="button" className="aero-btn aero-btn--magenta text-xs uppercase tracking-widest font-bold">
                        Yes, delete
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="aero-menu flex flex-col gap-5 rounded-2xl p-6 relative">
            <span className="cf-screw" style={{ position: 'absolute', top: 8, left: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', top: 8, right: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', bottom: 8, left: 8 }} />
            <span className="cf-screw" style={{ position: 'absolute', bottom: 8, right: 8 }} />
            <div className="flex items-center gap-2 pb-1" style={{ borderBottom: '1px solid var(--cf-edge, #4a463f)' }}>
                <span className="cf-led" style={{ background: 'var(--cf-phosphor, #9aa67e)' }} />
                <p className="cf-label text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: 'var(--cf-text-muted, #a39d8c)' }}>Edit Board</p>
            </div>
            <div className="flex flex-col gap-1">
                <label className="cf-label text-xs uppercase tracking-widest" style={{ color: 'var(--cf-text-muted, #a39d8c)' }}>Board name</label>
                <input
                    type="text"
                    placeholder="My awesome board..."
                    className="glass-input cf-lcd"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div className="flex flex-col gap-1">
                <label className="cf-label text-xs uppercase tracking-widest" style={{ color: 'var(--cf-text-muted, #a39d8c)' }}>Description</label>
                <textarea
                    placeholder="What's this board about..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="glass-input cf-lcd resize-none"
                />
            </div>

            <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--cf-edge, #4a463f)' }}>
                <button onClick={cancel} type="button" className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest">
                    Cancel
                </button>
                <div className="flex gap-2">
                    {onDelete && (
                        <button onClick={() => setConfirmDelete(true)} type="button" className="aero-btn aero-btn--magenta text-xs uppercase tracking-widest">
                            Delete
                        </button>
                    )}
                    <button onClick={handleSubmit} type="button" className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold">
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProjectEdit