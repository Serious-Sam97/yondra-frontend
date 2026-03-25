import { CardInterface } from "@/interfaces/CardInterface";
import { Draggable } from "../shared/Draggable";

export function Card({id, name, description}: CardInterface & {color: string}) {
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
                <div className="px-3 pt-2 pb-4 flex flex-col gap-1">
                    <p style={{ color: '#1a1a1a', fontSize: '13px', lineHeight: '1.3' }} className="font-bold">
                        {name}
                    </p>
                    {description && (
                        <p style={{ color: '#555', fontSize: '11px', lineHeight: '1.4' }} className="line-clamp-3">
                            {description}
                        </p>
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
