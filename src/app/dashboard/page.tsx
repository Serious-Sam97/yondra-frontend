'use client'

import Modal from "@/components/shared/Modal";
import ProjectEdit from "@/components/ui/ProjectEdit";
import { fetchBoards, fetchUser } from "@/lib/auth";
import { createBoard, deleteBoard } from "@/lib/api";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";

const STRIPE_COLORS = ['#4CAF50', '#FFC107', '#FF9800', '#F44336', '#7B1FA2', '#1976D2'];
const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 2)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    if (days < 7)   return `${days}d ago`;
    if (days < 30)  return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function MemberAvatars({ owner, sharedWith }: { owner?: any; sharedWith?: any[] }) {
    const all = [owner, ...(sharedWith ?? [])].filter(Boolean).slice(0, 5);
    const extra = [owner, ...(sharedWith ?? [])].filter(Boolean).length - 5;
    return (
        <div className="flex items-center">
            {all.map((u, i) => (
                <div
                    key={u.id}
                    style={{
                        backgroundColor: AVATAR_COLORS[u.id % AVATAR_COLORS.length],
                        fontSize: 9,
                        width: 22,
                        height: 22,
                        marginLeft: i === 0 ? 0 : -6,
                        zIndex: all.length - i,
                        position: 'relative',
                    }}
                    className="rounded-full flex items-center justify-center text-white font-bold border-2 border-gray-900 flex-shrink-0"
                    title={u.name}
                >
                    {initials(u.name)}
                </div>
            ))}
            {extra > 0 && (
                <div style={{ marginLeft: -6, fontSize: 9, width: 22, height: 22 }}
                     className="rounded-full flex items-center justify-center text-gray-400 font-bold border-2 border-gray-900 bg-gray-700 flex-shrink-0">
                    +{extra}
                </div>
            )}
        </div>
    );
}

function BoardCard({ project, index, onClick, editMode, isShared }: { project: any; index: number; onClick: () => void; editMode: boolean; isShared: boolean }) {
    const color = STRIPE_COLORS[index % STRIPE_COLORS.length];
    const cardCount = project.cards_count ?? 0;

    return (
        <div
            onClick={onClick}
            className={`group relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-gray-600 hover:shadow-xl hover:-translate-y-0.5 flex flex-col ${editMode && !isShared ? 'ring-2 ring-amber-400/40' : ''}`}
        >
            {/* Color stripe */}
            <div style={{ backgroundColor: color }} className="h-1.5 w-full flex-shrink-0" />

            <div className="p-5 flex flex-col flex-1 gap-3">
                {/* Top row */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span
                            style={{ backgroundColor: color + '22', color, fontSize: '10px' }}
                            className="uppercase tracking-widest px-2 py-0.5 rounded font-bold"
                        >
                            Board
                        </span>
                        {isShared && (
                            <span className="text-xs uppercase tracking-widest px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-400" style={{ fontSize: '10px' }}>
                                Shared
                            </span>
                        )}
                    </div>
                    {editMode && !isShared && (
                        <span className="text-xs text-amber-400 uppercase tracking-widest opacity-70 group-hover:opacity-100">edit</span>
                    )}
                </div>

                {/* Name + description */}
                <div className="flex-1">
                    <p className="text-white font-bold text-lg leading-tight mb-1">{project.name}</p>
                    {project.description ? (
                        <p className="text-gray-500 text-sm line-clamp-2">{project.description}</p>
                    ) : (
                        <p className="text-gray-700 text-sm italic">No description</p>
                    )}
                </div>

                {/* Card count bar */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">{cardCount} {cardCount === 1 ? 'card' : 'cards'}</span>
                    </div>
                    <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            style={{ width: cardCount > 0 ? `${Math.min(cardCount * 8, 100)}%` : '0%', backgroundColor: color }}
                            className="h-full rounded-full transition-all duration-500"
                        />
                    </div>
                </div>

                {/* Bottom row: members + updated */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-800">
                    <MemberAvatars owner={project.owner} sharedWith={project.shared_with} />
                    <span className="text-xs text-gray-600">{timeAgo(project.updated_at)}</span>
                </div>
            </div>
        </div>
    );
}

function EmptySection({ onNew, label }: { onNew?: () => void; label: string }) {
    return (
        <div className="border-2 border-dashed border-gray-800 rounded-xl flex flex-col items-center justify-center py-14 text-center">
            <p className="text-3xl mb-3 opacity-40">▦</p>
            <p className="text-gray-600 text-sm uppercase tracking-widest">{label}</p>
            {onNew && (
                <button
                    onClick={onNew}
                    className="mt-4 text-xs uppercase tracking-widest px-4 py-2 rounded border border-amber-400/50 text-amber-400 hover:bg-amber-400/10 cursor-pointer transition-all duration-200"
                >
                    + Create your first board
                </button>
            )}
        </div>
    );
}

export default function DashboardPage() {
    const router = useRouter();
    const [ownedBoards, setOwnedBoards] = useState<any[]>([]);
    const [sharedBoards, setSharedBoards] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [modalIsVisible, setModalIsVisible] = useState(false);
    const [projectSelected, setProjectSelected] = useState<any>(null);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userData, boards] = await Promise.all([fetchUser(), fetchBoards()]);
                if (userData) setUser(userData);
                if (boards) {
                    setOwnedBoards(boards.owned ?? []);
                    setSharedBoards(boards.shared ?? []);
                }
            } catch {
                router.push('/login');
            }
        };
        fetchData();
    }, []);

    const handleSubmitProject = async (project: any) => {
        if (project.id !== null) {
            setOwnedBoards(prev => prev.map(p => p.id === project.id ? { ...p, ...project } : p));
        } else {
            const saved = await createBoard({ name: project.name, description: project.description });
            setOwnedBoards(prev => [...prev, { ...saved, cards_count: 0, owner: user, shared_with: [] }]);
        }
        setModalIsVisible(false);
        setProjectSelected(null);
    };

    const handleDeleteProject = async (projectId: number) => {
        await deleteBoard(projectId);
        setOwnedBoards(prev => prev.filter(p => p.id !== projectId));
        setModalIsVisible(false);
        setProjectSelected(null);
    };

    const handleOpenCard = (project: any, isShared: boolean) => {
        if (editMode && !isShared) {
            setProjectSelected(project);
            setModalIsVisible(true);
            return;
        }
        router.push(`/boards/${project.id}`);
    };

    const totalBoards = ownedBoards.length + sharedBoards.length;

    return (
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-10 max-w-6xl mx-auto">

            {/* Header */}
            <div className="mb-10">
                <div className="flex gap-1 mb-3">
                    {STRIPE_COLORS.map(c => (
                        <div key={c} style={{ backgroundColor: c }} className="h-1 flex-1 rounded-full" />
                    ))}
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-1">Welcome back</p>
                <p className="text-3xl md:text-5xl font-bold tracking-tight">
                    {user?.name ?? '...'}
                </p>
                {totalBoards > 0 && (
                    <p className="text-gray-500 text-sm mt-2">
                        {totalBoards} {totalBoards === 1 ? 'board' : 'boards'} · {ownedBoards.reduce((s, b) => s + (b.cards_count ?? 0), 0)} cards
                    </p>
                )}
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-8 gap-3 flex-wrap">
                <button
                    onClick={() => setEditMode(e => !e)}
                    className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded border cursor-pointer transition-all duration-200 ${
                        editMode
                            ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                            : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                    }`}
                >
                    ⚙ {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
                </button>
                <button
                    onClick={() => { setProjectSelected(null); setModalIsVisible(true); }}
                    className="text-xs uppercase tracking-widest px-4 py-2 rounded border-2 border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-black font-bold cursor-pointer transition-all duration-200"
                >
                    + New Board
                </button>
            </div>

            {/* My Boards */}
            <section className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">My Boards</p>
                    <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{ownedBoards.length}</span>
                </div>

                {ownedBoards.length === 0 ? (
                    <EmptySection label="No boards yet" onNew={() => { setProjectSelected(null); setModalIsVisible(true); }} />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {ownedBoards.map((project, i) => (
                            <BoardCard
                                key={project.id}
                                project={project}
                                index={i}
                                isShared={false}
                                editMode={editMode}
                                onClick={() => handleOpenCard(project, false)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Shared with me */}
            <section>
                <div className="flex items-center gap-3 mb-4">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Shared with me</p>
                    <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{sharedBoards.length}</span>
                </div>

                {sharedBoards.length === 0 ? (
                    <EmptySection label="No boards shared with you yet" />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {sharedBoards.map((project, i) => (
                            <BoardCard
                                key={project.id}
                                project={project}
                                index={i}
                                isShared={true}
                                editMode={editMode}
                                onClick={() => handleOpenCard(project, true)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Modal */}
            {modalIsVisible && (
                <Modal>
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-[90%] max-w-lg">
                        <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">
                            {projectSelected ? 'Edit Board' : 'New Board'}
                        </p>
                        <ProjectEdit
                            cancel={() => { setModalIsVisible(false); setProjectSelected(null); }}
                            submit={handleSubmitProject}
                            onDelete={projectSelected ? () => handleDeleteProject(projectSelected.id) : undefined}
                            project={projectSelected}
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
}
