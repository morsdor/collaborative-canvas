import { Shape, ShapeType, Point, ShapeStyle } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface ShapeCreationOptions {
  type: ShapeType;
  position: Point;
  style?: Partial<ShapeStyle>;
  content?: string;
}

export class ShapeCreationService {
  private static defaultStyle: ShapeStyle = {
    fill: '#3b82f6',
    stroke: '#1e40af',
    strokeWidth: 2,
    opacity: 1,
  };

  private static defaultDimensions = {
    rectangle: { width: 100, height: 80 },
    circle: { width: 80, height: 80 },
    text: { width: 200, height: 40 },
    line: { width: 100, height: 2 },
  };

  /**
   * Create a new shape with default dimensions and styling
   */
  static createShape(options: ShapeCreationOptions): Shape {
    const { type, position, style = {}, content } = options;
    
    const mergedStyle: ShapeStyle = {
      ...this.defaultStyle,
      ...style,
    };

    // Get default dimensions for the shape type
    const dimensions = this.defaultDimensions[type];

    const shape: Shape = {
      id: uuidv4(),
      type,
      position: { ...position },
      dimensions: { ...dimensions },
      style: mergedStyle,
    };

    // Add content for text shapes
    if (type === 'text') {
      shape.content = content || 'Text';
    }

    return shape;
  }

  /**
   * Create a shape at a specific position with immediate visual feedback
   */
  static createShapeAtPosition(
    type: ShapeType,
    position: Point,
    customStyle?: Partial<ShapeStyle>
  ): Shape {
    const typeSpecificStyle = this.getDefaultStyleForType(type);
    const mergedStyle = { ...typeSpecificStyle, ...customStyle };
    
    return this.createShape({
      type,
      position,
      style: mergedStyle,
      content: type === 'text' ? 'New Text' : undefined,
    });
  }

  /**
   * Get default style for a shape type
   */
  static getDefaultStyleForType(type: ShapeType): ShapeStyle {
    const baseStyle = { ...this.defaultStyle };
    
    switch (type) {
      case 'rectangle':
        return { ...baseStyle, fill: '#3b82f6', stroke: '#1e40af' };
      case 'circle':
        return { ...baseStyle, fill: '#ef4444', stroke: '#dc2626' };
      case 'text':
        return { ...baseStyle, fill: '#000000', stroke: '#000000', strokeWidth: 0 };
      case 'line':
        return { ...baseStyle, fill: 'transparent', stroke: '#22c55e', strokeWidth: 3 };
      default:
        return baseStyle;
    }
  }

  /**
   * Validate shape creation parameters
   */
  static validateShapeCreation(options: ShapeCreationOptions): boolean {
    const { type, position } = options;
    
    // Check if type is valid
    const validTypes: ShapeType[] = ['rectangle', 'circle', 'text', 'line'];
    if (!validTypes.includes(type)) {
      return false;
    }

    // Check if position is valid
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      return false;
    }

    return true;
  }

  /**
   * Create a preview shape for immediate visual feedback
   */
  static createPreviewShape(
    type: ShapeType,
    position: Point,
    customStyle?: Partial<ShapeStyle>
  ): Shape {
    const previewStyle = {
      ...this.getDefaultStyleForType(type),
      ...customStyle,
      opacity: 0.7, // Make preview slightly transparent
    };

    return this.createShape({
      type,
      position,
      style: previewStyle,
    });
  }
}