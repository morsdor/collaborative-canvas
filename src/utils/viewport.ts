import { Point, Rectangle } from '@/types';

/**
 * Convert screen coordinates to canvas world coordinates
 * Note: This uses the correct viewport transformation order
 */
export function screenToCanvas(
  screenPoint: Point,
  zoom: number,
  panOffset: Point
): Point {
  return {
    x: screenPoint.x / zoom + panOffset.x,
    y: screenPoint.y / zoom + panOffset.y,
  };
}

/**
 * Convert canvas world coordinates to screen coordinates
 * Note: This uses the correct viewport transformation order
 */
export function canvasToScreen(
  canvasPoint: Point,
  zoom: number,
  panOffset: Point
): Point {
  return {
    x: (canvasPoint.x - panOffset.x) * zoom,
    y: (canvasPoint.y - panOffset.y) * zoom,
  };
}

/**
 * Check if a point is inside a rectangle
 */
export function isPointInRectangle(point: Point, rect: Rectangle): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Check if two rectangles intersect
 */
export function rectanglesIntersect(rect1: Rectangle, rect2: Rectangle): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect1.x > rect2.x + rect2.width ||
    rect1.y + rect1.height < rect2.y ||
    rect1.y > rect2.y + rect2.height
  );
}

/**
 * Calculate the bounding rectangle that contains all given rectangles
 */
export function getBoundingRectangle(rectangles: Rectangle[]): Rectangle | null {
  if (rectangles.length === 0) return null;

  let minX = rectangles[0].x;
  let minY = rectangles[0].y;
  let maxX = rectangles[0].x + rectangles[0].width;
  let maxY = rectangles[0].y + rectangles[0].height;

  for (let i = 1; i < rectangles.length; i++) {
    const rect = rectangles[i];
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate distance between two points
 */
export function distance(point1: Point, point2: Point): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate the center point of a rectangle
 */
export function getRectangleCenter(rect: Rectangle): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

/**
 * Snap a point to a grid
 */
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Calculate viewport bounds based on canvas size, zoom, and pan offset
 */
export function calculateViewportBounds(
  canvasSize: { width: number; height: number },
  zoom: number,
  panOffset: Point
): Rectangle {
  return {
    x: panOffset.x,
    y: panOffset.y,
    width: canvasSize.width / zoom,
    height: canvasSize.height / zoom,
  };
}

/**
 * Check if a shape is visible in the current viewport (with some padding for performance)
 */
export function isShapeVisible(
  shapePosition: Point,
  shapeDimensions: { width: number; height: number },
  viewport: Rectangle,
  padding: number = 50
): boolean {
  const expandedViewport: Rectangle = {
    x: viewport.x - padding,
    y: viewport.y - padding,
    width: viewport.width + padding * 2,
    height: viewport.height + padding * 2,
  };

  const shapeRect: Rectangle = {
    x: shapePosition.x,
    y: shapePosition.y,
    width: shapeDimensions.width,
    height: shapeDimensions.height,
  };

  return rectanglesIntersect(shapeRect, expandedViewport);
}