import { CardInterface } from "@/interfaces/CardInterface";
import { Draggable } from "../shared/Draggable";

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ user, size = 18 }: { user: { id: number; name: string }; size?: number }) {
    return (
        <div
            style={{
                backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length],
                fontSize: size * 0.5,
                width: size,
                height: size,
            }}
            className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            title={user.name}
        >
            {initials(user.name)}
        </div>
    );
}

export function Card({ id, name, description, assigned_user, created_by, tags }: CardInterface & { color: string }) {
    const showBottom = assigned_user || created_by;

    return (
        <Draggable id={`draggable-${id}`}>
            <div
                style={{
                    background: 'linear-gradient(to bottom, #f5e642 0%, #fef08a 5%, #fef9c3 5%)',
                    boxShadow: '3px 3px 8px rgba(0,0,0,0.35)',
                    fontFamily: 'Georgia, serif',
                    minHeight: '120px',
                    position: 'relative',
                }}
                className="cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-150 rounded-sm flex flex-col"
            >
                {/* Glue strip */}
                <div style={{ background: 'linear-gradient(to bottom, #e6d800, #f5e642)', height: '10px' }} className="rounded-t-sm w-full flex-shrink-0" />

                {/* Body */}
                <div className="px-3 pt-2 pb-4 flex flex-col gap-1 flex-1">
                    <p style={{ color: '#1a1a1a', fontSize: '13px', lineHeight: '1.3' }} className="font-bold">
                        {name}
                    </p>

                    {description && (
                        <p style={{ color: '#555', fontSize: '11px', lineHeight: '1.4' }} className="line-clamp-3">
                            {description}
                        </p>
                    )}

                    {/* Tags */}
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {tags.map(tag => (
                                <span
                                    key={tag.id}
                                    style={{ backgroundColor: tag.color + '33', color: tag.color, borderColor: tag.color + '66', fontSize: '9px' }}
                                    className="px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-wide"
                                >
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Bottom row: creator left, assignee right */}
                    {showBottom && (
                        <div className="mt-auto pt-1 flex items-center justify-between">
                            {created_by ? (
                                <div className="flex items-center gap-1" title={`Created by ${created_by.name}`}>
                                    <Avatar user={created_by} />
                                    <span style={{ color: '#666', fontSize: '10px' }} className="truncate">
                                        {created_by.name.split(' ')[0]}
                                    </span>
                                </div>
                            ) : <div />}

                            {assigned_user && (
                                <div title={`Assigned to ${assigned_user.name}`} style={{ marginRight: '16px' }}>
                                    <Avatar user={assigned_user} size={16} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Dog-ear */}
                <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 0, height: 0, borderStyle: 'solid',
                    borderWidth: '0 0 14px 14px',
                    borderColor: 'transparent transparent rgba(0,0,0,0.12) transparent',
                }} />
            </div>
        </Draggable>
    );
}
