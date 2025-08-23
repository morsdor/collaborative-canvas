import React from 'react';
import { Shape, Point } from '@/types';
import { RectangleShape, CircleShape, TextShape, LineShape } from './shapes';
import type { BaseShapeProps } from './shapes';

interface ShapeFactoryProps {
  shape: Shape;
  isSelected?: boolean;
  isHovered?: boolean;
  onShapeMouseDown?: (shapeId: string, event: React.MouseEvent) => void;
  onShapeMouseEnter?: (shapeId: string, event: React.MouseEvent) => void;
  onShapeMouseLeave?: (shapeId: string, event: React.MouseEvent) => void;
  zoom: number;
  panOffset: Point;
}

export const ShapeFactory: React.FC<ShapeFactoryProps> = ({
  shape,
  isSelected = false,
  isHovered = false,
  onShapeMouseDown,
  onShapeMouseEnter,
  onShapeMouseLeave,
  zoom,
  panOffset,
}) => {
  const baseProps: BaseShapeProps = {
    shape,
    isSelected,
    isHovered,
    zoom,
    panOffset,
    onMouseDown: onShapeMouseDown ? (event) => onShapeMouseDown(shape.id, event) : undefined,
    onMouseEnter: onShapeMouseEnter ? (event) => onShapeMouseEnter(shape.id, event) : undefined,
    onMouseLeave: onShapeMouseLeave ? (event) => onShapeMouseLeave(shape.id, event) : undefined,
  };

  switch (shape.type) {
    case 'rectangle':
      return <RectangleShape {...baseProps} />;
    case 'circle':
      return <CircleShape {...baseProps} />;
    case 'text':
      return <TextShape {...baseProps} />;
    case 'line':
      return <LineShape {...baseProps} />;
    default:
      console.warn(`Unknown shape type: ${shape.type}`);
      return null;
  }
};