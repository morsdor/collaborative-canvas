'use client';

import React, { useState } from 'react';
import { InteractiveCanvas } from './InteractiveCanvas';
import { Shape, Point } from '@/types';

interface CanvasContainerProps {
  className?: string;
}

export const CanvasContainer: React.FC<CanvasContainerProps> = ({ className }) => {
  const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());

  // Mock shapes with more variety for testing
  const mockShapes: Shape[] = [
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
    {
      id: '4',
      type: 'line',
      position: { x: 500, y: 100 },
      dimensions: { width: 150, height: 100 },
      style: {
        fill: '#000000',
        stroke: '#22c55e',
        strokeWidth: 3,
        opacity: 1,
      },
    },
    {
      id: '5',
      type: 'rectangle',
      position: { x: 50, y: 500 },
      dimensions: { width: 100, height: 80 },
      style: {
        fill: '#f59e0b',
        stroke: '#d97706',
        strokeWidth: 1,
        opacity: 0.9,
      },
    },
  ];

  const handleShapeClick = (shapeId: string, event: React.MouseEvent) => {
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
  };

  const handleCanvasClick = (position: Point, event: React.MouseEvent) => {
    console.log('Canvas clicked at:', position);
    // Clear selection when clicking on empty canvas
    setSelectedShapeIds(new Set());
  };

  const handleShapeHover = (shapeId: string | null) => {
    // Could be used for showing shape info or other hover effects
    if (shapeId) {
      console.log('Hovering over shape:', shapeId);
    }
  };

  return (
    <InteractiveCanvas
      shapes={mockShapes}
      selectedShapeIds={selectedShapeIds}
      onShapeClick={handleShapeClick}
      onCanvasClick={handleCanvasClick}
      onShapeHover={handleShapeHover}
      className={className}
    />
  );
};