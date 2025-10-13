'use client'

import { Board } from "@/components/layout/Board"
import { BoardInterface } from "@/interfaces/BoardInterface"

interface Props {
    params: {id: string}
}

export default function BoardPage ({ params }: Props) {
    const { id } = params;

    const board: BoardInterface = {
        id: 1,
        name: 'Testing Board',
        description: 'This is a example board',
    }

    return (
        <div className="w-[100dvw] flex justify-center">
            <div>
                <div className="mb-5 mt-2">
                    <p className="text-4xl text-yondra-text font-bold">{board.name}</p>
                    <p className="text-lg">{board.description}</p>
                </div>
                <Board id={board.id} name={board.name} description={board.description} size="75"/>
            </div>
        </div>
    )
}