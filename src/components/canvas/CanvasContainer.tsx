'use client';

import React, { useState, useCallback } from 'react';
import { InteractiveCanvas } from './InteractiveCanvas';
import { Shape, Point } from '@/types';
import { useYjsSync } from '@/hooks/useYjsSync';

interface CanvasContainerProps {
  sessionId?: string;
  className?: string;
  onShapesChange?: (shapes: Shape[]) => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onStyleChange?: (shapeIds: string[], style: Partial<Shape['style']>) => void;
}

export const CanvasContainer: React.FC<CanvasContainerProps> = ({ 
  sessionId = 'default-session',
  className,
  onShapesChange,
  onSelectionChange,
  onStyleChange
}) => {
  const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());
  const [localShapes, setLocalShapes] = useState<Shape[]>([]);

  // Use Yjs for real-time collaboration
  const { updateShape } = useYjsSync({
    sessionId,
    onShapesChange: (shapes) => {
      setLocalShapes(shapes);
      if (onShapesChange) {
        onShapesChange(shapes);
      }
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
        if (onSelectionChange) {
          onSelectionChange(newSet);
        }
        return newSet;
      });
    } else {
      // Single select
      const newSelectedIds = new Set([shapeId]);
      setSelectedShapeIds(newSelectedIds);
      if (onSelectionChange) {
        onSelectionChange(newSelectedIds);
      }
    }
  }, [onSelectionChange]);

  const handleCanvasClick = useCallback((position: Point) => {
    console.log('Canvas clicked at:', position);
    // Clear selection when clicking on empty canvas
    const emptySet = new Set<string>();
    setSelectedShapeIds(emptySet);
    if (onSelectionChange) {
      onSelectionChange(emptySet);
    }
  }, [onSelectionChange]);

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

  const handleShapeUpdate = useCallback((id: string, updates: Partial<Shape>) => {
    console.log('Shape updated:', id, updates);
    updateShape(id, updates);
  }, [updateShape]);

  const handleShapeStyleChange = useCallback((shapeIds: string[], styleUpdates: Partial<Shape['style']>) => {
    console.log('Style updated for shapes:', shapeIds, styleUpdates);
    shapeIds.forEach(id => {
      const shape = shapes.find(s => s.id === id);
      if (shape) {
        updateShape(id, {
          style: { ...shape.style, ...styleUpdates }
        });
      }
    });
    
    // Also call the external callback if provided
    if (onStyleChange) {
      onStyleChange(shapeIds, styleUpdates);
    }
  }, [shapes, updateShape, onStyleChange]);

  return (
    <InteractiveCanvas
      shapes={shapes}
      selectedShapeIds={selectedShapeIds}
      sessionId={sessionId}
      onShapeClick={handleShapeClick}
      onCanvasClick={handleCanvasClick}
      onShapeHover={handleShapeHover}
      onShapeCreated={handleShapeCreated}
      onShapeUpdate={handleShapeUpdate}
      onShapeStyleChange={handleShapeStyleChange}
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