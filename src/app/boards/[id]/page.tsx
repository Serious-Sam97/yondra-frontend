'use client'

import { Board } from "@/components/layout/Board"
import ShareModal from "@/components/ui/ShareModal";
import { BoardInterface, SharedUser } from "@/interfaces/BoardInterface"
import { fetchBoard } from "@/lib/api";
import { loadDemoBoardData, loadDemoBoards } from "@/lib/demoStorage";
import { fetchUser } from "@/lib/auth";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Status-LED indicator strip (cassette-futurism front panel)
const STRIPE_COLORS = ['var(--cf-phosphor)', 'var(--cf-amber)', 'var(--cf-cyan)', 'var(--cf-red)', 'var(--cf-amber)', 'var(--cf-phosphor)'];

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
    const currentUserShare = board.shared_with?.find(u => u.id === currentUserId);
    const isReadOnly = !isDemo && !isOwner && currentUserShare?.permission !== 'write';

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
                tags: demo.tags,
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
                tags: data.tags ?? [],
                user_id: data.user_id,
                project_id: data.project_id ?? null,
                owner: data.owner,
                shared_with: data.shared_with ?? [],
            });
            setCurrentUserId(user?.id ?? null);
        });
    }, [id])

    return (
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            {/* Status-LED indicator strip */}
            <div className="flex gap-1 mb-6">
                {STRIPE_COLORS.map((c, i) => (
                    <div key={i} style={{ background: c, boxShadow: `0 0 5px ${c}` }} className="h-1 flex-1 rounded-sm"/>
                ))}
            </div>

            {/* Header */}
            <div className="glass-panel flex items-start justify-between gap-4 mb-6 md:mb-8 flex-wrap p-5 md:p-6">
                <div className="min-w-0">
                    <button
                        onClick={() => router.push(isDemo ? '/demo' : board.project_id ? `/projects/${board.project_id}` : '/dashboard')}
                        className="btn-physical cf-mono text-xs uppercase tracking-widest mb-3 flex items-center gap-1 cursor-pointer transition-colors duration-150 hover:brightness-125"
                        style={{ color: 'var(--cf-text-muted)' }}
                    >
                        ← {isDemo ? 'Back to demo' : board.project_id ? 'Back to project' : 'Back to boards'}
                    </button>
                    <p className="chrome-text text-2xl md:text-4xl font-bold truncate">{board.name || '...'}</p>
                    {board.description && (
                        <p className="cf-mono mt-1 text-sm" style={{ color: 'var(--cf-text-muted)' }}>{board.description}</p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    {isOwner && !isDemo && (
                        <button
                            onClick={() => setShareOpen(true)}
                            className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest px-4 py-2 cursor-pointer"
                        >
                            Share
                        </button>
                    )}
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
                tags={board.tags ?? []}
                isReadOnly={isReadOnly}
                currentUserId={currentUserId ?? 0}
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
