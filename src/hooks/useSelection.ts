import { useCallback, useRef } from 'react';
import { useAppSelector, useAppDispatch } from './redux';
import {
  setSelectedShapeIds,
  addToSelection,
  removeFromSelection,
  clearSelection,
  startMultiSelect,
  updateMultiSelect,
  endMultiSelect,
} from '@/store/slices/uiSlice';
import { Point, Shape, Rectangle } from '@/types';
import { SelectionService } from '@/services/selectionService';
import { screenToCanvas } from '@/utils/viewport';

interface UseSelectionProps {
  shapes: Shape[];
  zoom: number;
  panOffset: Point;
}

export const useSelection = ({ shapes, zoom, panOffset }: UseSelectionProps) => {
  const dispatch = useAppDispatch();
  const { selectedShapeIds, isMultiSelecting, selectionRectangle } = useAppSelector(
    (state) => state.ui
  );

  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef<Point | null>(null);

  /**
   * Handle single shape selection with optional multi-select
   */
  const selectShape = useCallback(
    (shapeId: string, multiSelect = false) => {
      if (multiSelect) {
        if (selectedShapeIds.includes(shapeId)) {
          dispatch(removeFromSelection(shapeId));
        } else {
          dispatch(addToSelection(shapeId));
        }
      } else {
        dispatch(setSelectedShapeIds([shapeId]));
      }
    },
    [selectedShapeIds, dispatch]
  );

  /**
   * Handle shape click for selection
   */
  const handleShapeClick = useCallback(
    (shapeId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      
      const multiSelect = event.ctrlKey || event.metaKey;
      selectShape(shapeId, multiSelect);
    },
    [selectShape]
  );

  /**
   * Start area selection
   */
  const startAreaSelection = useCallback(
    (screenPoint: Point) => {
      const canvasPoint = screenToCanvas(screenPoint, zoom, panOffset);
      
      isSelectingRef.current = true;
      selectionStartRef.current = canvasPoint;
      
      dispatch(startMultiSelect(canvasPoint));
    },
    [zoom, panOffset, dispatch]
  );

  /**
   * Update area selection
   */
  const updateAreaSelection = useCallback(
    (screenPoint: Point) => {
      if (!isSelectingRef.current || !selectionStartRef.current) return;
      
      const canvasPoint = screenToCanvas(screenPoint, zoom, panOffset);
      dispatch(updateMultiSelect(canvasPoint));
    },
    [zoom, panOffset, dispatch]
  );

  /**
   * End area selection and select shapes in rectangle
   */
  const endAreaSelection = useCallback(
    (screenPoint: Point) => {
      if (!isSelectingRef.current || !selectionStartRef.current || !selectionRectangle) {
        isSelectingRef.current = false;
        selectionStartRef.current = null;
        dispatch(endMultiSelect());
        return;
      }

      const canvasPoint = screenToCanvas(screenPoint, zoom, panOffset);
      const rect = SelectionService.createRectangleFromPoints(
        selectionRectangle.start,
        canvasPoint
      );

      // Only select if the rectangle is large enough to be intentional
      if (SelectionService.isValidSelectionRectangle(rect)) {
        const shapesInRect = SelectionService.getShapesInRectangle(shapes, rect);
        const shapeIds = shapesInRect.map(shape => shape.id);
        dispatch(setSelectedShapeIds(shapeIds));
      }

      isSelectingRef.current = false;
      selectionStartRef.current = null;
      dispatch(endMultiSelect());
    },
    [shapes, zoom, panOffset, selectionRectangle, dispatch]
  );

  /**
   * Handle canvas click for selection
   */
  const handleCanvasClick = useCallback(
    (canvasPoint: Point, event: React.MouseEvent) => {
      // Check if we clicked on a shape
      const clickedShape = SelectionService.getShapeAtPoint(shapes, canvasPoint);
      
      if (clickedShape) {
        const multiSelect = event.ctrlKey || event.metaKey;
        selectShape(clickedShape.id, multiSelect);
      } else {
        // Clicked on empty canvas - clear selection unless multi-selecting
        if (!(event.ctrlKey || event.metaKey)) {
          dispatch(clearSelection());
        }
      }
    },
    [shapes, selectShape, dispatch]
  );

  /**
   * Handle mouse down for selection operations
   */
  const handleSelectionMouseDown = useCallback(
    (screenPoint: Point, event: React.MouseEvent) => {
      const canvasPoint = screenToCanvas(screenPoint, zoom, panOffset);
      
      // Check if we're clicking on a shape
      const clickedShape = SelectionService.getShapeAtPoint(shapes, canvasPoint);
      
      if (clickedShape) {
        // Handle shape selection
        handleShapeClick(clickedShape.id, event);
      } else {
        // Start area selection if no shape was clicked
        if (event.button === 0) { // Left mouse button only
          startAreaSelection(screenPoint);
        }
      }
    },
    [shapes, zoom, panOffset, handleShapeClick, startAreaSelection]
  );

  /**
   * Clear all selections
   */
  const clearAllSelections = useCallback(() => {
    dispatch(clearSelection());
  }, [dispatch]);

  return {
    selectedShapeIds,
    isMultiSelecting,
    selectionRectangle,
    selectShape,
    handleShapeClick,
    handleCanvasClick,
    handleSelectionMouseDown,
    startAreaSelection,
    updateAreaSelection,
    endAreaSelection,
    clearAllSelections,
  };
};