import { ShapeCreationService } from '../shapeCreationService';
import { ShapeType, Point } from '@/types';

describe('ShapeCreationService', () => {
  describe('createShape', () => {
    it('should create a rectangle with default properties', () => {
      const position: Point = { x: 100, y: 200 };
      const shape = ShapeCreationService.createShape({
        type: 'rectangle',
        position,
      });

      expect(shape.type).toBe('rectangle');
      expect(shape.position).toEqual(position);
      expect(shape.dimensions).toEqual({ width: 100, height: 80 });
      expect(shape.style.fill).toBe('#3b82f6');
      expect(shape.style.stroke).toBe('#1e40af');
      expect(shape.id).toBeDefined();
      expect(typeof shape.id).toBe('string');
    });

    it('should create a circle with correct default dimensions', () => {
      const position: Point = { x: 50, y: 75 };
      const shape = ShapeCreationService.createShape({
        type: 'circle',
        position,
      });

      expect(shape.type).toBe('circle');
      expect(shape.dimensions).toEqual({ width: 80, height: 80 });
      expect(shape.style.fill).toBe('#3b82f6');
    });

    it('should create a text shape with default content', () => {
      const position: Point = { x: 0, y: 0 };
      const shape = ShapeCreationService.createShape({
        type: 'text',
        position,
      });

      expect(shape.type).toBe('text');
      expect(shape.content).toBe('Text');
      expect(shape.dimensions).toEqual({ width: 200, height: 40 });
    });

    it('should create a text shape with custom content', () => {
      const position: Point = { x: 0, y: 0 };
      const customContent = 'Custom Text';
      const shape = ShapeCreationService.createShape({
        type: 'text',
        position,
        content: customContent,
      });

      expect(shape.content).toBe(customContent);
    });

    it('should create a line with correct default properties', () => {
      const position: Point = { x: 10, y: 20 };
      const shape = ShapeCreationService.createShape({
        type: 'line',
        position,
      });

      expect(shape.type).toBe('line');
      expect(shape.dimensions).toEqual({ width: 100, height: 2 });
    });

    it('should merge custom style with default style', () => {
      const position: Point = { x: 0, y: 0 };
      const customStyle = {
        fill: '#ff0000',
        opacity: 0.5,
      };

      const shape = ShapeCreationService.createShape({
        type: 'rectangle',
        position,
        style: customStyle,
      });

      expect(shape.style.fill).toBe('#ff0000');
      expect(shape.style.opacity).toBe(0.5);
      expect(shape.style.stroke).toBe('#1e40af'); // Should keep default
      expect(shape.style.strokeWidth).toBe(2); // Should keep default
    });
  });

  describe('createShapeAtPosition', () => {
    it('should create shape with type-specific default styling', () => {
      const position: Point = { x: 100, y: 100 };
      
      const rectangle = ShapeCreationService.createShapeAtPosition('rectangle', position);
      expect(rectangle.style.fill).toBe('#3b82f6');
      expect(rectangle.style.stroke).toBe('#1e40af');

      const circle = ShapeCreationService.createShapeAtPosition('circle', position);
      expect(circle.style.fill).toBe('#ef4444');
      expect(circle.style.stroke).toBe('#dc2626');

      const text = ShapeCreationService.createShapeAtPosition('text', position);
      expect(text.style.fill).toBe('#000000');
      expect(text.style.strokeWidth).toBe(0);
      expect(text.content).toBe('New Text');

      const line = ShapeCreationService.createShapeAtPosition('line', position);
      expect(line.style.fill).toBe('transparent');
      expect(line.style.stroke).toBe('#22c55e');
      expect(line.style.strokeWidth).toBe(3);
    });

    it('should override default styling with custom style', () => {
      const position: Point = { x: 0, y: 0 };
      const customStyle = { fill: '#purple', strokeWidth: 5 };

      const shape = ShapeCreationService.createShapeAtPosition('rectangle', position, customStyle);
      
      expect(shape.style.fill).toBe('#purple');
      expect(shape.style.strokeWidth).toBe(5);
    });
  });

  describe('getDefaultStyleForType', () => {
    it('should return correct default styles for each shape type', () => {
      const rectangleStyle = ShapeCreationService.getDefaultStyleForType('rectangle');
      expect(rectangleStyle.fill).toBe('#3b82f6');
      expect(rectangleStyle.stroke).toBe('#1e40af');

      const circleStyle = ShapeCreationService.getDefaultStyleForType('circle');
      expect(circleStyle.fill).toBe('#ef4444');
      expect(circleStyle.stroke).toBe('#dc2626');

      const textStyle = ShapeCreationService.getDefaultStyleForType('text');
      expect(textStyle.fill).toBe('#000000');
      expect(textStyle.strokeWidth).toBe(0);

      const lineStyle = ShapeCreationService.getDefaultStyleForType('line');
      expect(lineStyle.fill).toBe('transparent');
      expect(lineStyle.stroke).toBe('#22c55e');
      expect(lineStyle.strokeWidth).toBe(3);
    });
  });

  describe('validateShapeCreation', () => {
    it('should validate correct shape creation parameters', () => {
      const validOptions = {
        type: 'rectangle' as ShapeType,
        position: { x: 100, y: 200 },
      };

      expect(ShapeCreationService.validateShapeCreation(validOptions)).toBe(true);
    });

    it('should reject invalid shape types', () => {
      const invalidOptions = {
        type: 'invalid' as ShapeType,
        position: { x: 100, y: 200 },
      };

      expect(ShapeCreationService.validateShapeCreation(invalidOptions)).toBe(false);
    });

    it('should reject invalid position coordinates', () => {
      const invalidXOptions = {
        type: 'rectangle' as ShapeType,
        position: { x: NaN, y: 200 },
      };

      const invalidYOptions = {
        type: 'rectangle' as ShapeType,
        position: { x: 100, y: Infinity },
      };

      expect(ShapeCreationService.validateShapeCreation(invalidXOptions)).toBe(false);
      expect(ShapeCreationService.validateShapeCreation(invalidYOptions)).toBe(false);
    });
  });

  describe('createPreviewShape', () => {
    it('should create a preview shape with reduced opacity', () => {
      const position: Point = { x: 50, y: 50 };
      const previewShape = ShapeCreationService.createPreviewShape('rectangle', position);

      expect(previewShape.style.opacity).toBe(0.7);
      expect(previewShape.type).toBe('rectangle');
      expect(previewShape.position).toEqual(position);
    });

    it('should apply custom style to preview shape', () => {
      const position: Point = { x: 0, y: 0 };
      const customStyle = { fill: '#green' };
      
      const previewShape = ShapeCreationService.createPreviewShape('circle', position, customStyle);

      expect(previewShape.style.fill).toBe('#green');
      expect(previewShape.style.opacity).toBe(0.7); // Should still have preview opacity
    });
  });
});