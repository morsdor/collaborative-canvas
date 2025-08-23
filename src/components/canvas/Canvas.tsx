'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { setZoom, setPanOffset, setCanvasSize, zoomIn, zoomOut } from '@/store/slices/viewportSlice';
import { Point, Rectangle, Shape } from '@/types';
import { screenToCanvas, canvasToScreen, isPointInRectangle } from '@/utils';

interface CanvasProps {
  shapes: Shape[];
  onShapeClick?: (shapeId: string, event: React.MouseEvent) => void;
  onCanvasClick?: (position: Point, event: React.MouseEvent) => void;
  className?: string;
}

export const Canvas: React.FC<CanvasProps> = ({
  shapes,
  onShapeClick,
  onCanvasClick,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  
  const { zoom, panOffset, canvasSize, visibleBounds } = useAppSelector(
    (state) => state.viewport
  );
  
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point>({ x: 0, y: 0 });

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

  // Render shapes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Apply viewport transformation
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-panOffset.x, -panOffset.y);

    // Filter shapes that are visible in the current viewport
    const visibleShapes = shapes.filter(shape => 
      isShapeInViewport(shape, visibleBounds)
    );

    // Render visible shapes
    visibleShapes.forEach(shape => {
      renderShape(ctx, shape);
    });

    ctx.restore();
  }, [shapes, zoom, panOffset, canvasSize, visibleBounds]);

  const isShapeInViewport = (shape: Shape, viewport: Rectangle): boolean => {
    const shapeRect: Rectangle = {
      x: shape.position.x,
      y: shape.position.y,
      width: shape.dimensions.width,
      height: shape.dimensions.height,
    };

    // Check if shape intersects with viewport
    return !(
      shapeRect.x + shapeRect.width < viewport.x ||
      shapeRect.x > viewport.x + viewport.width ||
      shapeRect.y + shapeRect.height < viewport.y ||
      shapeRect.y > viewport.y + viewport.height
    );
  };

  const renderShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.save();

    // Apply shape style
    ctx.fillStyle = shape.style.fill;
    ctx.strokeStyle = shape.style.stroke;
    ctx.lineWidth = shape.style.strokeWidth;
    ctx.globalAlpha = shape.style.opacity;

    const { x, y } = shape.position;
    const { width, height } = shape.dimensions;

    switch (shape.type) {
      case 'rectangle':
        ctx.fillRect(x, y, width, height);
        if (shape.style.strokeWidth > 0) {
          ctx.strokeRect(x, y, width, height);
        }
        break;

      case 'circle':
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const radius = Math.min(width, height) / 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        if (shape.style.strokeWidth > 0) {
          ctx.stroke();
        }
        break;

      case 'text':
        if (shape.content) {
          ctx.font = `${Math.max(12, height * 0.8)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(shape.content, x + width / 2, y + height / 2);
        }
        break;

      case 'line':
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y + height);
        ctx.stroke();
        break;
    }

    ctx.restore();
  };

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    const canvasPoint = screenToCanvas(screenPoint, zoom, panOffset);

    // Check if clicking on a shape
    const clickedShape = findShapeAtPoint(canvasPoint, shapes);
    
    if (clickedShape && onShapeClick) {
      onShapeClick(clickedShape.id, event);
    } else if (event.button === 0) { // Left mouse button
      if (event.metaKey || event.ctrlKey) {
        // Start panning
        setIsPanning(true);
        setLastPanPoint(screenPoint);
      } else if (onCanvasClick) {
        onCanvasClick(canvasPoint, event);
      }
    } else if (event.button === 1) { // Middle mouse button for panning
      setIsPanning(true);
      setLastPanPoint(screenPoint);
    }
  }, [shapes, zoom, panOffset, onShapeClick, onCanvasClick]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isPanning) return;

    const rect = canvasRef.current?.getBoundingClientRect();
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

    const rect = canvasRef.current?.getBoundingClientRect();
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

  const findShapeAtPoint = (point: Point, shapes: Shape[]): Shape | null => {
    // Check shapes in reverse order (top to bottom)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      const shapeRect: Rectangle = {
        x: shape.position.x,
        y: shape.position.y,
        width: shape.dimensions.width,
        height: shape.dimensions.height,
      };

      if (isPointInRectangle(point, shapeRect)) {
        return shape;
      }
    }
    return null;
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-white ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="cursor-crosshair"
        style={{ display: 'block' }}
      />
      
      {/* Viewport info overlay for debugging */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
        Zoom: {(zoom * 100).toFixed(0)}%<br />
        Pan: ({panOffset.x.toFixed(0)}, {panOffset.y.toFixed(0)})
      </div>
    </div>
  );
};