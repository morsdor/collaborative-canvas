'use client';

import React, { useState, useCallback } from 'react';
import { InteractiveCanvas } from './InteractiveCanvas';
import { Shape, Point } from '@/types';
import { useYjsSync } from '@/hooks/useYjsSync';

interface CanvasContainerProps {
  sessionId?: string;
  className?: string;
}

export const CanvasContainer: React.FC<CanvasContainerProps> = ({ 
  sessionId = 'default-session',
  className 
}) => {
  const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());
  const [localShapes, setLocalShapes] = useState<Shape[]>([]);

  // Use Yjs for real-time collaboration
  const { getAllShapes } = useYjsSync({
    sessionId,
    onShapesChange: (shapes) => {
      setLocalShapes(shapes);
    },
  });

  // Get current shapes (from Yjs or fallback to mock data)
  const shapes = localShapes.length > 0 ? localShapes : getMockShapes();

  const handleShapeClick = useCallback((shapeId: string, event: React.MouseEvent) => {
    console.log('Shape clicked:', shapeId);
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      setSelectedShapeIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(shapeId)) {
          newSet.delete(shapeId);
        } else {
          newSet.add(shapeId);
        }
        return newSet;
      });
    } else {
      // Single select
      setSelectedShapeIds(new Set([shapeId]));
    }
  }, []);

  const handleCanvasClick = useCallback((position: Point) => {
    console.log('Canvas clicked at:', position);
    // Clear selection when clicking on empty canvas
    setSelectedShapeIds(new Set());
  }, []);

  const handleShapeHover = useCallback((shapeId: string | null) => {
    // Could be used for showing shape info or other hover effects
    if (shapeId) {
      console.log('Hovering over shape:', shapeId);
    }
  }, []);

  const handleShapeCreated = useCallback((shape: Shape) => {
    console.log('Shape created:', shape);
    // Shape is automatically added to Yjs document by useShapeCreation hook
    // The onShapesChange callback will update localShapes
  }, []);

  return (
    <InteractiveCanvas
      shapes={shapes}
      selectedShapeIds={selectedShapeIds}
      sessionId={sessionId}
      onShapeClick={handleShapeClick}
      onCanvasClick={handleCanvasClick}
      onShapeHover={handleShapeHover}
      onShapeCreated={handleShapeCreated}
      className={className}
    />
  );
};

/**
 * Mock shapes for testing when no Yjs data is available
 */
function getMockShapes(): Shape[] {
  return [
    {
      id: '1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      dimensions: { width: 200, height: 150 },
      style: {
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2,
        opacity: 1,
      },
    },
    {
      id: '2',
      type: 'circle',
      position: { x: 400, y: 200 },
      dimensions: { width: 120, height: 120 },
      style: {
        fill: '#ef4444',
        stroke: '#dc2626',
        strokeWidth: 2,
        opacity: 0.8,
      },
    },
    {
      id: '3',
      type: 'text',
      position: { x: 200, y: 350 },
      dimensions: { width: 300, height: 50 },
      style: {
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 0,
        opacity: 1,
      },
      content: 'Hello Interactive Canvas!',
    },
  ];
}