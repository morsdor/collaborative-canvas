import * as Y from 'yjs';
import { Group, Rectangle } from '../types';

/**
 * GroupModel class that provides Yjs integration for group data
 * Handles serialization/deserialization between Group interface and Yjs Y.Map
 */
export class GroupModel implements Group {
  constructor(
    public id: string,
    public shapeIds: string[],
    public bounds: Rectangle,
    public locked: boolean = false
  ) {}

  /**
   * Convert GroupModel instance to Yjs Y.Map for collaborative storage
   */
  toYjsMap(): Y.Map<any> {
    const map = new Y.Map();
    map.set('shapeIds', this.shapeIds);
    map.set('bounds', this.bounds);
    map.set('locked', this.locked);
    
    return map;
  }

  /**
   * Create GroupModel instance from Yjs Y.Map
   */
  static fromYjsMap(id: string, map: Y.Map<any>): GroupModel {
    const shapeIds = map.get('shapeIds') as string[];
    const bounds = map.get('bounds') as Rectangle;
    const locked = map.get('locked') as boolean;

    return new GroupModel(
      id,
      shapeIds,
      bounds,
      locked
    );
  }

  /**
   * Create a plain Group object from this model
   */
  toGroup(): Group {
    return {
      id: this.id,
      shapeIds: this.shapeIds,
      bounds: this.bounds,
      locked: this.locked,
    };
  }

  /**
   * Create GroupModel from plain Group object
   */
  static fromGroup(group: Group): GroupModel {
    return new GroupModel(
      group.id,
      group.shapeIds,
      group.bounds,
      group.locked
    );
  }

  /**
   * Update group properties and return new instance (immutable)
   */
  update(updates: Partial<Omit<Group, 'id'>>): GroupModel {
    return new GroupModel(
      this.id,
      updates.shapeIds ?? this.shapeIds,
      updates.bounds ?? this.bounds,
      updates.locked ?? this.locked
    );
  }

  /**
   * Add a shape to the group
   */
  addShape(shapeId: string): GroupModel {
    if (this.shapeIds.includes(shapeId)) {
      return this; // Shape already in group
    }
    
    return this.update({
      shapeIds: [...this.shapeIds, shapeId]
    });
  }

  /**
   * Remove a shape from the group
   */
  removeShape(shapeId: string): GroupModel {
    const newShapeIds = this.shapeIds.filter(id => id !== shapeId);
    
    if (newShapeIds.length === this.shapeIds.length) {
      return this; // Shape wasn't in group
    }
    
    return this.update({
      shapeIds: newShapeIds
    });
  }

  /**
   * Check if the group contains a specific shape
   */
  containsShape(shapeId: string): boolean {
    return this.shapeIds.includes(shapeId);
  }

  /**
   * Check if the group is empty
   */
  isEmpty(): boolean {
    return this.shapeIds.length === 0;
  }

  /**
   * Update the bounds of the group
   */
  updateBounds(bounds: Rectangle): GroupModel {
    return this.update({ bounds });
  }

  /**
   * Toggle the locked state of the group
   */
  toggleLocked(): GroupModel {
    return this.update({ locked: !this.locked });
  }

  /**
   * Clone the group model with a new ID
   */
  clone(newId: string): GroupModel {
    return new GroupModel(
      newId,
      [...this.shapeIds],
      { ...this.bounds },
      this.locked
    );
  }
}