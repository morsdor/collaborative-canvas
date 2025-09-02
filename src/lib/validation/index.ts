import { Point, Size, ShapeStyle, Shape } from '@/types';
import { ValidationError, createValidationError } from '@/lib/errors';

export class ShapeValidator {
  static validatePosition(position: Point): boolean {
    return (
      Number.isFinite(position.x) &&
      Number.isFinite(position.y) &&
      !Number.isNaN(position.x) &&
      !Number.isNaN(position.y)
    );
  }

  static validateDimensions(dimensions: Size): boolean {
    return (
      Number.isFinite(dimensions.width) &&
      Number.isFinite(dimensions.height) &&
      dimensions.width > 0 &&
      dimensions.height > 0
    );
  }

  static isValidColor(color: string): boolean {
    // Basic color validation - supports hex, rgb, rgba, hsl, hsla, and named colors
    const colorRegex =
      /^(#[0-9A-Fa-f]{3,8}|rgb\(.*\)|rgba\(.*\)|hsl\(.*\)|hsla\(.*\)|[a-zA-Z]+)$/;
    return colorRegex.test(color);
  }

  static validateStyle(style: ShapeStyle): boolean {
    return (
      this.isValidColor(style.fill) &&
      this.isValidColor(style.stroke) &&
      Number.isFinite(style.strokeWidth) &&
      style.strokeWidth >= 0 &&
      Number.isFinite(style.opacity) &&
      style.opacity >= 0 &&
      style.opacity <= 1
    );
  }

  static validateShape(shape: Partial<Shape>): string[] {
    const errors: string[] = [];

    if (shape.position && !this.validatePosition(shape.position)) {
      errors.push('Invalid position coordinates');
    }

    if (shape.dimensions && !this.validateDimensions(shape.dimensions)) {
      errors.push(
        'Invalid dimensions - width and height must be positive numbers'
      );
    }

    if (shape.style && !this.validateStyle(shape.style)) {
      errors.push('Invalid style properties');
    }

    if (
      shape.type &&
      !['rectangle', 'circle', 'text', 'line'].includes(shape.type)
    ) {
      errors.push('Invalid shape type');
    }

    return errors;
  }

  static validateShapeOrThrow(shape: Partial<Shape>, context?: any): void {
    const errors = this.validateShape(shape);
    if (errors.length > 0) {
      throw createValidationError(
        `Shape validation failed: ${errors.join(', ')}`,
        {
          shapeId: shape.id,
          operation: 'validate',
          additionalData: { errors, shape },
          ...context,
        }
      );
    }
  }

  static validatePositionOrThrow(position: Point, context?: any): void {
    if (!this.validatePosition(position)) {
      throw createValidationError(
        `Invalid position coordinates: x=${position.x}, y=${position.y}`,
        {
          operation: 'validatePosition',
          additionalData: { position },
          ...context,
        }
      );
    }
  }

  static validateDimensionsOrThrow(dimensions: Size, context?: any): void {
    if (!this.validateDimensions(dimensions)) {
      throw createValidationError(
        `Invalid dimensions: width=${dimensions.width}, height=${dimensions.height}`,
        {
          operation: 'validateDimensions',
          additionalData: { dimensions },
          ...context,
        }
      );
    }
  }

  static validateStyleOrThrow(style: ShapeStyle, context?: any): void {
    if (!this.validateStyle(style)) {
      throw createValidationError(
        'Invalid style properties',
        {
          operation: 'validateStyle',
          additionalData: { style },
          ...context,
        }
      );
    }
  }

  static sanitizeShape(shape: Partial<Shape>): Partial<Shape> {
    const sanitized: Partial<Shape> = { ...shape };

    // Ensure position values are finite
    if (sanitized.position) {
      sanitized.position = {
        x: Number.isFinite(sanitized.position.x) ? sanitized.position.x : 0,
        y: Number.isFinite(sanitized.position.y) ? sanitized.position.y : 0,
      };
    }

    // Ensure dimensions are positive
    if (sanitized.dimensions) {
      sanitized.dimensions = {
        width: Math.max(1, sanitized.dimensions.width || 1),
        height: Math.max(1, sanitized.dimensions.height || 1),
      };
    }

    // Ensure style values are valid
    if (sanitized.style) {
      sanitized.style = {
        fill: this.isValidColor(sanitized.style.fill)
          ? sanitized.style.fill
          : '#000000',
        stroke: this.isValidColor(sanitized.style.stroke)
          ? sanitized.style.stroke
          : '#000000',
        strokeWidth: Math.max(0, sanitized.style.strokeWidth || 0),
        opacity: Math.max(0, Math.min(1, sanitized.style.opacity || 1)),
      };
    }

    return sanitized;
  }
}
