'use client'

import { Card } from "@/components/ui/Card"
import { useRouter } from 'next/navigation';

export default function DashboardPage () {
    const router = useRouter();
    const projects = [
        {
            id: 'demo',
            name: 'Testing Board',
            description: 'This is a example board',
        },
    ]

    const goToProject = (projectId: number|string) => {
        router.push(`/boards/${projectId}`)
    }

    return (
        <div className="mx-[20vw]">
            <p className="text-4xl mt-2 text-center">Hello Samir</p>
            
            <div className="mt-2">
                <p className="text-lg text-yondra-text">Your Boards:</p>
                <div className="bg-yondra-surface h-40 rounded flex px-5 space-x-3">
                    {
                        projects.map(project => (
                            <div key={`project-${project.id}`} className="flex" onClick={() => goToProject(project.id)}>
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
        </div>
    )
}
