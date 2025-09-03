import React from 'react';
import { Shape, Point, Size, TextStyle } from '@/types';
import { RectangleShape, CircleShape, TextShape, LineShape } from './shapes';
import { DraggableShape } from './DraggableShape';
import { ResizeHandle } from '@/hooks/useShapeResize';

interface ShapeFactoryProps {
  shape: Shape;
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  isEditing?: boolean;
  onShapeMouseDown?: (shapeId: string, event: React.MouseEvent) => void;
  onShapeMouseEnter?: (shapeId: string, event: React.MouseEvent) => void;
  onShapeMouseLeave?: (shapeId: string, event: React.MouseEvent) => void;
  onResizeStart?: (handle: ResizeHandle, mousePos: Point) => void;
  onResize?: (newDimensions: Size, newPosition?: Point) => void;
  onResizeEnd?: () => void;
  onStartTextEdit?: (shapeId: string) => void;
  onFinishTextEdit?: (shapeId: string, content: string) => void;
  onCancelTextEdit?: (shapeId: string) => void;
  onTextStyleChange?: (shapeId: string, textStyle: Partial<TextStyle>) => void;
  zoom: number;
  panOffset: Point;
}

export const ShapeFactory: React.FC<ShapeFactoryProps> = ({
  shape,
  isSelected = false,
  isHovered = false,
  isDragging = false,
  isResizing = false,
  isEditing = false,
  onShapeMouseDown,
  onShapeMouseEnter,
  onShapeMouseLeave,
  onResizeStart,
  onResize,
  onResizeEnd,
  onStartTextEdit,
  onFinishTextEdit,
  onCancelTextEdit,
  onTextStyleChange,
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
          <TextShape
            shape={shape}
            isHovered={isHovered}
            isEditing={isEditing}
            onStartEdit={onStartTextEdit ? () => onStartTextEdit(shape.id) : undefined}
            onFinishEdit={onFinishTextEdit ? (content) => onFinishTextEdit(shape.id, content) : undefined}
            onCancelEdit={onCancelTextEdit ? () => onCancelTextEdit(shape.id) : undefined}
          />
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
      isResizing={isResizing}
      onMouseDown={onShapeMouseDown ? (event) => onShapeMouseDown(shape.id, event) : undefined}
      onMouseEnter={onShapeMouseEnter ? (event) => onShapeMouseEnter(shape.id, event) : undefined}
      onMouseLeave={onShapeMouseLeave ? (event) => onShapeMouseLeave(shape.id, event) : undefined}
      onResizeStart={onResizeStart}
      onResize={onResize}
      onResizeEnd={onResizeEnd}
      zoom={zoom}
      panOffset={panOffset}
    >
      {renderShapeContent()}
    </DraggableShape>
  );
};