import { useCallback, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Shape, Point, Size } from '@/types';

export type ResizeHandle = 
  | 'nw' | 'n' | 'ne' 
  | 'w' | 'e' 
  | 'sw' | 's' | 'se';

interface UseShapeResizeOptions {
  shape: Shape;
  onResize: (shapeId: string, newDimensions: Size, newPosition?: Point) => void;
  zoom: number;
  panOffset: Point;
}

interface ResizeState {
  isResizing: boolean;
  handle: ResizeHandle | null;
  startDimensions: Size;
  startPosition: Point;
  startMousePosition: Point;
}

export const useShapeResize = ({ shape, onResize, zoom, panOffset }: UseShapeResizeOptions) => {
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  const startResize = useCallback((handle: ResizeHandle, mousePosition: Point) => {
    setResizeState({
      isResizing: true,
      handle,
      startDimensions: { ...shape.dimensions },
      startPosition: { ...shape.position },
      startMousePosition: mousePosition,
    });
  }, [shape.dimensions, shape.position]);

  const updateResize = useCallback((mousePosition: Point) => {
    if (!resizeState) return;

    const { handle, startDimensions, startPosition, startMousePosition } = resizeState;
    
    // Calculate mouse delta in canvas coordinates
    const deltaX = (mousePosition.x - startMousePosition.x) / zoom;
    const deltaY = (mousePosition.y - startMousePosition.y) / zoom;

    let newWidth = startDimensions.width;
    let newHeight = startDimensions.height;
    let newX = startPosition.x;
    let newY = startPosition.y;

    // Apply resize based on handle
    switch (handle) {
      case 'nw':
        newWidth = Math.max(10, startDimensions.width - deltaX);
        newHeight = Math.max(10, startDimensions.height - deltaY);
        newX = startPosition.x + (startDimensions.width - newWidth);
        newY = startPosition.y + (startDimensions.height - newHeight);
        break;
      case 'n':
        newHeight = Math.max(10, startDimensions.height - deltaY);
        newY = startPosition.y + (startDimensions.height - newHeight);
        break;
      case 'ne':
        newWidth = Math.max(10, startDimensions.width + deltaX);
        newHeight = Math.max(10, startDimensions.height - deltaY);
        newY = startPosition.y + (startDimensions.height - newHeight);
        break;
      case 'w':
        newWidth = Math.max(10, startDimensions.width - deltaX);
        newX = startPosition.x + (startDimensions.width - newWidth);
        break;
      case 'e':
        newWidth = Math.max(10, startDimensions.width + deltaX);
        break;
      case 'sw':
        newWidth = Math.max(10, startDimensions.width - deltaX);
        newHeight = Math.max(10, startDimensions.height + deltaY);
        newX = startPosition.x + (startDimensions.width - newWidth);
        break;
      case 's':
        newHeight = Math.max(10, startDimensions.height + deltaY);
        break;
      case 'se':
        newWidth = Math.max(10, startDimensions.width + deltaX);
        newHeight = Math.max(10, startDimensions.height + deltaY);
        break;
    }

    // For circles, maintain aspect ratio
    if (shape.type === 'circle') {
      const size = Math.max(newWidth, newHeight);
      newWidth = size;
      newHeight = size;
      
      // Adjust position for circles to keep them centered during resize
      if (handle && handle.includes('w')) {
        newX = startPosition.x + (startDimensions.width - newWidth);
      }
      if (handle && handle.includes('n')) {
        newY = startPosition.y + (startDimensions.height - newHeight);
      }
    }

    const newDimensions: Size = { width: newWidth, height: newHeight };
    const newPosition: Point = { x: newX, y: newY };

    onResize(shape.id, newDimensions, newPosition);
  }, [resizeState, zoom, shape.id, shape.type, onResize]);

  const endResize = useCallback(() => {
    setResizeState(null);
  }, []);

  return {
    isResizing: resizeState?.isResizing || false,
    currentHandle: resizeState?.handle || null,
    startResize,
    updateResize,
    endResize,
  };
};

// Hook for individual resize handles
export const useResizeHandle = (handle: ResizeHandle, onResizeStart: (handle: ResizeHandle, mousePos: Point) => void) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `resize-handle-${handle}`,
    data: {
      type: 'resize-handle',
      handle,
    },
  });

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    const mousePos = { x: event.clientX, y: event.clientY };
    onResizeStart(handle, mousePos);
  }, [handle, onResizeStart]);

  return {
    setNodeRef,
    attributes,
    listeners: {
      ...listeners,
      onMouseDown: handleMouseDown,
    },
    isDragging,
  };
};