import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { Shape, Point } from '@/types';

interface DragProviderProps {
  children: React.ReactNode;
  onDragStart?: (shapeId: string, position: Point) => void;
  onDragMove?: (shapeId: string, position: Point) => void;
  onDragEnd?: (shapeId: string, position: Point) => void;
  zoom: number;
  panOffset: Point;
}

export const DragProvider: React.FC<DragProviderProps> = ({
  children,
  onDragStart,
  onDragMove,
  onDragEnd,
  zoom,
  panOffset,
}) => {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 3, // Minimum distance to start dragging
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 100,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const shapeData = active.data.current;
    
    if (shapeData?.type === 'shape' && onDragStart) {
      const shape = shapeData.shape as Shape;
      onDragStart(shape.id, shape.position);
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, delta } = event;
    const shapeData = active.data.current;
    
    if (shapeData?.type === 'shape' && onDragMove) {
      const shape = shapeData.shape as Shape;
      
      // Convert screen delta to canvas coordinates
      const canvasDelta = {
        x: delta.x / zoom,
        y: delta.y / zoom,
      };
      
      const newPosition = {
        x: shape.position.x + canvasDelta.x,
        y: shape.position.y + canvasDelta.y,
      };
      
      onDragMove(shape.id, newPosition);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const shapeData = active.data.current;
    
    if (shapeData?.type === 'shape' && onDragEnd) {
      const shape = shapeData.shape as Shape;
      
      // Convert screen delta to canvas coordinates
      const canvasDelta = {
        x: delta.x / zoom,
        y: delta.y / zoom,
      };
      
      const newPosition = {
        x: shape.position.x + canvasDelta.x,
        y: shape.position.y + canvasDelta.y,
      };
      
      onDragEnd(shape.id, newPosition);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToParentElement]}
    >
      {children}
      <DragOverlay>
        {/* Optional: Custom drag overlay */}
      </DragOverlay>
    </DndContext>
  );
};