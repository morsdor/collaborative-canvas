import { Point, Rectangle, Shape } from '@/types';
import { getShapeBounds, pointInRectangle, rectanglesIntersect } from '@/utils';

/**
 * Service for handling shape selection operations
 */
export class SelectionService {
  /**
   * Find shapes that intersect with a selection rectangle
   */
  static getShapesInRectangle(shapes: Shape[], selectionRect: Rectangle): Shape[] {
    return shapes.filter(shape => {
      const shapeBounds = getShapeBounds(shape);
      return rectanglesIntersect(shapeBounds, selectionRect);
    });
  }

  /**
   * Find the topmost shape at a given point
   */
  static getShapeAtPoint(shapes: Shape[], point: Point): Shape | null {
    // Iterate in reverse order to get the topmost shape (last rendered)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      const bounds = getShapeBounds(shape);
      
      if (pointInRectangle(point, bounds)) {
        return shape;
      }
    }
    
    return null;
  }

  /**
   * Create a normalized rectangle from two points
   */
  static createRectangleFromPoints(start: Point, end: Point): Rectangle {
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Check if a selection rectangle is large enough to be considered intentional
   */
  static isValidSelectionRectangle(rect: Rectangle, minSize = 5): boolean {
    return rect.width >= minSize || rect.height >= minSize;
  }
}