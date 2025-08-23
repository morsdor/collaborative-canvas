import {
  screenToCanvas,
  canvasToScreen,
  isPointInRectangle,
  rectanglesIntersect,
  getBoundingRectangle,
  distance,
  clamp,
  getRectangleCenter,
  snapToGrid,
  calculateViewportBounds,
  isShapeVisible,
} from '../viewport';
import { Point, Rectangle } from '@/types';

describe('Viewport Utilities', () => {
  describe('screenToCanvas', () => {
    it('should convert screen coordinates to canvas coordinates with no zoom or pan', () => {
      const screenPoint: Point = { x: 100, y: 200 };
      const zoom = 1;
      const panOffset: Point = { x: 0, y: 0 };

      const result = screenToCanvas(screenPoint, zoom, panOffset);

      expect(result).toEqual({ x: 100, y: 200 });
    });

    it('should convert screen coordinates with zoom', () => {
      const screenPoint: Point = { x: 200, y: 400 };
      const zoom = 2;
      const panOffset: Point = { x: 0, y: 0 };

      const result = screenToCanvas(screenPoint, zoom, panOffset);

      expect(result).toEqual({ x: 100, y: 200 });
    });

    it('should convert screen coordinates with pan offset', () => {
      const screenPoint: Point = { x: 100, y: 200 };
      const zoom = 1;
      const panOffset: Point = { x: 50, y: 75 };

      const result = screenToCanvas(screenPoint, zoom, panOffset);

      expect(result).toEqual({ x: 150, y: 275 });
    });

    it('should convert screen coordinates with both zoom and pan', () => {
      const screenPoint: Point = { x: 200, y: 400 };
      const zoom = 2;
      const panOffset: Point = { x: 50, y: 75 };

      const result = screenToCanvas(screenPoint, zoom, panOffset);

      expect(result).toEqual({ x: 150, y: 275 });
    });
  });

  describe('canvasToScreen', () => {
    it('should convert canvas coordinates to screen coordinates with no zoom or pan', () => {
      const canvasPoint: Point = { x: 100, y: 200 };
      const zoom = 1;
      const panOffset: Point = { x: 0, y: 0 };

      const result = canvasToScreen(canvasPoint, zoom, panOffset);

      expect(result).toEqual({ x: 100, y: 200 });
    });

    it('should convert canvas coordinates with zoom', () => {
      const canvasPoint: Point = { x: 100, y: 200 };
      const zoom = 2;
      const panOffset: Point = { x: 0, y: 0 };

      const result = canvasToScreen(canvasPoint, zoom, panOffset);

      expect(result).toEqual({ x: 200, y: 400 });
    });

    it('should convert canvas coordinates with pan offset', () => {
      const canvasPoint: Point = { x: 150, y: 275 };
      const zoom = 1;
      const panOffset: Point = { x: 50, y: 75 };

      const result = canvasToScreen(canvasPoint, zoom, panOffset);

      expect(result).toEqual({ x: 100, y: 200 });
    });

    it('should convert canvas coordinates with both zoom and pan', () => {
      const canvasPoint: Point = { x: 150, y: 275 };
      const zoom = 2;
      const panOffset: Point = { x: 50, y: 75 };

      const result = canvasToScreen(canvasPoint, zoom, panOffset);

      expect(result).toEqual({ x: 200, y: 400 });
    });
  });

  describe('coordinate transformation round-trip', () => {
    it('should maintain consistency when converting back and forth', () => {
      const originalScreenPoint: Point = { x: 123.45, y: 678.90 };
      const zoom = 1.5;
      const panOffset: Point = { x: 25.5, y: 37.8 };

      const canvasPoint = screenToCanvas(originalScreenPoint, zoom, panOffset);
      const backToScreen = canvasToScreen(canvasPoint, zoom, panOffset);

      expect(backToScreen.x).toBeCloseTo(originalScreenPoint.x, 10);
      expect(backToScreen.y).toBeCloseTo(originalScreenPoint.y, 10);
    });
  });

  describe('isPointInRectangle', () => {
    const rect: Rectangle = { x: 10, y: 20, width: 100, height: 50 };

    it('should return true for point inside rectangle', () => {
      expect(isPointInRectangle({ x: 50, y: 40 }, rect)).toBe(true);
    });

    it('should return true for point on rectangle edge', () => {
      expect(isPointInRectangle({ x: 10, y: 20 }, rect)).toBe(true);
      expect(isPointInRectangle({ x: 110, y: 70 }, rect)).toBe(true);
    });

    it('should return false for point outside rectangle', () => {
      expect(isPointInRectangle({ x: 5, y: 40 }, rect)).toBe(false);
      expect(isPointInRectangle({ x: 50, y: 15 }, rect)).toBe(false);
      expect(isPointInRectangle({ x: 115, y: 40 }, rect)).toBe(false);
      expect(isPointInRectangle({ x: 50, y: 75 }, rect)).toBe(false);
    });
  });

  describe('rectanglesIntersect', () => {
    const rect1: Rectangle = { x: 0, y: 0, width: 100, height: 100 };

    it('should return true for overlapping rectangles', () => {
      const rect2: Rectangle = { x: 50, y: 50, width: 100, height: 100 };
      expect(rectanglesIntersect(rect1, rect2)).toBe(true);
    });

    it('should return false for touching rectangles', () => {
      const rect2: Rectangle = { x: 101, y: 0, width: 50, height: 50 };
      expect(rectanglesIntersect(rect1, rect2)).toBe(false); // Just touching, not intersecting
    });

    it('should return false for non-intersecting rectangles', () => {
      const rect2: Rectangle = { x: 150, y: 150, width: 50, height: 50 };
      expect(rectanglesIntersect(rect1, rect2)).toBe(false);
    });

    it('should return true for one rectangle inside another', () => {
      const rect2: Rectangle = { x: 25, y: 25, width: 50, height: 50 };
      expect(rectanglesIntersect(rect1, rect2)).toBe(true);
    });
  });

  describe('getBoundingRectangle', () => {
    it('should return null for empty array', () => {
      expect(getBoundingRectangle([])).toBeNull();
    });

    it('should return the same rectangle for single rectangle', () => {
      const rect: Rectangle = { x: 10, y: 20, width: 100, height: 50 };
      expect(getBoundingRectangle([rect])).toEqual(rect);
    });

    it('should return bounding rectangle for multiple rectangles', () => {
      const rects: Rectangle[] = [
        { x: 0, y: 0, width: 50, height: 50 },
        { x: 100, y: 100, width: 50, height: 50 },
        { x: 25, y: 25, width: 25, height: 25 },
      ];

      const result = getBoundingRectangle(rects);
      expect(result).toEqual({ x: 0, y: 0, width: 150, height: 150 });
    });
  });

  describe('distance', () => {
    it('should calculate distance between two points', () => {
      const point1: Point = { x: 0, y: 0 };
      const point2: Point = { x: 3, y: 4 };

      expect(distance(point1, point2)).toBe(5);
    });

    it('should return 0 for same point', () => {
      const point: Point = { x: 10, y: 20 };
      expect(distance(point, point)).toBe(0);
    });
  });

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('getRectangleCenter', () => {
    it('should calculate center of rectangle', () => {
      const rect: Rectangle = { x: 10, y: 20, width: 100, height: 60 };
      const center = getRectangleCenter(rect);

      expect(center).toEqual({ x: 60, y: 50 });
    });
  });

  describe('snapToGrid', () => {
    it('should snap point to grid', () => {
      expect(snapToGrid({ x: 23, y: 47 }, 10)).toEqual({ x: 20, y: 50 });
      expect(snapToGrid({ x: 27, y: 43 }, 10)).toEqual({ x: 30, y: 40 });
    });

    it('should handle exact grid points', () => {
      expect(snapToGrid({ x: 20, y: 40 }, 10)).toEqual({ x: 20, y: 40 });
    });
  });

  describe('calculateViewportBounds', () => {
    it('should calculate viewport bounds correctly', () => {
      const canvasSize = { width: 800, height: 600 };
      const zoom = 2;
      const panOffset: Point = { x: 100, y: 150 };

      const bounds = calculateViewportBounds(canvasSize, zoom, panOffset);

      expect(bounds).toEqual({
        x: 100,
        y: 150,
        width: 400,
        height: 300,
      });
    });
  });

  describe('isShapeVisible', () => {
    const viewport: Rectangle = { x: 0, y: 0, width: 800, height: 600 };

    it('should return true for shape inside viewport', () => {
      const shapePosition: Point = { x: 100, y: 100 };
      const shapeDimensions = { width: 50, height: 50 };

      expect(isShapeVisible(shapePosition, shapeDimensions, viewport)).toBe(true);
    });

    it('should return true for shape partially visible', () => {
      const shapePosition: Point = { x: -25, y: -25 };
      const shapeDimensions = { width: 50, height: 50 };

      expect(isShapeVisible(shapePosition, shapeDimensions, viewport)).toBe(true);
    });

    it('should return false for shape completely outside viewport', () => {
      const shapePosition: Point = { x: 1000, y: 1000 };
      const shapeDimensions = { width: 50, height: 50 };

      expect(isShapeVisible(shapePosition, shapeDimensions, viewport)).toBe(false);
    });

    it('should consider padding when checking visibility', () => {
      const shapePosition: Point = { x: -75, y: -75 };
      const shapeDimensions = { width: 50, height: 50 };
      const padding = 50;

      expect(isShapeVisible(shapePosition, shapeDimensions, viewport, padding)).toBe(true);
    });
  });
});