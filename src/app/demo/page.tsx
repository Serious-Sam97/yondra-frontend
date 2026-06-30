'use client'

import Modal from "@/components/shared/Modal";
import ProjectEdit from "@/components/ui/ProjectEdit";
import { loadDemoBoards, createDemoBoard, deleteDemoBoard, updateDemoBoard, DemoBoard } from "@/lib/demoStorage";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";

const CF_LEDS = ['#9aa67e', '#ffb000', '#6fe0ff'];
const NEON_GLOW = ['neon-glow-cyan', 'neon-glow-magenta', 'neon-glow-lime'];

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
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-10 max-w-6xl mx-auto">

            {/* Header */}
            <div className="mb-10 glass-panel relative px-5 py-5">
                <span className="cf-screw" style={{ position: 'absolute', top: 8, left: 8 }} />
                <span className="cf-screw" style={{ position: 'absolute', top: 8, right: 8 }} />
                <div className="flex gap-2 mb-3">
                    {CF_LEDS.map(c => (
                        <span key={c} className="cf-led" style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}` }} />
                    ))}
                    <span className="cf-label" style={{ color: 'var(--cf-text-muted)' }}>PWR · LINK · DISK</span>
                </div>
                <p className="cf-label text-xs uppercase tracking-[0.3em] mb-1" style={{ color: 'var(--cf-amber)' }}>Demo mode</p>
                <p className="chrome-text cf-mono text-3xl md:text-5xl font-bold tracking-tight">YOUR BOARDS</p>
                <p className="text-sm mt-2" style={{ color: 'var(--cf-text-muted)' }}>Everything is saved in your browser. <span className="cf-mono cursor-pointer hover:underline" style={{ color: 'var(--cf-phosphor)' }} onClick={() => router.push('/login')}>Sign up</span> to keep your data.</p>
            </div>

            {/* Toolbar */}
            <div className="glass-panel flex justify-between items-center mb-6 gap-3 flex-wrap px-4 py-3">
                <div className="flex items-center gap-3">
                    <span className="cf-led" style={{ backgroundColor: 'var(--cf-phosphor)', boxShadow: '0 0 8px var(--cf-phosphor)' }} />
                    <p className="cf-label text-xs uppercase tracking-widest" style={{ color: 'var(--cf-text-muted)' }}>DEMO BOARDS</p>
                    <button
                        onClick={() => setEditMode(!editMode)}
                        type="button"
                        className={`aero-btn text-xs px-3 py-1.5 ${editMode ? 'aero-btn--magenta' : 'aero-btn--ghost'}`}
                    >
                        Edit mode
                    </button>
                </div>
                <button
                    onClick={() => { setBoardSelected(null); setModalIsVisible(true); }}
                    type="button"
                    className="aero-btn aero-btn--cyan text-xs px-4 py-2"
                >
                    + New board
                </button>
            </div>

            {/* Board Grid */}
            {boards.length === 0 ? (
                <div className="aero-column flex flex-col items-center justify-center py-24 text-center">
                    <p className="cf-mono text-4xl mb-3" style={{ color: 'var(--cf-phosphor)' }}>▦</p>
                    <p className="cf-mono text-sm uppercase tracking-widest" style={{ color: 'var(--cf-text)' }}>NO BOARDS YET</p>
                    <p className="cf-label text-xs mt-1" style={{ color: 'var(--cf-text-muted)' }}>Click <span style={{ color: 'var(--cf-phosphor)' }}>+ NEW BOARD</span> to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {boards.map((board, i) => {
                        const color = CF_LEDS[i % CF_LEDS.length];
                        const glow = NEON_GLOW[i % NEON_GLOW.length];
                        return (
                            <div
                                key={board.id}
                                onClick={() => handleOpenBoard(board)}
                                className={`glass-card group relative overflow-hidden cursor-pointer hover:-translate-y-0.5 ${editMode ? 'glass-card--ring' : ''}`}
                            >
                                <div style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} className="h-1.5 w-full"/>
                                <span className="cf-screw" style={{ position: 'absolute', top: 10, right: 10 }} />
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <span
                                            className="aero-pill cf-mono text-xs uppercase tracking-widest px-2.5 py-0.5 font-bold"
                                            style={{ borderColor: color, color }}
                                        >
                                            <span className={`neon-dot ${glow}`} style={{ backgroundColor: color }}/>
                                            DEMO
                                        </span>
                                        {editMode && (
                                            <span className="cf-mono text-xs uppercase tracking-widest" style={{ color: 'var(--cf-red)' }}>edit</span>
                                        )}
                                    </div>
                                    <p className="cf-mono font-bold text-lg leading-tight mb-2" style={{ color: 'var(--cf-ink)' }}>{board.name}</p>
                                    <p className="text-sm line-clamp-2" style={{ color: '#6a6453' }}>{board.description}</p>
                                </div>
                                <div className="px-5 pb-4 flex items-center gap-2">
                                    <span className={`neon-dot ${glow}`} style={{ backgroundColor: color }}/>
                                    <span className="cf-label text-xs uppercase tracking-widest" style={{ color: '#6a6453' }}>LOCAL</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {modalIsVisible && (
                <Modal>
                    <div className="aero-menu p-6 w-[90%] max-w-lg">
                        <p className="cf-label text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--cf-amber)' }}>
                            {boardSelected ? 'Edit board' : 'New board'}
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
