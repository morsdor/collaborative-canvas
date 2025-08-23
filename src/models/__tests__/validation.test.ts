import { ShapeValidator, ShapeValidationError } from '../validation';
import { Shape, Point, Size, ShapeStyle } from '../../types';

describe('ShapeValidator', () => {
  describe('validatePosition', () => {
    it('should validate valid positions', () => {
      expect(ShapeValidator.validatePosition({ x: 0, y: 0 })).toBe(true);
      expect(ShapeValidator.validatePosition({ x: 100, y: -50 })).toBe(true);
      expect(ShapeValidator.validatePosition({ x: 1.5, y: 2.7 })).toBe(true);
    });

    it('should reject invalid positions', () => {
      expect(ShapeValidator.validatePosition({ x: NaN, y: 0 })).toBe(false);
      expect(ShapeValidator.validatePosition({ x: 0, y: Infinity })).toBe(false);
      expect(ShapeValidator.validatePosition({ x: -Infinity, y: 0 })).toBe(false);
      expect(ShapeValidator.validatePosition({ x: 'invalid' as any, y: 0 })).toBe(false);
    });
  });

  describe('validateDimensions', () => {
    it('should validate valid dimensions', () => {
      expect(ShapeValidator.validateDimensions({ width: 100, height: 50 })).toBe(true);
      expect(ShapeValidator.validateDimensions({ width: 1, height: 1 })).toBe(true);
      expect(ShapeValidator.validateDimensions({ width: 0.1, height: 0.1 })).toBe(true);
    });

    it('should reject invalid dimensions', () => {
      expect(ShapeValidator.validateDimensions({ width: 0, height: 50 })).toBe(false);
      expect(ShapeValidator.validateDimensions({ width: 100, height: -10 })).toBe(false);
      expect(ShapeValidator.validateDimensions({ width: NaN, height: 50 })).toBe(false);
      expect(ShapeValidator.validateDimensions({ width: Infinity, height: 50 })).toBe(false);
      expect(ShapeValidator.validateDimensions({ width: 'invalid' as any, height: 50 })).toBe(false);
    });
  });

  describe('isValidColor', () => {
    it('should validate hex colors', () => {
      expect(ShapeValidator.isValidColor('#fff')).toBe(true);
      expect(ShapeValidator.isValidColor('#ffffff')).toBe(true);
      expect(ShapeValidator.isValidColor('#ffff')).toBe(true);
      expect(ShapeValidator.isValidColor('#ffffffff')).toBe(true);
      expect(ShapeValidator.isValidColor('#123ABC')).toBe(true);
    });

    it('should validate rgb/rgba colors', () => {
      expect(ShapeValidator.isValidColor('rgb(255, 0, 0)')).toBe(true);
      expect(ShapeValidator.isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
      expect(ShapeValidator.isValidColor('rgb(0,0,0)')).toBe(true);
      expect(ShapeValidator.isValidColor('rgba(100, 150, 200, 1)')).toBe(true);
    });

    it('should validate hsl/hsla colors', () => {
      expect(ShapeValidator.isValidColor('hsl(120, 100%, 50%)')).toBe(true);
      expect(ShapeValidator.isValidColor('hsla(240, 50%, 25%, 0.8)')).toBe(true);
    });

    it('should validate named colors', () => {
      expect(ShapeValidator.isValidColor('red')).toBe(true);
      expect(ShapeValidator.isValidColor('blue')).toBe(true);
      expect(ShapeValidator.isValidColor('transparent')).toBe(true);
      expect(ShapeValidator.isValidColor('BLACK')).toBe(true); // Case insensitive
    });

    it('should reject invalid colors', () => {
      expect(ShapeValidator.isValidColor('#gg')).toBe(false);
      expect(ShapeValidator.isValidColor('rgb(256, 0, 0)')).toBe(false);
      expect(ShapeValidator.isValidColor('invalid-color')).toBe(false);
      expect(ShapeValidator.isValidColor('')).toBe(false);
      expect(ShapeValidator.isValidColor(123 as any)).toBe(false);
    });
  });

  describe('validateStyle', () => {
    const validStyle: ShapeStyle = {
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 2,
      opacity: 0.8,
    };

    it('should validate valid styles', () => {
      expect(ShapeValidator.validateStyle(validStyle)).toBe(true);
      expect(ShapeValidator.validateStyle({
        fill: 'transparent',
        stroke: 'blue',
        strokeWidth: 0,
        opacity: 1,
      })).toBe(true);
    });

    it('should reject styles with invalid colors', () => {
      expect(ShapeValidator.validateStyle({
        ...validStyle,
        fill: 'invalid-color',
      })).toBe(false);
      
      expect(ShapeValidator.validateStyle({
        ...validStyle,
        stroke: '#gg',
      })).toBe(false);
    });

    it('should reject styles with invalid stroke width', () => {
      expect(ShapeValidator.validateStyle({
        ...validStyle,
        strokeWidth: -1,
      })).toBe(false);
      
      expect(ShapeValidator.validateStyle({
        ...validStyle,
        strokeWidth: NaN,
      })).toBe(false);
    });

    it('should reject styles with invalid opacity', () => {
      expect(ShapeValidator.validateStyle({
        ...validStyle,
        opacity: -0.1,
      })).toBe(false);
      
      expect(ShapeValidator.validateStyle({
        ...validStyle,
        opacity: 1.1,
      })).toBe(false);
      
      expect(ShapeValidator.validateStyle({
        ...validStyle,
        opacity: NaN,
      })).toBe(false);
    });
  });

  describe('validateShapeType', () => {
    it('should validate valid shape types', () => {
      expect(ShapeValidator.validateShapeType('rectangle')).toBe(true);
      expect(ShapeValidator.validateShapeType('circle')).toBe(true);
      expect(ShapeValidator.validateShapeType('text')).toBe(true);
      expect(ShapeValidator.validateShapeType('line')).toBe(true);
    });

    it('should reject invalid shape types', () => {
      expect(ShapeValidator.validateShapeType('triangle')).toBe(false);
      expect(ShapeValidator.validateShapeType('invalid')).toBe(false);
      expect(ShapeValidator.validateShapeType('')).toBe(false);
      expect(ShapeValidator.validateShapeType(null)).toBe(false);
      expect(ShapeValidator.validateShapeType(123)).toBe(false);
    });
  });

  describe('validateTextContent', () => {
    it('should validate valid text content', () => {
      expect(ShapeValidator.validateTextContent('')).toBe(true);
      expect(ShapeValidator.validateTextContent('Hello world')).toBe(true);
      expect(ShapeValidator.validateTextContent('A'.repeat(1000))).toBe(true);
    });

    it('should reject invalid text content', () => {
      expect(ShapeValidator.validateTextContent('A'.repeat(10001))).toBe(false); // Too long
      expect(ShapeValidator.validateTextContent(123 as any)).toBe(false);
      expect(ShapeValidator.validateTextContent(null as any)).toBe(false);
    });
  });

  describe('validateShape', () => {
    const validShape: Shape = {
      id: 'test-shape',
      type: 'rectangle',
      position: { x: 100, y: 200 },
      dimensions: { width: 150, height: 100 },
      style: {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
        opacity: 0.8,
      },
      content: 'Test content',
      groupId: 'group-1',
    };

    it('should validate a complete valid shape', () => {
      const result = ShapeValidator.validateShape(validShape);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a minimal valid shape', () => {
      const minimalShape: Shape = {
        id: 'minimal',
        type: 'circle',
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        style: {
          fill: 'blue',
          stroke: 'black',
          strokeWidth: 1,
          opacity: 1,
        },
      };

      const result = ShapeValidator.validateShape(minimalShape);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect multiple validation errors', () => {
      const invalidShape: Shape = {
        id: '', // Invalid ID
        type: 'invalid' as any, // Invalid type
        position: { x: NaN, y: 0 }, // Invalid position
        dimensions: { width: -10, height: 50 }, // Invalid dimensions
        style: {
          fill: 'invalid-color', // Invalid color
          stroke: '#000',
          strokeWidth: -1, // Invalid stroke width
          opacity: 2, // Invalid opacity
        },
        content: 'A'.repeat(10001), // Invalid content length
        groupId: '', // Invalid group ID
      };

      const result = ShapeValidator.validateShape(invalidShape);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Shape ID must be a non-empty string');
      expect(result.errors).toContain('Invalid shape type');
      expect(result.errors).toContain('Invalid position coordinates');
      expect(result.errors).toContain('Invalid dimensions');
      expect(result.errors).toContain('Invalid style properties');
      expect(result.errors).toContain('Invalid text content');
      expect(result.errors).toContain('Group ID must be a non-empty string if provided');
    });
  });

  describe('sanitizeShape', () => {
    it('should fix invalid position coordinates', () => {
      const shape = {
        position: { x: NaN, y: Infinity },
      };

      const sanitized = ShapeValidator.sanitizeShape(shape);
      expect(sanitized.position).toEqual({ x: 0, y: 0 });
    });

    it('should fix invalid dimensions', () => {
      const shape = {
        dimensions: { width: -10, height: NaN },
      };

      const sanitized = ShapeValidator.sanitizeShape(shape);
      expect(sanitized.dimensions!.width).toBeGreaterThan(0);
      expect(sanitized.dimensions!.height).toBeGreaterThan(0);
    });

    it('should fix invalid style properties', () => {
      const shape = {
        style: {
          fill: 'invalid-color',
          stroke: '#000',
          strokeWidth: -5,
          opacity: 2,
        },
      };

      const sanitized = ShapeValidator.sanitizeShape(shape);
      expect(sanitized.style!.fill).toBe('#000000');
      expect(sanitized.style!.strokeWidth).toBe(0);
      expect(sanitized.style!.opacity).toBe(1);
    });

    it('should trim long text content', () => {
      const shape = {
        content: 'A'.repeat(15000),
      };

      const sanitized = ShapeValidator.sanitizeShape(shape);
      expect(sanitized.content!.length).toBe(10000);
    });

    it('should preserve valid properties', () => {
      const validShape = {
        position: { x: 100, y: 200 },
        dimensions: { width: 150, height: 100 },
        style: {
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 2,
          opacity: 0.8,
        },
        content: 'Valid content',
      };

      const sanitized = ShapeValidator.sanitizeShape(validShape);
      expect(sanitized).toEqual(validShape);
    });
  });
});

describe('ShapeValidationError', () => {
  it('should create error with message', () => {
    const error = new ShapeValidationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ShapeValidationError');
  });

  it('should create error with shape ID and errors', () => {
    const errors = ['Error 1', 'Error 2'];
    const error = new ShapeValidationError('Test error', 'shape-123', errors);
    
    expect(error.message).toBe('Test error');
    expect(error.shapeId).toBe('shape-123');
    expect(error.errors).toEqual(errors);
  });
});