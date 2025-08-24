'use client';

import React from 'react';
import { Point, Rectangle } from '@/types';
import { SelectionService } from '@/services/selectionService';

interface SelectionOverlayProps {
  isMultiSelecting: boolean;
  selectionRectangle: {
    start: Point;
    end: Point;
  } | null;
  zoom: number;
  panOffset: Point;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  isMultiSelecting,
  selectionRectangle,
  zoom,
  panOffset,
}) => {
  if (!isMultiSelecting || !selectionRectangle) {
    return null;
  }

  const rect = SelectionService.createRectangleFromPoints(
    selectionRectangle.start,
    selectionRectangle.end
  );

  return (
    <div
      className="absolute pointer-events-none border-2 border-blue-500 bg-blue-100 bg-opacity-20"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        transform: `scale(${zoom}) translate(${-panOffset.x}px, ${-panOffset.y}px)`,
        transformOrigin: '0 0',
      }}
    />
  );
};