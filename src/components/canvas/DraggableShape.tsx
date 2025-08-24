import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Shape, Point } from '@/types';

interface DraggableShapeProps {
  shape: Shape;
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
  zoom: number;
  panOffset: Point;
  children: React.ReactNode;
}

export const DraggableShape: React.FC<DraggableShapeProps> = ({
  shape,
  isSelected = false,
  isHovered = false,
  isDragging = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  zoom,
  panOffset,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: dndKitIsDragging,
  } = useDraggable({
    id: shape.id,
    data: {
      type: 'shape',
      shape,
    },
  });

  const { position, dimensions } = shape;
  
  // Calculate screen position
  const screenX = (position.x - panOffset.x) * zoom;
  const screenY = (position.y - panOffset.y) * zoom;
  const screenWidth = dimensions.width * zoom;
  const screenHeight = dimensions.height * zoom;

  // Apply drag transform if dragging
  const style = {
    left: screenX,
    top: screenY,
    width: screenWidth,
    height: screenHeight,
    transform: CSS.Translate.toString(transform),
    zIndex: dndKitIsDragging || isDragging ? 1000 : 1,
    opacity: dndKitIsDragging ? 0.8 : 1,
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    // Allow dnd-kit to handle the drag
    if (onMouseDown) {
      onMouseDown(event);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="absolute pointer-events-auto"
      style={style}
      onMouseDown={handleMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...listeners}
      {...attributes}
    >
      {children}
      
      {/* Selection indicator */}
      {isSelected && (
        <div
          className="absolute inset-0 border-2 border-blue-500 pointer-events-none"
          style={{
            borderRadius: shape.type === 'circle' ? '50%' : '0',
          }}
        >
          {/* Resize handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-nw-resize" />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-n-resize" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-ne-resize" />
          <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-e-resize" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-se-resize" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-s-resize" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-sw-resize" />
          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-w-resize" />
        </div>
      )}
      
      {/* Hover indicator */}
      {isHovered && !isSelected && (
        <div
          className="absolute inset-0 border border-blue-300 pointer-events-none"
          style={{
            borderRadius: shape.type === 'circle' ? '50%' : '0',
          }}
        />
      )}

      {/* Drag preview indicator */}
      {(dndKitIsDragging || isDragging) && (
        <div className="absolute inset-0 border-2 border-blue-400 border-dashed pointer-events-none bg-blue-100 bg-opacity-20" />
      )}
    </div>
  );
};