import { useEffect, useState } from "react"

interface ProjectEditProps {
    cancel: () => void
    submit: (project: any) => void
    onDelete?: () => void
    project?: any
}

const ProjectEdit: React.FC<ProjectEditProps> = ({cancel, submit, onDelete, project}) => {
    const [id, setId] = useState<number | null>(null)
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
            <div className="flex flex-col justify-between h-full border-2 border-gray-500 p-2 rounded-lg">
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <p className="text-black text-xl font-bold">Delete "{name}"?</p>
                    <p className="text-gray-600 text-sm">This action cannot be undone. All sections and cards will be permanently deleted.</p>
                </div>
                <div className="flex justify-between">
                    <button onClick={() => setConfirmDelete(false)} type="button" className="text-black p-2 rounded-lg bg-white hover:bg-gray-300 cursor-pointer">Go back</button>
                    <button onClick={onDelete} type="button" className="text-white p-2 rounded-lg bg-red-600 hover:bg-red-700 cursor-pointer">Yes, delete</button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col justify-between h-full border-2 border-gray-500 p-2 rounded-lg">
            <div>
                <div className="flex flex-col mb-4">
                    <label className="text-gray-500 text-sm">Project Title</label>
                    <input type="Text" placeholder="Project Name..." className="text-black p-2 rounded focus:ring-2 focus:ring-sky-600 focus:outline-none" value={name} onChange={(e) => setName(e.target.value)}/>
                </div>
                <div className="flex flex-col">
                    <label className="text-gray-500 text-sm">Description</label>
                    <textarea placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="focus:ring-2 focus:ring-sky-600 rounded focus:outline-none text-black p-2"/>
                </div>
            </div>

            <div className="flex justify-between">
                <button onClick={cancel} type="button" className="text-black p-2 rounded-lg bg-white hover:bg-gray-300 cursor-pointer">Cancel</button>
                <div className="flex gap-2">
                    {onDelete && (
                        <button onClick={() => setConfirmDelete(true)} type="button" className="text-white p-2 rounded-lg bg-red-600 hover:bg-red-700 cursor-pointer">Delete</button>
                    )}
                    <button onClick={handleSubmit} type="button" className="text-white p-2 rounded-lg bg-sky-700 hover:bg-sky-800 cursor-pointer">Submit</button>
                </div>
            </div>
        </div>
    )
}

export default ProjectEdit