'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useAppSelector } from '@/hooks/redux';
import { Shape, Rectangle, Point } from '@/types';
import { performanceOptimizer, PerformanceMetrics } from '@/lib/utils/performanceOptimizer';
import { isShapeVisible } from '@/utils/viewport';

interface VirtualizedCanvasProps {
  shapes: Shape[];
  onShapeClick?: (shapeId: string, event: React.MouseEvent) => void;
  onCanvasClick?: (position: Point, event: React.MouseEvent) => void;
  className?: string;
  enableSpatialIndexing?: boolean;
  enableLevelOfDetail?: boolean;
  cullingPadding?: number;
}

interface RenderLayer {
  fullDetail: Shape[];
  simplified: Shape[];
  placeholder: Shape[];
}

export const VirtualizedCanvas: React.FC<VirtualizedCanvasProps> = ({
  shapes,
  onShapeClick,
  onCanvasClick,
  className = '',
  enableSpatialIndexing = true,
  enableLevelOfDetail = true,
  cullingPadding = 100,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  
  const { zoom, panOffset, canvasSize, visibleBounds } = useAppSelector(
    (state) => state.viewport
  );
  
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    frameTime: 16.67,
    renderTime: 0,
    visibleShapes: 0,
    totalShapes: 0,
    culledShapes: 0,
    fps: 60,
  });

  // Create spatial index for efficient shape querying
  const spatialIndex = useMemo(() => {
    if (!enableSpatialIndexing) return null;
    return performanceOptimizer.createSpatialIndex(shapes, 500);
  }, [shapes, enableSpatialIndexing]);

  // Cull shapes that are not visible
  const { visibleShapes, culledShapes } = useMemo(() => {
    if (spatialIndex) {
      // Use spatial indexing for efficient querying
      const queriedShapes = performanceOptimizer.queryShapesInArea(
        spatialIndex,
        visibleBounds,
        500
      );
      
      return {
        visibleShapes: queriedShapes,
        culledShapes: shapes.filter(shape => !queriedShapes.includes(shape)),
      };
    } else {
      // Fallback to simple culling
      return performanceOptimizer.cullShapes(shapes, visibleBounds, zoom, cullingPadding);
    }
  }, [shapes, visibleBounds, zoom, cullingPadding, spatialIndex]);

  // Apply level of detail rendering
  const renderLayers: RenderLayer = useMemo(() => {
    if (!enableLevelOfDetail) {
      return {
        fullDetail: visibleShapes,
        simplified: [],
        placeholder: [],
      };
    }

    const { fullDetailShapes, simplifiedShapes, placeholderShapes } = 
      performanceOptimizer.applyLevelOfDetail(visibleShapes, zoom, performanceMetrics.fps);

    return {
      fullDetail: fullDetailShapes,
      simplified: simplifiedShapes,
      placeholder: placeholderShapes,
    };
  }, [visibleShapes, zoom, performanceMetrics.fps, enableLevelOfDetail]);

  // Render function with performance monitoring
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Start performance measurement
    performanceOptimizer.startRenderMeasurement();

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Apply viewport transformation
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-panOffset.x, -panOffset.y);

    // Render shapes by detail level
    renderShapeLayer(ctx, renderLayers.placeholder, 'placeholder');
    renderShapeLayer(ctx, renderLayers.simplified, 'simplified');
    renderShapeLayer(ctx, renderLayers.fullDetail, 'full');

    ctx.restore();

    // End performance measurement and update metrics
    const metrics = performanceOptimizer.endRenderMeasurement();
    metrics.visibleShapes = visibleShapes.length;
    metrics.totalShapes = shapes.length;
    metrics.culledShapes = culledShapes.length;
    
    setPerformanceMetrics(metrics);

    // Analyze performance and log suggestions if needed
    const analysis = performanceOptimizer.analyzePerformance(metrics);
    if (analysis.status !== 'good') {
      console.warn(`Canvas performance ${analysis.status}:`, analysis.suggestions);
    }
  }, [shapes, zoom, panOffset, canvasSize, visibleShapes, culledShapes, renderLayers]);

  // Render shapes with different levels of detail
  const renderShapeLayer = useCallback((
    ctx: CanvasRenderingContext2D,
    shapes: Shape[],
    detailLevel: 'full' | 'simplified' | 'placeholder'
  ) => {
    for (const shape of shapes) {
      ctx.save();

      // Apply shape style based on detail level
      if (detailLevel === 'placeholder') {
        // Render as simple colored rectangle
        ctx.fillStyle = shape.style.fill;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(
          shape.position.x,
          shape.position.y,
          shape.dimensions.width,
          shape.dimensions.height
        );
      } else if (detailLevel === 'simplified') {
        // Render with reduced detail
        ctx.fillStyle = shape.style.fill;
        ctx.strokeStyle = shape.style.stroke;
        ctx.lineWidth = Math.max(1, shape.style.strokeWidth);
        ctx.globalAlpha = shape.style.opacity;

        renderSimplifiedShape(ctx, shape);
      } else {
        // Full detail rendering
        ctx.fillStyle = shape.style.fill;
        ctx.strokeStyle = shape.style.stroke;
        ctx.lineWidth = shape.style.strokeWidth;
        ctx.globalAlpha = shape.style.opacity;

        renderFullDetailShape(ctx, shape);
      }

      ctx.restore();
    }
  }, []);

  // Render shape with full detail
  const renderFullDetailShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
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
  }, []);

  // Render shape with simplified detail
  const renderSimplifiedShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    const { x, y } = shape.position;
    const { width, height } = shape.dimensions;

    // All shapes rendered as rectangles in simplified mode
    ctx.fillRect(x, y, width, height);
    
    // Only render stroke if it's thick enough to be visible
    if (shape.style.strokeWidth > 2) {
      ctx.strokeRect(x, y, width, height);
    }
  }, []);

  // Handle mouse events with spatial indexing for efficient hit testing
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenPoint: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // Convert to canvas coordinates
    const canvasPoint: Point = {
      x: screenPoint.x / zoom + panOffset.x,
      y: screenPoint.y / zoom + panOffset.y,
    };

    // Find clicked shape using spatial indexing if available
    let clickedShape: Shape | null = null;
    
    if (spatialIndex) {
      // Query a small area around the click point
      const queryArea: Rectangle = {
        x: canvasPoint.x - 5,
        y: canvasPoint.y - 5,
        width: 10,
        height: 10,
      };
      
      const nearbyShapes = performanceOptimizer.queryShapesInArea(spatialIndex, queryArea, 500);
      clickedShape = findShapeAtPoint(canvasPoint, nearbyShapes);
    } else {
      clickedShape = findShapeAtPoint(canvasPoint, visibleShapes);
    }

    if (clickedShape && onShapeClick) {
      onShapeClick(clickedShape.id, event);
    } else if (onCanvasClick) {
      onCanvasClick(canvasPoint, event);
    }
  }, [zoom, panOffset, spatialIndex, visibleShapes, onShapeClick, onCanvasClick]);

  // Find shape at a specific point
  const findShapeAtPoint = useCallback((point: Point, shapes: Shape[]): Shape | null => {
    // Check shapes in reverse order (top to bottom)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (
        point.x >= shape.position.x &&
        point.x <= shape.position.x + shape.dimensions.width &&
        point.y >= shape.position.y &&
        point.y <= shape.position.y + shape.dimensions.height
      ) {
        return shape;
      }
    }
    return null;
  }, []);

  // Render loop with requestAnimationFrame
  useEffect(() => {
    const renderLoop = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  // Performance status for debugging
  const performanceStatus = performanceOptimizer.getPerformanceStatus();

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-white ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        className="cursor-crosshair"
        style={{ display: 'block' }}
      />
      
      {/* Performance overlay */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
        <div>FPS: {performanceMetrics.fps.toFixed(1)}</div>
        <div>Render: {performanceMetrics.renderTime.toFixed(1)}ms</div>
        <div>Visible: {performanceMetrics.visibleShapes}/{performanceMetrics.totalShapes}</div>
        <div>Culled: {performanceMetrics.culledShapes}</div>
        <div>Zoom: {(zoom * 100).toFixed(0)}%</div>
        {enableLevelOfDetail && (
          <>
            <div>Full: {renderLayers.fullDetail.length}</div>
            <div>Simplified: {renderLayers.simplified.length}</div>
            <div>Placeholder: {renderLayers.placeholder.length}</div>
          </>
        )}
        <div className={`mt-1 px-1 rounded text-xs ${
          performanceStatus.isPerformanceGood ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {performanceStatus.isPerformanceGood ? 'GOOD' : 'POOR'}
        </div>
      </div>
    </div>
  );
};