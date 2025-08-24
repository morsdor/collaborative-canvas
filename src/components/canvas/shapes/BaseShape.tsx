import React, { useCallback } from 'react';
import { Shape, Point } from '@/types';
import { useResizeHandle, ResizeHandle } from '@/hooks/useShapeResize';

export interface BaseShapeProps {
  shape: Shape;
  isSelected?: boolean;
  isHovered?: boolean;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
  onResizeStart?: (handle: ResizeHandle, mousePos: Point) => void;
  zoom: number;
  panOffset: Point;
}

export interface ShapeRendererProps extends BaseShapeProps {
  children?: React.ReactNode;
}

interface ResizeHandleComponentProps {
  handle: ResizeHandle;
  onResizeStart: (handle: ResizeHandle, mousePos: Point) => void;
  className: string;
}

const ResizeHandleComponent: React.FC<ResizeHandleComponentProps> = ({
  handle,
  onResizeStart,
  className,
}) => {
  const { setNodeRef, attributes, listeners } = useResizeHandle(handle, onResizeStart);

  return (
    <div
      ref={setNodeRef}
      className={`absolute w-2 h-2 bg-blue-500 border border-white pointer-events-auto ${className}`}
      {...attributes}
      {...listeners}
    />
  );
};

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shape,
  isSelected = false,
  isHovered = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onResizeStart,
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

  const handleResizeStart = useCallback((handle: ResizeHandle, mousePos: Point) => {
    if (onResizeStart) {
      onResizeStart(handle, mousePos);
    }
  }, [onResizeStart]);

  return (
    <div
      data-testid={`shape-${shape.id}`}
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
          {onResizeStart && (
            <>
              <ResizeHandleComponent
                handle="nw"
                onResizeStart={handleResizeStart}
                className="-top-1 -left-1 cursor-nw-resize"
              />
              <ResizeHandleComponent
                handle="n"
                onResizeStart={handleResizeStart}
                className="-top-1 left-1/2 -translate-x-1/2 cursor-n-resize"
              />
              <ResizeHandleComponent
                handle="ne"
                onResizeStart={handleResizeStart}
                className="-top-1 -right-1 cursor-ne-resize"
              />
              <ResizeHandleComponent
                handle="e"
                onResizeStart={handleResizeStart}
                className="top-1/2 -translate-y-1/2 -right-1 cursor-e-resize"
              />
              <ResizeHandleComponent
                handle="se"
                onResizeStart={handleResizeStart}
                className="-bottom-1 -right-1 cursor-se-resize"
              />
              <ResizeHandleComponent
                handle="s"
                onResizeStart={handleResizeStart}
                className="-bottom-1 left-1/2 -translate-x-1/2 cursor-s-resize"
              />
              <ResizeHandleComponent
                handle="sw"
                onResizeStart={handleResizeStart}
                className="-bottom-1 -left-1 cursor-sw-resize"
              />
              <ResizeHandleComponent
                handle="w"
                onResizeStart={handleResizeStart}
                className="top-1/2 -translate-y-1/2 -left-1 cursor-w-resize"
              />
            </>
          )}
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