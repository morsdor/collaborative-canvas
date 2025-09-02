import * as Y from 'yjs';
import { Shape, ShapeType, Point, Size, ShapeStyle, TextStyle } from '../types';

/**
 * ShapeModel class that provides Yjs integration for shape data
 * Handles serialization/deserialization between Shape interface and Yjs Y.Map
 */
export class ShapeModel implements Shape {
  constructor(
    public id: string,
    public type: ShapeType,
    public position: Point,
    public dimensions: Size,
    public style: ShapeStyle,
    public content?: string,
    public textStyle?: TextStyle,
    public groupId?: string
  ) {}

  /**
   * Convert ShapeModel instance to Yjs Y.Map for collaborative storage
   */
  toYjsMap(): Y.Map<any> {
    const map = new Y.Map();
    map.set('type', this.type);
    map.set('position', this.position);
    map.set('dimensions', this.dimensions);
    map.set('style', this.style);
    
    if (this.content !== undefined) {
      map.set('content', this.content);
    }
    
    if (this.textStyle !== undefined) {
      map.set('textStyle', this.textStyle);
    }
    
    if (this.groupId !== undefined) {
      map.set('groupId', this.groupId);
    }
    
    return map;
  }

  /**
   * Create ShapeModel instance from Yjs Y.Map
   */
  static fromYjsMap(id: string, map: Y.Map<any>): ShapeModel {
    const type = map.get('type') as ShapeType;
    const position = map.get('position') as Point;
    const dimensions = map.get('dimensions') as Size;
    const style = map.get('style') as ShapeStyle;
    const content = map.get('content') as string | undefined;
    const textStyle = map.get('textStyle') as TextStyle | undefined;
    const groupId = map.get('groupId') as string | undefined;

    return new ShapeModel(
      id,
      type,
      position,
      dimensions,
      style,
      content,
      textStyle,
      groupId
    );
  }

  /**
   * Create a plain Shape object from this model
   */
  toShape(): Shape {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      dimensions: this.dimensions,
      style: this.style,
      content: this.content,
      textStyle: this.textStyle,
      groupId: this.groupId,
    };
  }

  /**
   * Create ShapeModel from plain Shape object
   */
  static fromShape(shape: Shape): ShapeModel {
    return new ShapeModel(
      shape.id,
      shape.type,
      shape.position,
      shape.dimensions,
      shape.style,
      shape.content,
      shape.textStyle,
      shape.groupId
    );
  }

  /**
   * Update shape properties and return new instance (immutable)
   */
  update(updates: Partial<Omit<Shape, 'id'>>): ShapeModel {
    return new ShapeModel(
      this.id,
      updates.type ?? this.type,
      updates.position ?? this.position,
      updates.dimensions ?? this.dimensions,
      updates.style ?? this.style,
      updates.content ?? this.content,
      updates.textStyle ?? this.textStyle,
      updates.groupId ?? this.groupId
    );
  }

  /**
   * Clone the shape model with a new ID
   */
  clone(newId: string): ShapeModel {
    return new ShapeModel(
      newId,
      this.type,
      { ...this.position },
      { ...this.dimensions },
      { ...this.style },
      this.content,
      this.groupId
    );
  }
}