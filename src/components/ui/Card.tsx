import { CardInterface } from "@/interfaces/CardInterface";
import { Draggable } from "../shared/Draggable";

const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarColor(id: number): string {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export function Card({id, name, description, assigned_user}: CardInterface & {color: string}) {
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
                <div style={{ background: 'linear-gradient(to bottom, #e6d800, #f5e642)', height: '10px' }} className="rounded-t-sm w-full flex-shrink-0"/>

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

                    {assigned_user && (
                        <div className="mt-auto pt-2 flex items-center gap-1">
                            <div
                                style={{
                                    backgroundColor: avatarColor(assigned_user.id),
                                    fontSize: '9px',
                                    width: '18px',
                                    height: '18px',
                                }}
                                className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                            >
                                {initials(assigned_user.name)}
                            </div>
                            <span style={{ color: '#666', fontSize: '10px' }} className="truncate">
                                {assigned_user.name.split(' ')[0]}
                            </span>
                        </div>
                    )}
                </div>

                {/* Dog-ear */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 0,
                    height: 0,
                    borderStyle: 'solid',
                    borderWidth: '0 0 14px 14px',
                    borderColor: 'transparent transparent rgba(0,0,0,0.12) transparent',
                }}/>
            </div>
        </Draggable>
    )
}
