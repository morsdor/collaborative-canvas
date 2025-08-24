import React from 'react';
import { Shape, Point } from '@/types';
import { RectangleShape, CircleShape, TextShape, LineShape } from './shapes';
import { DraggableShape } from './DraggableShape';

interface ShapeFactoryProps {
  shape: Shape;
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
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
  isDragging = false,
  onShapeMouseDown,
  onShapeMouseEnter,
  onShapeMouseLeave,
  zoom,
  panOffset,
}) => {
  const renderShapeContent = () => {
    const shapeProps = { shape, isHovered };

    switch (shape.type) {
      case 'rectangle':
        return (
          <div
            className={`w-full h-full transition-all duration-150 ${
              isHovered ? 'brightness-110' : ''
            }`}
            style={{
              backgroundColor: shape.style.fill,
              border: shape.style.strokeWidth > 0 ? `${shape.style.strokeWidth}px solid ${shape.style.stroke}` : 'none',
              opacity: shape.style.opacity,
            }}
          />
        );
      case 'circle':
        return (
          <div
            className={`w-full h-full rounded-full transition-all duration-150 ${
              isHovered ? 'brightness-110' : ''
            }`}
            style={{
              backgroundColor: shape.style.fill,
              border: shape.style.strokeWidth > 0 ? `${shape.style.strokeWidth}px solid ${shape.style.stroke}` : 'none',
              opacity: shape.style.opacity,
            }}
          />
        );
      case 'text':
        return (
          <div
            className={`w-full h-full flex items-center justify-center transition-all duration-150 ${
              isHovered ? 'brightness-110' : ''
            }`}
            style={{
              color: shape.style.fill,
              fontSize: `${Math.max(12, shape.dimensions.height * 0.6)}px`,
              fontWeight: 'normal',
              opacity: shape.style.opacity,
            }}
          >
            {shape.content || 'Text'}
          </div>
        );
      case 'line':
        return (
          <svg
            className={`w-full h-full transition-all duration-150 ${
              isHovered ? 'brightness-110' : ''
            }`}
            style={{ opacity: shape.style.opacity }}
          >
            <line
              x1="0"
              y1="0"
              x2={shape.dimensions.width}
              y2={shape.dimensions.height}
              stroke={shape.style.stroke}
              strokeWidth={shape.style.strokeWidth}
            />
          </svg>
        );
      default:
        console.warn(`Unknown shape type: ${shape.type}`);
        return null;
    }
  };

  return (
    <DraggableShape
      shape={shape}
      isSelected={isSelected}
      isHovered={isHovered}
      isDragging={isDragging}
      onMouseDown={onShapeMouseDown ? (event) => onShapeMouseDown(shape.id, event) : undefined}
      onMouseEnter={onShapeMouseEnter ? (event) => onShapeMouseEnter(shape.id, event) : undefined}
      onMouseLeave={onShapeMouseLeave ? (event) => onShapeMouseLeave(shape.id, event) : undefined}
      zoom={zoom}
      panOffset={panOffset}
    >
      {renderShapeContent()}
    </DraggableShape>
  );
};