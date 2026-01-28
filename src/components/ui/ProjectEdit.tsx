import { useEffect, useState } from "react"

interface ProjectEditProps {
    cancel: () => void
    submit: (project: any) => void
    project?: any
}

const ProjectEdit: React.FC<ProjectEditProps> = ({cancel, submit, project}) => {
    const [id, setId] = useState<number | null>(null)
    const [name, setName] = useState<string>('')
    const [description, setDescription] = useState<string>('')

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
                <button onClick={handleSubmit} type="button" className="text-white p-2 rounded-lg bg-sky-700 hover:bg-sky-800 cursor-pointer">Submit</button>
            </div>
        </div>
    )
}

export default ProjectEdit