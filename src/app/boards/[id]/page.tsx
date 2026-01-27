'use client'

import { Board } from "@/components/layout/Board"
import { BoardInterface } from "@/interfaces/BoardInterface"
import { CardInterface } from "@/interfaces/CardInterface";
import { SectionInterface } from "@/interfaces/SectionInterface";
import { use, useEffect, useMemo, useState } from "react";

type Params = { id: string };

export default function BoardPage ({ params }: { params: Promise<Params> }) {
    const { id } = use(params);

    const [board, setBoard] = useState<BoardInterface>({
        id: 1,
        name: 'Testing Board',
        description: 'This is a example board',
        cards: [],
        sections: [],
    });

    const demoSections: SectionInterface[] = useMemo(
        () => [
            {
                id: 1,
                name: 'To Do',
                cards: [],
            },
            {
                id: 2,
                name: 'In Progress',
                cards: [],
            },
            {
                id: 3,
                name: 'Done',
                cards: [],
            },
        ],
        []
    );
        
    const demoCards: CardInterface[] = useMemo(
        () => [
            {
                id: 1,
                section_id: 1,
                name: 'Card 012',
                description: 'Here is a description space'
            },
            {
                id: 2,
                section_id: 1,
                name: 'Card 013',
                description: 'Here is a description space'
            },
            {
                id: 3,
                section_id: 1,
                name: 'Card 014',
                description: 'Here is a description space'
            },
            {
                id: 4,
                section_id: 1,
                name: 'Card 015',
                description: 'Here is a description space'
            },
            {
                id: 5,
                section_id: 1,
                name: 'Card 016',
                description: 'Here is a description space'
            },
        ],
        []
    );

    useEffect(() => {
        if (id === 'demo') {
            setBoard(prev => ({
                ...prev,
                cards: demoCards,
                sections: demoSections,
            }))
            return;
        }

        setBoard(prev => ({
            ...prev,
            cards: [],
            sections: demoSections,
        }
        ))
    }, ['id'])
    

    return (
        <div className="min-w-[100dvw] flex justify-center">
            <div>
                <div className="mb-5 mt-2">
                    <p className="text-4xl text-yondra-text font-bold">{board.name}</p>
                    <p className="text-lg">{board.description}</p>
                </div>
                <Board id={board.id} name={board.name} description={board.description} cards={board.cards} sections={board.sections} size="75"/>
            </div>
        </div>
    )
}