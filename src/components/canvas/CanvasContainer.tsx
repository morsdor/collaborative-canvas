'use client';

import React from 'react';
import { Canvas } from './Canvas';
import { useAppSelector } from '@/hooks/redux';
import { Shape, Point } from '@/types';

interface CanvasContainerProps {
  className?: string;
}

export const CanvasContainer: React.FC<CanvasContainerProps> = ({ className }) => {
  // For now, we'll use mock shapes until the Yjs integration is complete
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
      content: 'Hello Canvas!',
    },
  ];

  const handleShapeClick = (shapeId: string, event: React.MouseEvent) => {
    console.log('Shape clicked:', shapeId, event);
    // TODO: Implement shape selection logic
  };

  const handleCanvasClick = (position: Point, event: React.MouseEvent) => {
    console.log('Canvas clicked at:', position, event);
    // TODO: Implement shape creation logic
  };

  return (
    <Canvas
      shapes={mockShapes}
      onShapeClick={handleShapeClick}
      onCanvasClick={handleCanvasClick}
      className={className}
    />
  );
};