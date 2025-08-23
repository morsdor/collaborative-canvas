'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { setZoom, setPanOffset, setCanvasSize, zoomIn, zoomOut } from '@/store/slices/viewportSlice';
import { Point, Shape } from '@/types';
import { screenToCanvas, isShapeVisible } from '@/utils';
import { ShapeFactory } from './ShapeFactory';

interface InteractiveCanvasProps {
  shapes: Shape[];
  selectedShapeIds?: Set<string>;
  onShapeClick?: (shapeId: string, event: React.MouseEvent) => void;
  onCanvasClick?: (position: Point, event: React.MouseEvent) => void;
  onShapeHover?: (shapeId: string | null) => void;
  className?: string;
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  shapes,
  selectedShapeIds = new Set(),
  onShapeClick,
  onCanvasClick,
  onShapeHover,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  
  const { zoom, panOffset, canvasSize, visibleBounds } = useAppSelector(
    (state) => state.viewport
  );
  
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point>({ x: 0, y: 0 });
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);

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

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    const canvasPoint = screenToCanvas(screenPoint, zoom, panOffset);

    if (event.button === 0) { // Left mouse button
      if (event.metaKey || event.ctrlKey) {
        // Start panning
        setIsPanning(true);
        setLastPanPoint(screenPoint);
        event.preventDefault();
      } else if (onCanvasClick) {
        onCanvasClick(canvasPoint, event);
      }
    } else if (event.button === 1) { // Middle mouse button for panning
      setIsPanning(true);
      setLastPanPoint(screenPoint);
      event.preventDefault();
    }
  }, [zoom, panOffset, onCanvasClick]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isPanning) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    const deltaX = (screenPoint.x - lastPanPoint.x) / zoom;
    const deltaY = (screenPoint.y - lastPanPoint.y) / zoom;

    dispatch(setPanOffset({
      x: panOffset.x - deltaX,
      y: panOffset.y - deltaY,
    }));

    setLastPanPoint(screenPoint);
  }, [isPanning, lastPanPoint, zoom, panOffset, dispatch]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

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

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-white select-none ${className}`}
      style={{ width: '100%', height: '100%' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
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
            onShapeMouseDown={handleShapeMouseDown}
            onShapeMouseEnter={handleShapeMouseEnter}
            onShapeMouseLeave={handleShapeMouseLeave}
            zoom={1} // Shapes handle their own scaling via CSS transform
            panOffset={{ x: 0, y: 0 }} // Shapes handle their own positioning via CSS transform
          />
        ))}
      </div>

      {/* Viewport info overlay */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded pointer-events-none">
        Zoom: {(zoom * 100).toFixed(0)}%<br />
        Pan: ({panOffset.x.toFixed(0)}, {panOffset.y.toFixed(0)})<br />
        Shapes: {visibleShapes.length}/{shapes.length}
      </div>

      {/* Cursor style */}
      <style jsx>{`
        .canvas-container {
          cursor: ${isPanning ? 'grabbing' : 'grab'};
        }
      `}</style>
    </div>
  );
};