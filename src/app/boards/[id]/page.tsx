'use client'

import { Board } from "@/components/layout/Board"
import ShareModal from "@/components/ui/ShareModal";
import { BoardInterface, SharedUser } from "@/interfaces/BoardInterface"
import { fetchBoard } from "@/lib/api";
import { loadDemoBoardData, loadDemoBoards } from "@/lib/demoStorage";
import { fetchUser } from "@/lib/auth";
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
        user_id: undefined,
        owner: undefined,
        shared_with: [],
    });
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [shareOpen, setShareOpen] = useState(false);

    const isDemo = id === 'demo' || id.startsWith('demo-');
    const isOwner = board.user_id === currentUserId;

    const boardUsers = isDemo ? [] : [
        board.owner,
        ...(board.shared_with ?? []),
    ].filter((u): u is NonNullable<typeof u> => !!u);

    useEffect(() => {
        if (isDemo) {
            const boards = loadDemoBoards();
            const boardMeta = boards.find(b => b.id === id);
            const demo = loadDemoBoardData(id);
            setBoard({
                id: 0,
                name: boardMeta?.name ?? 'Demo Board',
                description: boardMeta?.description ?? 'Try it out — everything is saved in your browser.',
                sections: demo.sections,
                cards: demo.cards,
                shared_with: [],
            });
            return;
        }

        Promise.all([fetchBoard(Number(id)), fetchUser()]).then(([data, user]) => {
            setBoard({
                id: data.id,
                name: data.name,
                description: data.description ?? '',
                sections: data.sections ?? [],
                cards: data.cards ?? [],
                user_id: data.user_id,
                owner: data.owner,
                shared_with: data.shared_with ?? [],
            });
            setCurrentUserId(user?.id ?? null);
        });
    }, [id])

    return (
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            {/* Rainbow stripe */}
            <div className="flex gap-1 mb-6">
                {STRIPE_COLORS.map(c => (
                    <div key={c} style={{ backgroundColor: c }} className="h-1 flex-1 rounded-full"/>
                ))}
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6 md:mb-8 flex-wrap">
                <div className="min-w-0">
                    <button
                        onClick={() => router.push(isDemo ? '/demo' : '/dashboard')}
                        className="text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300 mb-3 flex items-center gap-1 cursor-pointer transition-colors duration-150"
                    >
                        ← Back to boards
                    </button>
                    <p className="text-2xl md:text-4xl font-bold text-white truncate">{board.name || '...'}</p>
                    {board.description && (
                        <p className="text-gray-500 mt-1 text-sm">{board.description}</p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    {isOwner && !isDemo && (
                        <button
                            onClick={() => setShareOpen(true)}
                            className="text-xs uppercase tracking-widest px-3 py-1.5 rounded border border-gray-600 text-gray-400 hover:border-amber-400 hover:text-amber-400 cursor-pointer transition-all duration-200"
                        >
                            Share
                        </button>
                    )}
                    <div className="text-right hidden md:block">
                        <p className="text-xs uppercase tracking-widest text-gray-600">Press</p>
                        <kbd className="text-xs bg-gray-800 border border-gray-700 text-amber-400 px-2 py-1 rounded font-mono">C</kbd>
                        <p className="text-xs uppercase tracking-widest text-gray-600">to add a ticket</p>
                    </div>
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
                isDemo={isDemo}
                demoId={id}
                boardUsers={boardUsers}
            />

            {shareOpen && (
                <ShareModal
                    boardId={board.id}
                    sharedWith={board.shared_with ?? []}
                    onClose={() => setShareOpen(false)}
                    onUpdate={(users: SharedUser[]) => setBoard(b => ({ ...b, shared_with: users }))}
                />
            )}
        </div>
    )
}
