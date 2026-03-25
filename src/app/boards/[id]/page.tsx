'use client'

import { Board } from "@/components/layout/Board"
import { BoardInterface } from "@/interfaces/BoardInterface"
import { CardInterface } from "@/interfaces/CardInterface";
import { SectionInterface } from "@/interfaces/SectionInterface";
import { fetchBoard } from "@/lib/api";
import { use, useEffect, useMemo, useState } from "react";

type Params = { id: string };

export default function BoardPage ({ params }: { params: Promise<Params> }) {
    const { id } = use(params);

    const [board, setBoard] = useState<BoardInterface>({
        id: 0,
        name: '',
        description: '',
        cards: [],
        sections: [],
    });

    useEffect(() => {
        if (id === 'demo') return;

        fetchBoard(Number(id)).then((data) => {
            setBoard({
                id: data.id,
                name: data.name,
                description: data.description ?? '',
                sections: data.sections ?? [],
                cards: data.cards ?? [],
            });
        });
    }, [id])
    

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