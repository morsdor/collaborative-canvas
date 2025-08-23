import { Point, Size, ShapeStyle, Shape, ShapeType } from '../types';

/**
 * Validation utilities for shape data
 */
export class ShapeValidator {
  /**
   * Validate a point has finite numeric coordinates
   */
  static validatePosition(position: Point): boolean {
    return (
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      Number.isFinite(position.x) &&
      Number.isFinite(position.y)
    );
  }

  /**
   * Validate dimensions are positive numbers
   */
  static validateDimensions(dimensions: Size): boolean {
    return (
      typeof dimensions.width === 'number' &&
      typeof dimensions.height === 'number' &&
      Number.isFinite(dimensions.width) &&
      Number.isFinite(dimensions.height) &&
      dimensions.width > 0 &&
      dimensions.height > 0
    );
  }

  /**
   * Validate a color string (hex, rgb, rgba, or named colors)
   */
  static isValidColor(color: string): boolean {
    if (typeof color !== 'string') return false;
    
    // Check hex colors (#fff, #ffffff, #ffff, #ffffffff)
    const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
    if (hexPattern.test(color)) return true;
    
    // Check rgb/rgba patterns (values 0-255)
    const rgbPattern = /^rgba?\(\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*(?:,\s*([01](?:\.\d+)?))?\s*\)$/;
    if (rgbPattern.test(color)) return true;
    
    // Check hsl/hsla patterns
    const hslPattern = /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(?:,\s*[0-1]?(?:\.\d+)?)?\s*\)$/;
    if (hslPattern.test(color)) return true;
    
    // Check named colors (basic set)
    const namedColors = [
      'transparent', 'black', 'white', 'red', 'green', 'blue', 'yellow', 
      'orange', 'purple', 'pink', 'gray', 'grey', 'brown', 'cyan', 'magenta'
    ];
    if (namedColors.includes(color.toLowerCase())) return true;
    
    return false;
  }

  /**
   * Validate shape style properties
   */
  static validateStyle(style: ShapeStyle): boolean {
    return (
      this.isValidColor(style.fill) &&
      this.isValidColor(style.stroke) &&
      typeof style.strokeWidth === 'number' &&
      Number.isFinite(style.strokeWidth) &&
      style.strokeWidth >= 0 &&
      typeof style.opacity === 'number' &&
      Number.isFinite(style.opacity) &&
      style.opacity >= 0 &&
      style.opacity <= 1
    );
  }

  /**
   * Validate shape type is one of the allowed types
   */
  static validateShapeType(type: any): type is ShapeType {
    const validTypes: ShapeType[] = ['rectangle', 'circle', 'text', 'line'];
    return validTypes.includes(type);
  }

  /**
   * Validate text content (for text shapes)
   */
  static validateTextContent(content: string): boolean {
    return typeof content === 'string' && content.length <= 10000; // Reasonable limit
  }

  /**
   * Validate a complete shape object
   */
  static validateShape(shape: Shape): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!shape.id || typeof shape.id !== 'string') {
      errors.push('Shape ID must be a non-empty string');
    }

    if (!this.validateShapeType(shape.type)) {
      errors.push('Invalid shape type');
    }

    if (!this.validatePosition(shape.position)) {
      errors.push('Invalid position coordinates');
    }

    if (!this.validateDimensions(shape.dimensions)) {
      errors.push('Invalid dimensions');
    }

    if (!this.validateStyle(shape.style)) {
      errors.push('Invalid style properties');
    }

    if (shape.content !== undefined && !this.validateTextContent(shape.content)) {
      errors.push('Invalid text content');
    }

    if (shape.groupId !== undefined && (typeof shape.groupId !== 'string' || !shape.groupId)) {
      errors.push('Group ID must be a non-empty string if provided');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize and fix common shape data issues
   */
  static sanitizeShape(shape: Partial<Shape>): Partial<Shape> {
    const sanitized: Partial<Shape> = { ...shape };

    // Ensure position has finite numbers
    if (sanitized.position) {
      sanitized.position = {
        x: Number.isFinite(sanitized.position.x) ? sanitized.position.x : 0,
        y: Number.isFinite(sanitized.position.y) ? sanitized.position.y : 0,
      };
    }

    // Ensure dimensions are positive
    if (sanitized.dimensions) {
      sanitized.dimensions = {
        width: Math.max(1, Number.isFinite(sanitized.dimensions.width) ? sanitized.dimensions.width : 100),
        height: Math.max(1, Number.isFinite(sanitized.dimensions.height) ? sanitized.dimensions.height : 100),
      };
    }

    // Ensure style properties are valid
    if (sanitized.style) {
      const style = sanitized.style;
      sanitized.style = {
        fill: this.isValidColor(style.fill) ? style.fill : '#000000',
        stroke: this.isValidColor(style.stroke) ? style.stroke : '#000000',
        strokeWidth: Math.max(0, Number.isFinite(style.strokeWidth) ? style.strokeWidth : 1),
        opacity: Math.max(0, Math.min(1, Number.isFinite(style.opacity) ? style.opacity : 1)),
      };
    }

    // Trim text content
    if (sanitized.content !== undefined) {
      sanitized.content = typeof sanitized.content === 'string' 
        ? sanitized.content.slice(0, 10000) 
        : '';
    }

    return sanitized;
  }
}

/**
 * Validation error class for shape-related errors
 */
export class ShapeValidationError extends Error {
  constructor(
    message: string,
    public shapeId?: string,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'ShapeValidationError';
  }
}