import React, { useCallback, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Shape, Point, Size } from '@/types';
import { ShapeRenderer } from './shapes/BaseShape';
import { useShapeResize, ResizeHandle } from '@/hooks/useShapeResize';

interface DraggableShapeProps {
  shape: Shape;
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
  onResizeStart?: (handle: ResizeHandle, mousePos: Point) => void;
  onResize?: (newDimensions: Size, newPosition?: Point) => void;
  onResizeEnd?: () => void;
  zoom: number;
  panOffset: Point;
  children: React.ReactNode;
}

export const DraggableShape: React.FC<DraggableShapeProps> = ({
  shape,
  isSelected = false,
  isHovered = false,
  isDragging = false,
  isResizing = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onResizeStart,
  onResize,
  onResizeEnd,
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
    disabled: isResizing, // Disable dragging while resizing
  });

  // Resize functionality
  const { isResizing: hookIsResizing, updateResize, endResize } = useShapeResize({
    shape,
    onResize: (shapeId: string, newDimensions: Size, newPosition?: Point) => {
      if (onResize) {
        onResize(newDimensions, newPosition);
      }
    },
    zoom,
    panOffset,
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
    zIndex: dndKitIsDragging || isDragging || isResizing ? 1000 : 1,
    opacity: dndKitIsDragging ? 0.8 : 1,
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    // Allow dnd-kit to handle the drag
    if (onMouseDown) {
      onMouseDown(event);
    }
  };

  const handleResizeStart = useCallback((handle: ResizeHandle, mousePos: Point) => {
    if (onResizeStart) {
      onResizeStart(handle, mousePos);
    }
  }, [onResizeStart]);

  // Handle mouse move for resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      updateResize({ x: event.clientX, y: event.clientY });
    };

    const handleMouseUp = () => {
      endResize();
      if (onResizeEnd) {
        onResizeEnd();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, updateResize, endResize, onResizeEnd]);

  return (
    <ShapeRenderer
      shape={shape}
      isSelected={isSelected}
      isHovered={isHovered}
      onMouseDown={handleMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onResizeStart={isSelected ? handleResizeStart : undefined}
      zoom={zoom}
      panOffset={panOffset}
    >
      <div
        ref={setNodeRef}
        className="w-full h-full"
        {...(isResizing ? {} : listeners)}
        {...attributes}
      >
        {children}
        
        {/* Drag preview indicator */}
        {(dndKitIsDragging || isDragging) && (
          <div className="absolute inset-0 border-2 border-blue-400 border-dashed pointer-events-none bg-blue-100 bg-opacity-20" />
        )}
        
        {/* Resize indicator */}
        {isResizing && (
          <div className="absolute inset-0 border-2 border-green-500 border-dashed pointer-events-none bg-green-100 bg-opacity-20" />
        )}
      </div>
    </ShapeRenderer>
  );
};