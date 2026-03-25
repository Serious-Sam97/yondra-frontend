'use client'

import { Board } from "@/components/layout/Board"
import { BoardInterface } from "@/interfaces/BoardInterface"
import { fetchBoard } from "@/lib/api";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STRIPE_COLORS = ['#4CAF50', '#FFC107', '#FF9800', '#F44336', '#7B1FA2', '#1976D2'];

type Params = { id: string };

export default function BoardPage ({ params }: { params: Promise<Params> }) {
    const { id } = use(params);
    const router = useRouter();

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
        <div className="min-h-screen px-8 py-8">
            {/* Rainbow stripe */}
            <div className="flex gap-1 mb-6">
                {STRIPE_COLORS.map(c => (
                    <div key={c} style={{ backgroundColor: c }} className="h-1 flex-1 rounded-full"/>
                ))}
            </div>

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300 mb-3 flex items-center gap-1 cursor-pointer transition-colors duration-150"
                    >
                        ← Back to boards
                    </button>
                    <p className="text-4xl font-bold text-white">{board.name || '...'}</p>
                    {board.description && (
                        <p className="text-gray-500 mt-1">{board.description}</p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-gray-600">Press</p>
                    <kbd className="text-xs bg-gray-800 border border-gray-700 text-amber-400 px-2 py-1 rounded font-mono">C</kbd>
                    <p className="text-xs uppercase tracking-widest text-gray-600">to add a ticket</p>
                </div>
            </div>

            {/* Board */}
            <Board
                id={board.id}
                name={board.name}
                description={board.description}
                cards={board.cards}
                sections={board.sections}
                size="75"
            />
        </div>
    )
}
