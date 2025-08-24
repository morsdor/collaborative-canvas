import { SelectionService } from '../selectionService';
import { Shape, Point, Rectangle } from '@/types';

describe('SelectionService', () => {
  const mockShapes: Shape[] = [
    {
      id: 'shape1',
      type: 'rectangle',
      position: { x: 10, y: 10 },
      dimensions: { width: 50, height: 30 },
      style: { fill: '#ff0000', stroke: '#000000', strokeWidth: 1, opacity: 1 },
    },
    {
      id: 'shape2',
      type: 'circle',
      position: { x: 100, y: 50 },
      dimensions: { width: 40, height: 40 },
      style: { fill: '#00ff00', stroke: '#000000', strokeWidth: 1, opacity: 1 },
    },
    {
      id: 'shape3',
      type: 'rectangle',
      position: { x: 200, y: 100 },
      dimensions: { width: 60, height: 40 },
      style: { fill: '#0000ff', stroke: '#000000', strokeWidth: 1, opacity: 1 },
    },
  ];

  describe('getShapesInRectangle', () => {
    it('should return shapes that intersect with selection rectangle', () => {
      const selectionRect: Rectangle = { x: 0, y: 0, width: 70, height: 50 };
      
      const result = SelectionService.getShapesInRectangle(mockShapes, selectionRect);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('shape1');
    });

    it('should return multiple shapes when selection rectangle covers them', () => {
      const selectionRect: Rectangle = { x: 0, y: 0, width: 150, height: 100 };
      
      const result = SelectionService.getShapesInRectangle(mockShapes, selectionRect);
      
      expect(result).toHaveLength(2);
      expect(result.map(s => s.id)).toContain('shape1');
      expect(result.map(s => s.id)).toContain('shape2');
    });

    it('should return empty array when no shapes intersect', () => {
      const selectionRect: Rectangle = { x: 300, y: 300, width: 50, height: 50 };
      
      const result = SelectionService.getShapesInRectangle(mockShapes, selectionRect);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getShapeAtPoint', () => {
    it('should return the topmost shape at a given point', () => {
      const point: Point = { x: 30, y: 25 };
      
      const result = SelectionService.getShapeAtPoint(mockShapes, point);
      
      expect(result?.id).toBe('shape1');
    });

    it('should return null when no shape is at the point', () => {
      const point: Point = { x: 300, y: 300 };
      
      const result = SelectionService.getShapeAtPoint(mockShapes, point);
      
      expect(result).toBeNull();
    });

    it('should return the last shape when multiple shapes overlap', () => {
      const overlappingShapes: Shape[] = [
        ...mockShapes,
        {
          id: 'shape4',
          type: 'rectangle',
          position: { x: 5, y: 5 },
          dimensions: { width: 70, height: 50 },
          style: { fill: '#ffff00', stroke: '#000000', strokeWidth: 1, opacity: 1 },
        },
      ];
      
      const point: Point = { x: 30, y: 25 };
      
      const result = SelectionService.getShapeAtPoint(overlappingShapes, point);
      
      expect(result?.id).toBe('shape4'); // Last in array should be topmost
    });
  });

  describe('createRectangleFromPoints', () => {
    it('should create normalized rectangle from two points', () => {
      const start: Point = { x: 50, y: 30 };
      const end: Point = { x: 10, y: 80 };
      
      const result = SelectionService.createRectangleFromPoints(start, end);
      
      expect(result).toEqual({
        x: 10,
        y: 30,
        width: 40,
        height: 50,
      });
    });

    it('should handle points in any order', () => {
      const start: Point = { x: 10, y: 80 };
      const end: Point = { x: 50, y: 30 };
      
      const result = SelectionService.createRectangleFromPoints(start, end);
      
      expect(result).toEqual({
        x: 10,
        y: 30,
        width: 40,
        height: 50,
      });
    });

    it('should create zero-size rectangle for same points', () => {
      const point: Point = { x: 25, y: 25 };
      
      const result = SelectionService.createRectangleFromPoints(point, point);
      
      expect(result).toEqual({
        x: 25,
        y: 25,
        width: 0,
        height: 0,
      });
    });
  });

  describe('isValidSelectionRectangle', () => {
    it('should return true for rectangles larger than minimum size', () => {
      const rect: Rectangle = { x: 0, y: 0, width: 10, height: 3 };
      
      const result = SelectionService.isValidSelectionRectangle(rect, 5);
      
      expect(result).toBe(true);
    });

    it('should return false for rectangles smaller than minimum size', () => {
      const rect: Rectangle = { x: 0, y: 0, width: 3, height: 2 };
      
      const result = SelectionService.isValidSelectionRectangle(rect, 5);
      
      expect(result).toBe(false);
    });

    it('should use default minimum size of 5', () => {
      const rect: Rectangle = { x: 0, y: 0, width: 5, height: 1 };
      
      const result = SelectionService.isValidSelectionRectangle(rect);
      
      expect(result).toBe(true);
    });

    it('should return true if either width or height meets minimum', () => {
      const rect1: Rectangle = { x: 0, y: 0, width: 10, height: 2 };
      const rect2: Rectangle = { x: 0, y: 0, width: 2, height: 10 };
      
      expect(SelectionService.isValidSelectionRectangle(rect1, 5)).toBe(true);
      expect(SelectionService.isValidSelectionRectangle(rect2, 5)).toBe(true);
    });
  });
});