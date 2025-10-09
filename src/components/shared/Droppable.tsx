import React from 'react';
import {useDroppable} from '@dnd-kit/core';

interface droppableInterface {
    id: string,
    children: any
    style: any
}

export function Droppable(props: droppableInterface) {
  const {isOver, setNodeRef} = useDroppable({
    id: props.id,
  });
  const style = {
    ...props.style,
    color: isOver ? 'green' : undefined,
  };
  
  
  return (
    <div ref={setNodeRef} style={style}>
      {props.children}
    </div>
  );
}