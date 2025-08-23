import React from 'react';
import { Shape, Point } from '@/types';

export interface BaseShapeProps {
  shape: Shape;
  isSelected?: boolean;
  isHovered?: boolean;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
  zoom: number;
  panOffset: Point;
}

export interface ShapeRendererProps extends BaseShapeProps {
  children?: React.ReactNode;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shape,
  isSelected = false,
  isHovered = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  zoom,
  panOffset,
  children,
}) => {
  const { position, dimensions } = shape;
  
  // Calculate screen position
  const screenX = (position.x - panOffset.x) * zoom;
  const screenY = (position.y - panOffset.y) * zoom;
  const screenWidth = dimensions.width * zoom;
  const screenHeight = dimensions.height * zoom;

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: screenX,
        top: screenY,
        width: screenWidth,
        height: screenHeight,
        transform: 'translate3d(0, 0, 0)', // Force GPU acceleration
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
      
      {/* Selection indicator */}
      {isSelected && (
        <div
          className="absolute inset-0 border-2 border-blue-500 pointer-events-none"
          style={{
            borderRadius: shape.type === 'circle' ? '50%' : '0',
          }}
        >
          {/* Resize handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-nw-resize" />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-n-resize" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-ne-resize" />
          <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-e-resize" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-se-resize" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-s-resize" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-sw-resize" />
          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-w-resize" />
        </div>
      )}
      
      {/* Hover indicator */}
      {isHovered && !isSelected && (
        <div
          className="absolute inset-0 border border-blue-300 pointer-events-none"
          style={{
            borderRadius: shape.type === 'circle' ? '50%' : '0',
          }}
        />
      )}
    </div>
  );
};