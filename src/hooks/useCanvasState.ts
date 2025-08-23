import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useYjsSync } from './useYjsSync';
import { Shape, Group, Point, Rectangle } from '@/types';
import { RootState } from '@/store';
import { 
  setSelectedShapeIds, 
  clearSelection, 
  addToSelection, 
  removeFromSelection,
  setDragState,
} from '@/store/slices/uiSlice';

interface UseCanvasStateOptions {
  sessionId: string;
  wsUrl?: string;
}

interface CanvasStateReturn {
  // Shape data
  shapes: Shape[];
  groups: Group[];
  
  // Selection state
  selectedShapeIds: string[];
  selectedShapes: Shape[];
  
  // Shape operations
  createShape: (shape: Omit<Shape, 'id'>) => string;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  deleteSelectedShapes: () => void;
  
  // Group operations
  createGroup: (shapeIds: string[]) => string;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  groupSelectedShapes: () => string | null;
  ungroupShape: (groupId: string) => void;
  
  // Selection operations
  selectShape: (id: string, multiSelect?: boolean) => void;
  selectShapes: (ids: string[]) => void;
  clearSelection: () => void;
  selectShapesInRectangle: (rectangle: Rectangle) => void;
  
  // Utility functions
  getShapeById: (id: string) => Shape | undefined;
  getGroupById: (id: string) => Group | undefined;
  getShapesInRectangle: (rectangle: Rectangle) => Shape[];
  calculateSelectionBounds: () => Rectangle | null;
  
  // Connection state
  isConnected: boolean;
}

export const useCanvasState = (options: UseCanvasStateOptions): CanvasStateReturn => {
  const dispatch = useDispatch();
  const selectedShapeIds = useSelector((state: RootState) => state.ui.selectedShapeIds);
  
  // Local state for shapes and groups
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Set up Yjs synchronization
  const {
    isConnected,
    addShape,
    updateShape: updateYjsShape,
    deleteShape: deleteYjsShape,
    addGroup,
    updateGroup: updateYjsGroup,
    deleteGroup: deleteYjsGroup,
    getAllShapes,
    getAllGroups,
  } = useYjsSync({
    sessionId: options.sessionId,
    wsUrl: options.wsUrl,
    onShapesChange: setShapes,
    onGroupsChange: setGroups,
  });

  // Initialize shapes and groups from Yjs
  useEffect(() => {
    setShapes(getAllShapes());
    setGroups(getAllGroups());
  }, [getAllShapes, getAllGroups]);

  // Memoized selected shapes
  const selectedShapes = useMemo(() => {
    return shapes.filter(shape => selectedShapeIds.includes(shape.id));
  }, [shapes, selectedShapeIds]);

  // Shape operations
  const createShape = useCallback((shapeData: Omit<Shape, 'id'>): string => {
    const id = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const shape: Shape = { ...shapeData, id };
    addShape(shape);
    return id;
  }, [addShape]);

  const updateShape = useCallback((id: string, updates: Partial<Shape>) => {
    updateYjsShape(id, updates);
  }, [updateYjsShape]);

  const deleteShape = useCallback((id: string) => {
    deleteYjsShape(id);
    // Remove from selection if selected
    dispatch(removeFromSelection(id));
  }, [deleteYjsShape, dispatch]);

  const deleteSelectedShapes = useCallback(() => {
    selectedShapeIds.forEach(id => deleteYjsShape(id));
    dispatch(clearSelection());
  }, [selectedShapeIds, deleteYjsShape, dispatch]);

  // Group operations
  const createGroup = useCallback((shapeIds: string[]): string => {
    if (shapeIds.length < 2) return '';
    
    // Calculate bounds for the group
    const groupShapes = shapes.filter(shape => shapeIds.includes(shape.id));
    if (groupShapes.length === 0) return '';
    
    const bounds = calculateBounds(groupShapes);
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const group: Group = {
      id: groupId,
      shapeIds,
      bounds,
      locked: false,
    };
    
    addGroup(group);
    
    // Update shapes to reference the group
    shapeIds.forEach(shapeId => {
      updateYjsShape(shapeId, { groupId });
    });
    
    return groupId;
  }, [shapes, addGroup, updateYjsShape]);

  const updateGroup = useCallback((id: string, updates: Partial<Group>) => {
    updateYjsGroup(id, updates);
  }, [updateYjsGroup]);

  const deleteGroup = useCallback((id: string) => {
    const group = groups.find(g => g.id === id);
    if (group) {
      // Remove group reference from shapes
      group.shapeIds.forEach(shapeId => {
        updateYjsShape(shapeId, { groupId: undefined });
      });
    }
    deleteYjsGroup(id);
  }, [groups, updateYjsShape, deleteYjsGroup]);

  const groupSelectedShapes = useCallback((): string | null => {
    if (selectedShapeIds.length < 2) return null;
    return createGroup(selectedShapeIds);
  }, [selectedShapeIds, createGroup]);

  const ungroupShape = useCallback((groupId: string) => {
    deleteGroup(groupId);
  }, [deleteGroup]);

  // Selection operations
  const selectShape = useCallback((id: string, multiSelect = false) => {
    if (multiSelect) {
      dispatch(addToSelection(id));
    } else {
      dispatch(setSelectedShapeIds([id]));
    }
  }, [dispatch]);

  const selectShapes = useCallback((ids: string[]) => {
    dispatch(setSelectedShapeIds(ids));
  }, [dispatch]);

  const clearSelectionCallback = useCallback(() => {
    dispatch(clearSelection());
  }, [dispatch]);

  const selectShapesInRectangle = useCallback((rectangle: Rectangle) => {
    const shapesInRect = getShapesInRectangle(rectangle);
    const shapeIds = shapesInRect.map(shape => shape.id);
    dispatch(setSelectedShapeIds(shapeIds));
  }, [dispatch]);

  // Utility functions
  const getShapeById = useCallback((id: string): Shape | undefined => {
    return shapes.find(shape => shape.id === id);
  }, [shapes]);

  const getGroupById = useCallback((id: string): Group | undefined => {
    return groups.find(group => group.id === id);
  }, [groups]);

  const getShapesInRectangle = useCallback((rectangle: Rectangle): Shape[] => {
    return shapes.filter(shape => {
      return isShapeInRectangle(shape, rectangle);
    });
  }, [shapes]);

  const calculateSelectionBounds = useCallback((): Rectangle | null => {
    if (selectedShapes.length === 0) return null;
    return calculateBounds(selectedShapes);
  }, [selectedShapes]);

  return {
    // Shape data
    shapes,
    groups,
    
    // Selection state
    selectedShapeIds,
    selectedShapes,
    
    // Shape operations
    createShape,
    updateShape,
    deleteShape,
    deleteSelectedShapes,
    
    // Group operations
    createGroup,
    updateGroup,
    deleteGroup,
    groupSelectedShapes,
    ungroupShape,
    
    // Selection operations
    selectShape,
    selectShapes,
    clearSelection: clearSelectionCallback,
    selectShapesInRectangle,
    
    // Utility functions
    getShapeById,
    getGroupById,
    getShapesInRectangle,
    calculateSelectionBounds,
    
    // Connection state
    isConnected,
  };
};

// Helper functions
function calculateBounds(shapes: Shape[]): Rectangle {
  if (shapes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapes.forEach(shape => {
    const { x, y } = shape.position;
    const { width, height } = shape.dimensions;
    
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function isShapeInRectangle(shape: Shape, rectangle: Rectangle): boolean {
  const shapeRight = shape.position.x + shape.dimensions.width;
  const shapeBottom = shape.position.y + shape.dimensions.height;
  const rectRight = rectangle.x + rectangle.width;
  const rectBottom = rectangle.y + rectangle.height;

  return (
    shape.position.x < rectRight &&
    shapeRight > rectangle.x &&
    shape.position.y < rectBottom &&
    shapeBottom > rectangle.y
  );
}