import { useEffect, useState } from "react"

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
            <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center gap-3 py-4">
                    <p className="text-3xl">⚠</p>
                    <p className="text-white text-lg font-bold">Delete "{name}"?</p>
                    <p className="text-gray-500 text-sm">This action cannot be undone. All sections and cards will be permanently deleted.</p>
                </div>
                <div className="flex justify-between">
                    <button onClick={() => setConfirmDelete(false)} type="button" className="text-xs uppercase tracking-widest text-gray-400 hover:text-white border border-gray-700 hover:border-gray-400 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200">
                        Go back
                    </button>
                    <button onClick={onDelete} type="button" className="text-xs uppercase tracking-widest font-bold text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200">
                        Yes, delete
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-widest text-gray-500">Board Name</label>
                <input
                    type="text"
                    placeholder="My awesome board..."
                    className="bg-gray-800 border border-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-gray-600"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-widest text-gray-500">Description</label>
                <textarea
                    placeholder="What's this board about..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="bg-gray-800 border border-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-gray-600 resize-none"
                />
            </div>

            <div className="flex justify-between items-center pt-2">
                <button onClick={cancel} type="button" className="text-xs uppercase tracking-widest text-gray-400 hover:text-white border border-gray-700 hover:border-gray-400 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200">
                    Cancel
                </button>
                <div className="flex gap-2">
                    {onDelete && (
                        <button onClick={() => setConfirmDelete(true)} type="button" className="text-xs uppercase tracking-widest text-red-400 hover:text-white border border-red-800 hover:bg-red-600 hover:border-red-600 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200">
                            Delete
                        </button>
                    )}
                    <button onClick={handleSubmit} type="button" className="text-xs uppercase tracking-widest font-bold text-black bg-amber-400 hover:bg-amber-300 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200">
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProjectEdit