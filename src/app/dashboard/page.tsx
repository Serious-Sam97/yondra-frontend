'use client'

import Modal from "@/components/shared/Modal";
import { Card } from "@/components/ui/Card"
import ProjectEdit from "@/components/ui/ProjectEdit";
import { fetchBoards, fetchUser } from "@/lib/auth";
import { createBoard } from "@/lib/api";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";

export default function DashboardPage () {
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([])
    const [modalIsVisibile, setModalIsVisible] = useState(false)
    const [projectSelected, setProjectSelected] = useState(null)
    const [editMode, setEditMode] = useState(false)

    const goToProject = (projectId: number) => {
        router.push(`/boards/${projectId}`)
    }

    const handleSubmitProject = async (project: any) => {
        if (project.id !== null) {
            setProjects(projects.map(p => p.id === project.id ? project : p))
        } else {
            const saved = await createBoard({ name: project.name, description: project.description });
            setProjects(prev => [...prev, saved]);
        }

        setModalIsVisible(false)
        setProjectSelected(null)
    }

    useEffect(() => {
        const fetchData = async () => {
            fetchUser();
            const boards = await fetchBoards();
            if (boards) setProjects(boards);
        }

        fetchData();
    }, []);

    const handleOpenCard = (project: any) => {
        if (editMode) {
            setProjectSelected(project)
            setModalIsVisible(true)
            return
        }
        goToProject(project.id)
    }

    return (
        <div className="mx-[20vw]">
            <p className="text-4xl mt-2 text-center">Hello Samir</p>
            
            <div className="mt-2">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center">
                        <p className="text-lg text-yondra-text pr-2">Your Boards:</p>
                        <button 
                            onClick={() => setEditMode(!editMode)}
                            type="button"
                            className={`${editMode ? 'bg-white hover:bg-gray-200' : 'bg-sky-500 hover:bg-sky-700'} rounded-lg p-2 cursor-pointer focus:ring-amber-900 focus:ring-2 transition-colors duration-200`}
                        >
                            <p className="text-black">{editMode ? 'Normal Mode' : 'Edit Mode'}</p>
                        </button>
                    </div>
                    <button onClick={() => setModalIsVisible(true)} type="button" className="bg-amber-700 hover:bg-amber-800 rounded-lg p-2 cursor-pointer focus:ring-amber-900 focus:ring-2 transition-colors duration-200">
                        <p className="text-white">Create Board</p>
                    </button>
                </div>
                <div className="bg-yondra-surface h-40 rounded flex px-5 space-x-3">
                    {
                        projects.map(project => (
                            <div key={`project-${project.id}`} className="flex" onClick={() => handleOpenCard(project)}>
                                <Card
                                    id={project.id}
                                    name={project.name}
                                    description={project.description}
                                    color="sky"
                                    section_id={0}
                                />
                            </div>
                        ))
                    }
                </div>
            </div>
            {
                modalIsVisibile && (
                    <Modal>
                        <div className="bg-sky-300 p-5 rounded-lg w-[60%] h-[60%]">
                            <ProjectEdit cancel={() => setModalIsVisible(false)} submit={handleSubmitProject} project={projectSelected}/>
                        </div>
                    </Modal>
                )
            }
        </div>
    )
}
