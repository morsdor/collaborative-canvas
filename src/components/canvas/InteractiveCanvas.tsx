'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { setZoom, setPanOffset, setCanvasSize, zoomIn, zoomOut } from '@/store/slices/viewportSlice';
import { setSelectedShapeIds, addToSelection } from '@/store/slices/uiSlice';
import { Point, Shape, Tool, Size, ShapeStyle } from '@/types';
import { isShapeVisible } from '@/utils';
import { screenToCanvas } from '@/utils/viewport';
import { ShapeFactory } from './ShapeFactory';
import { DragProvider } from './DragProvider';
import { useShapeCreation } from '@/hooks/useShapeCreation';
import { useShapeDrag } from '@/hooks/useShapeDrag';
import { useShapeResize, ResizeHandle } from '@/hooks/useShapeResize';
import { useSelection } from '@/hooks/useSelection';
import { SelectionOverlay } from './SelectionOverlay';

interface InteractiveCanvasProps {
  shapes: Shape[];
  selectedShapeIds?: Set<string>;
  sessionId: string;
  onShapeClick?: (shapeId: string, event: React.MouseEvent) => void;
  onCanvasClick?: (position: Point, event: React.MouseEvent) => void;
  onShapeHover?: (shapeId: string | null) => void;
  onShapeCreated?: (shape: Shape) => void;
  onShapeUpdate?: (id: string, updates: Partial<Shape>) => void;
  onShapeStyleChange?: (shapeIds: string[], style: Partial<ShapeStyle>) => void;
  className?: string;
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  shapes,
  selectedShapeIds = new Set(),
  sessionId,
  onShapeClick,
  onCanvasClick,
  onShapeHover,
  onShapeCreated,
  onShapeUpdate,
  onShapeStyleChange,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  
  const { zoom, panOffset, canvasSize, visibleBounds } = useAppSelector(
    (state) => state.viewport
  );
  const currentTool = useAppSelector((state) => state.ui.currentTool);
  const selectedIds = useAppSelector((state) => state.ui.selectedShapeIds);

  
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point>({ x: 0, y: 0 });
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [resizingShapeId, setResizingShapeId] = useState<string | null>(null);

  // Shape creation functionality
  const { createShapeAtPosition, isCreatingShape } = useShapeCreation({
    sessionId,
    onShapeCreated,
    onCreationError: (error) => {
      console.error('Shape creation error:', error);
    },
  });

  // Shape drag functionality
  const { isDragging, draggedShapeIds, startDrag, updateDrag, endDrag } = useShapeDrag({
    onShapeUpdate: onShapeUpdate || (() => {}),
    snapToGrid: true,
    gridSize: 20,
    shapes: shapes,
  });

  // Selection functionality
  const {
    selectedShapeIds: selectionIds,
    isMultiSelecting,
    selectionRectangle,
    handleSelectionMouseDown,
    updateAreaSelection,
    endAreaSelection,
    clearAllSelections,
  } = useSelection({
    shapes,
    zoom,
    panOffset,
  });

  // Update canvas size when container resizes
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        dispatch(setCanvasSize({ width: rect.width, height: rect.height }));
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [dispatch]);

  // Filter shapes that are visible in the current viewport
  const visibleShapes = shapes.filter(shape => 
    isShapeVisible(shape.position, shape.dimensions, visibleBounds, 100)
  );

  const handleMouseDown = useCallback(async (event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    const canvasPoint = screenToCanvas(screenPoint, zoom, panOffset);

    if (event.button === 0) { // Left mouse button
      if (event.metaKey || event.ctrlKey) {
        // Start panning with Cmd/Ctrl held
        setIsPanning(true);
        setLastPanPoint(screenPoint);
        event.preventDefault();
      } else if (isShapeCreationTool(currentTool)) {
        // Create shape at clicked position
        event.preventDefault();
        await createShapeAtPosition(canvasPoint);
      } else if (currentTool === 'select') {
        // Handle selection
        handleSelectionMouseDown(screenPoint, event);
      } else if (onCanvasClick) {
        onCanvasClick(canvasPoint, event);
      }
    } else if (event.button === 1) { // Middle mouse button for panning
      setIsPanning(true);
      setLastPanPoint(screenPoint);
      event.preventDefault();
    }
  }, [zoom, panOffset, currentTool, createShapeAtPosition, onCanvasClick, handleSelectionMouseDown]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    if (isPanning) {
      const deltaX = (screenPoint.x - lastPanPoint.x) / zoom;
      const deltaY = (screenPoint.y - lastPanPoint.y) / zoom;

      dispatch(setPanOffset({
        x: panOffset.x - deltaX,
        y: panOffset.y - deltaY,
      }));

      setLastPanPoint(screenPoint);
    } else if (isMultiSelecting) {
      // Update area selection
      updateAreaSelection(screenPoint);
    }
  }, [isPanning, lastPanPoint, zoom, panOffset, dispatch, isMultiSelecting, updateAreaSelection]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
    } else if (isMultiSelecting) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const screenPoint: Point = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        endAreaSelection(screenPoint);
      }
    }
  }, [isPanning, isMultiSelecting, endAreaSelection]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    if (event.deltaY < 0) {
      dispatch(zoomIn(screenPoint));
    } else {
      dispatch(zoomOut(screenPoint));
    }
  }, [dispatch]);

  const handleShapeMouseDown = useCallback((shapeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Handle selection is now managed by useSelection hook
    // This will be called by the shape components directly
    
    if (onShapeClick) {
      onShapeClick(shapeId, event);
    }
  }, [onShapeClick]);

  const handleShapeMouseEnter = useCallback((shapeId: string, event: React.MouseEvent) => {
    setHoveredShapeId(shapeId);
    if (onShapeHover) {
      onShapeHover(shapeId);
    }
  }, [onShapeHover]);

  const handleShapeMouseLeave = useCallback((shapeId: string, event: React.MouseEvent) => {
    setHoveredShapeId(null);
    if (onShapeHover) {
      onShapeHover(null);
    }
  }, [onShapeHover]);

  // Drag event handlers
  const handleDragStart = useCallback((shapeId: string, position: Point) => {
    // If the dragged shape is not selected, select it
    if (!selectedIds.includes(shapeId)) {
      dispatch(setSelectedShapeIds([shapeId]));
    }
    
    // Start dragging all selected shapes
    const shapesToDrag = selectedIds.includes(shapeId) ? selectedIds : [shapeId];
    startDrag(shapesToDrag, position);
  }, [selectedIds, dispatch, startDrag]);

  const handleDragMove = useCallback((_shapeId: string, position: Point) => {
    updateDrag(position);
  }, [updateDrag]);

  const handleDragEnd = useCallback((_shapeId: string, _position: Point) => {
    endDrag();
  }, [endDrag]);

  // Resize event handlers
  const handleResizeStart = useCallback((shapeId: string, handle: ResizeHandle, mousePos: Point) => {
    setResizingShapeId(shapeId);
    // Ensure the shape being resized is selected
    if (!selectedIds.includes(shapeId)) {
      dispatch(setSelectedShapeIds([shapeId]));
    }
  }, [selectedIds, dispatch]);

  const handleResize = useCallback((shapeId: string, newDimensions: Size, newPosition?: Point) => {
    if (onShapeUpdate) {
      const updates: Partial<Shape> = { dimensions: newDimensions };
      if (newPosition) {
        updates.position = newPosition;
      }
      onShapeUpdate(shapeId, updates);
    }
  }, [onShapeUpdate]);

  const handleResizeEnd = useCallback(() => {
    setResizingShapeId(null);
  }, []);

  // Style change handler
  const handleStyleChange = useCallback((shapeIds: string[], style: Partial<ShapeStyle>) => {
    if (onShapeStyleChange) {
      onShapeStyleChange(shapeIds, style);
    }
  }, [onShapeStyleChange]);

  return (
    <div
      ref={containerRef}
      data-testid="interactive-canvas"
      className={`relative overflow-hidden bg-white select-none ${className}`}
      style={{ width: '100%', height: '100%' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <DragProvider
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        zoom={zoom}
        panOffset={panOffset}
      >
        {/* Canvas content */}
        <div
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `scale(${zoom}) translate(${-panOffset.x}px, ${-panOffset.y}px)`,
            transformOrigin: '0 0',
          }}
        >
          {/* Grid background */}
          <div
            className="absolute opacity-10"
            style={{
              left: Math.floor(panOffset.x / 20) * 20,
              top: Math.floor(panOffset.y / 20) * 20,
              width: canvasSize.width / zoom + 40,
              height: canvasSize.height / zoom + 40,
              backgroundImage: `
                linear-gradient(to right, #000 1px, transparent 1px),
                linear-gradient(to bottom, #000 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />

          {/* Render visible shapes */}
          {visibleShapes.map((shape) => (
            <ShapeFactory
              key={shape.id}
              shape={shape}
              isSelected={selectedShapeIds.has(shape.id)}
              isHovered={hoveredShapeId === shape.id}
              isDragging={draggedShapeIds.includes(shape.id)}
              isResizing={resizingShapeId === shape.id}
              onShapeMouseDown={handleShapeMouseDown}
              onShapeMouseEnter={handleShapeMouseEnter}
              onShapeMouseLeave={handleShapeMouseLeave}
              onResizeStart={(handle, mousePos) => handleResizeStart(shape.id, handle, mousePos)}
              onResize={(newDimensions, newPosition) => handleResize(shape.id, newDimensions, newPosition)}
              onResizeEnd={handleResizeEnd}
              zoom={1} // Shapes handle their own scaling via CSS transform
              panOffset={{ x: 0, y: 0 }} // Shapes handle their own positioning via CSS transform
            />
          ))}

          {/* Selection overlay */}
          <SelectionOverlay
            isMultiSelecting={isMultiSelecting}
            selectionRectangle={selectionRectangle}
            zoom={1}
            panOffset={{ x: 0, y: 0 }}
          />
        </div>
      </DragProvider>

      {/* Viewport info overlay */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded pointer-events-none">
        Zoom: {(zoom * 100).toFixed(0)}%<br />
        Pan: ({panOffset.x.toFixed(0)}, {panOffset.y.toFixed(0)})<br />
        Shapes: {visibleShapes.length}/{shapes.length}<br />
        {isDragging && `Dragging: ${draggedShapeIds.length} shapes`}
      </div>

      {/* Cursor style */}
      <style jsx>{`
        .canvas-container {
          cursor: ${getCursorStyle(currentTool, isPanning, isCreatingShape)};
        }
      `}</style>
    </div>
  );
};

/**
 * Helper function to determine if the current tool is for shape creation
 */
function isShapeCreationTool(tool: Tool): boolean {
  return ['rectangle', 'circle', 'text', 'line'].includes(tool);
}

/**
 * Helper function to get appropriate cursor style based on current state
 */
function getCursorStyle(tool: Tool, isPanning: boolean, isCreating: boolean): string {
  if (isPanning) return 'grabbing';
  if (isCreating) return 'wait';
  
  switch (tool) {
    case 'rectangle':
    case 'circle':
    case 'line':
      return 'crosshair';
    case 'text':
      return 'text';
    case 'select':
    default:
      return 'grab';
  }
}