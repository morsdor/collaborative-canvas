import { useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { setDragState } from '@/store/slices/uiSlice';
import { Point, Shape, DragState } from '@/types';

interface UseShapeDragOptions {
  onShapeUpdate: (id: string, updates: Partial<Shape>) => void;
  snapToGrid?: boolean;
  gridSize?: number;
  shapes?: Shape[]; // Add shapes to get initial positions
}

interface UseShapeDragReturn {
  isDragging: boolean;
  draggedShapeIds: string[];
  startDrag: (shapeIds: string[], startPosition: Point) => void;
  updateDrag: (currentPosition: Point) => void;
  endDrag: () => void;
  getDragOffset: () => Point;
}

export const useShapeDrag = (options: UseShapeDragOptions): UseShapeDragReturn => {
  const dispatch = useAppDispatch();
  const dragState = useAppSelector((state) => state.ui.dragState);
  const [initialShapePositions, setInitialShapePositions] = useState<Map<string, Point>>(new Map());

  const { onShapeUpdate, snapToGrid = false, gridSize = 20, shapes = [] } = options;

  const snapToGridIfEnabled = useCallback((position: Point): Point => {
    if (!snapToGrid) return position;
    
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
    };
  }, [snapToGrid, gridSize]);

  const startDrag = useCallback((shapeIds: string[], startPosition: Point) => {
    const newDragState: DragState = {
      isDragging: true,
      startPosition,
      currentPosition: startPosition,
      targetShapeIds: shapeIds,
      dragType: 'move',
    };

    dispatch(setDragState(newDragState));

    // Store initial positions for all shapes being dragged
    const positions = new Map<string, Point>();
    shapeIds.forEach((shapeId) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape) {
        positions.set(shapeId, { ...shape.position });
      }
    });
    setInitialShapePositions(positions);
  }, [dispatch, shapes]);

  const updateDrag = useCallback((currentPosition: Point) => {
    if (!dragState?.isDragging) return;

    const updatedDragState: DragState = {
      ...dragState,
      currentPosition,
    };

    dispatch(setDragState(updatedDragState));

    // Calculate offset from start position
    const offset = {
      x: currentPosition.x - dragState.startPosition.x,
      y: currentPosition.y - dragState.startPosition.y,
    };

    // Update positions of all dragged shapes
    dragState.targetShapeIds.forEach((shapeId) => {
      const initialPosition = initialShapePositions.get(shapeId);
      if (initialPosition) {
        const newPosition = {
          x: initialPosition.x + offset.x,
          y: initialPosition.y + offset.y,
        };

        const snappedPosition = snapToGridIfEnabled(newPosition);
        
        // Update shape position
        onShapeUpdate(shapeId, { position: snappedPosition });
      }
    });
  }, [dragState, initialShapePositions, onShapeUpdate, snapToGridIfEnabled, dispatch]);

  const endDrag = useCallback(() => {
    dispatch(setDragState(null));
    setInitialShapePositions(new Map());
  }, [dispatch]);

  const getDragOffset = useCallback((): Point => {
    if (!dragState?.isDragging) return { x: 0, y: 0 };
    
    return {
      x: dragState.currentPosition.x - dragState.startPosition.x,
      y: dragState.currentPosition.y - dragState.startPosition.y,
    };
  }, [dragState]);

  return {
    isDragging: dragState?.isDragging || false,
    draggedShapeIds: dragState?.targetShapeIds || [],
    startDrag,
    updateDrag,
    endDrag,
    getDragOffset,
  };
};