'use client'

import Modal from "@/components/shared/Modal";
import ProjectEdit from "@/components/ui/ProjectEdit";
import { loadDemoBoards, createDemoBoard, deleteDemoBoard, updateDemoBoard, DemoBoard } from "@/lib/demoStorage";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";

const STRIPE_COLORS = ['#4CAF50', '#FFC107', '#FF9800', '#F44336', '#7B1FA2', '#1976D2'];

export default function DemoPage () {
    const router = useRouter();
    const [boards, setBoards] = useState<DemoBoard[]>([]);
    const [modalIsVisible, setModalIsVisible] = useState(false);
    const [boardSelected, setBoardSelected] = useState<DemoBoard | null>(null);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        setBoards(loadDemoBoards());
    }, []);

    const handleOpenBoard = (board: DemoBoard) => {
        if (editMode) {
            setBoardSelected(board);
            setModalIsVisible(true);
            return;
        }
        router.push(`/boards/${board.id}`);
    };

    const handleSubmit = (project: any) => {
        if (project.id !== null) {
            updateDemoBoard(project.id, project.name, project.description);
            setBoards(prev => prev.map(b => b.id === project.id ? { ...b, name: project.name, description: project.description } : b));
        } else {
            const saved = createDemoBoard(project.name, project.description);
            setBoards(prev => [...prev, saved]);
        }
        setModalIsVisible(false);
        setBoardSelected(null);
    };

    const handleDelete = (id: string) => {
        deleteDemoBoard(id);
        setBoards(prev => prev.filter(b => b.id !== id));
        setModalIsVisible(false);
        setBoardSelected(null);
    };

    return (
        <div className="min-h-screen px-8 py-10 max-w-6xl mx-auto">

            {/* Header */}
            <div className="mb-10">
                <div className="flex gap-1 mb-2">
                    {STRIPE_COLORS.map(c => (
                        <div key={c} style={{ backgroundColor: c }} className="h-1 flex-1 rounded-full"/>
                    ))}
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-1">Demo mode</p>
                <p className="text-5xl font-bold tracking-tight">Your Boards</p>
                <p className="text-gray-500 text-sm mt-2">Everything is saved in your browser. <span className="text-amber-400 cursor-pointer hover:underline" onClick={() => router.push('/login')}>Sign up</span> to keep your data.</p>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <p className="text-xs uppercase tracking-widest text-gray-500">Demo Boards</p>
                    <button
                        onClick={() => setEditMode(!editMode)}
                        type="button"
                        className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded border cursor-pointer transition-all duration-200 ${
                            editMode
                                ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                                : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'
                        }`}
                    >
                        ⚙ Edit Mode
                    </button>
                </div>
                <button
                    onClick={() => { setBoardSelected(null); setModalIsVisible(true); }}
                    type="button"
                    className="text-xs uppercase tracking-widest px-4 py-2 rounded border-2 border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-black font-bold cursor-pointer transition-all duration-200"
                >
                    + New Board
                </button>
            </div>

            {/* Board Grid */}
            {boards.length === 0 ? (
                <div className="border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center py-24 text-center">
                    <p className="text-4xl mb-3">▦</p>
                    <p className="text-gray-500 text-sm uppercase tracking-widest">No boards yet</p>
                    <p className="text-gray-600 text-xs mt-1">Click <span className="text-amber-400">+ New Board</span> to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {boards.map((board, i) => {
                        const color = STRIPE_COLORS[i % STRIPE_COLORS.length];
                        return (
                            <div
                                key={board.id}
                                onClick={() => handleOpenBoard(board)}
                                className={`group relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-gray-600 hover:shadow-lg hover:-translate-y-0.5 ${editMode ? 'ring-2 ring-amber-400/40' : ''}`}
                            >
                                <div style={{ backgroundColor: color }} className="h-1.5 w-full"/>
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div
                                            style={{ backgroundColor: color + '22', color }}
                                            className="text-xs uppercase tracking-widest px-2 py-0.5 rounded font-bold"
                                        >
                                            Demo
                                        </div>
                                        {editMode && (
                                            <span className="text-xs text-amber-400 uppercase tracking-widest">edit</span>
                                        )}
                                    </div>
                                    <p className="text-white font-bold text-lg leading-tight mb-2">{board.name}</p>
                                    <p className="text-gray-500 text-sm line-clamp-2">{board.description}</p>
                                </div>
                                <div className="px-5 pb-4 flex items-center gap-2">
                                    <div style={{ backgroundColor: color }} className="w-1.5 h-1.5 rounded-full"/>
                                    <span className="text-xs text-gray-600 uppercase tracking-widest">Local</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {modalIsVisible && (
                <Modal>
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-[90%] max-w-lg">
                        <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">
                            {boardSelected ? 'Edit Board' : 'New Board'}
                        </p>
                        <ProjectEdit
                            cancel={() => { setModalIsVisible(false); setBoardSelected(null); }}
                            submit={handleSubmit}
                            onDelete={boardSelected ? () => handleDelete(boardSelected.id) : undefined}
                            project={boardSelected}
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
}
