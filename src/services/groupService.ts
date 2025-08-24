import { Shape, Group, Rectangle } from '@/types';
import { generateId, getMultipleShapesBounds } from '@/utils';

/**
 * Service for handling group operations
 */
export class GroupService {
  /**
   * Create a group from selected shapes
   */
  static createGroup(shapes: Shape[]): Group | null {
    if (shapes.length < 2) {
      return null; // Need at least 2 shapes to create a group
    }

    const bounds = getMultipleShapesBounds(shapes);
    if (!bounds) {
      return null;
    }

    const groupId = generateId();
    const shapeIds = shapes.map(shape => shape.id);

    return {
      id: groupId,
      shapeIds,
      bounds,
      locked: false,
    };
  }

  /**
   * Calculate the bounds of a group based on its shapes
   */
  static calculateGroupBounds(shapes: Shape[]): Rectangle | null {
    return getMultipleShapesBounds(shapes);
  }

  /**
   * Update group bounds based on current shape positions
   */
  static updateGroupBounds(group: Group, allShapes: Shape[]): Group {
    const groupShapes = allShapes.filter(shape => 
      group.shapeIds.includes(shape.id)
    );

    const newBounds = this.calculateGroupBounds(groupShapes);
    if (!newBounds) {
      return group;
    }

    return {
      ...group,
      bounds: newBounds,
    };
  }

  /**
   * Get all shapes that belong to a group
   */
  static getGroupShapes(group: Group, allShapes: Shape[]): Shape[] {
    return allShapes.filter(shape => group.shapeIds.includes(shape.id));
  }

  /**
   * Check if a shape is part of any group
   */
  static isShapeInGroup(shapeId: string, groups: Group[]): Group | null {
    return groups.find(group => group.shapeIds.includes(shapeId)) || null;
  }

  /**
   * Get all shapes that are not in any group
   */
  static getUngroupedShapes(allShapes: Shape[], groups: Group[]): Shape[] {
    const groupedShapeIds = new Set(
      groups.flatMap(group => group.shapeIds)
    );

    return allShapes.filter(shape => !groupedShapeIds.has(shape.id));
  }

  /**
   * Move a group by updating all its shapes' positions
   */
  static moveGroup(
    group: Group, 
    deltaX: number, 
    deltaY: number, 
    allShapes: Shape[]
  ): { updatedShapes: Shape[]; updatedGroup: Group } {
    const groupShapes = this.getGroupShapes(group, allShapes);
    
    const updatedShapes = groupShapes.map(shape => ({
      ...shape,
      position: {
        x: shape.position.x + deltaX,
        y: shape.position.y + deltaY,
      },
    }));

    const updatedGroup = {
      ...group,
      bounds: {
        ...group.bounds,
        x: group.bounds.x + deltaX,
        y: group.bounds.y + deltaY,
      },
    };

    return { updatedShapes, updatedGroup };
  }

  /**
   * Resize a group by scaling all its shapes
   */
  static resizeGroup(
    group: Group,
    newBounds: Rectangle,
    allShapes: Shape[]
  ): { updatedShapes: Shape[]; updatedGroup: Group } {
    const groupShapes = this.getGroupShapes(group, allShapes);
    const originalBounds = group.bounds;

    // Calculate scale factors
    const scaleX = newBounds.width / originalBounds.width;
    const scaleY = newBounds.height / originalBounds.height;

    const updatedShapes = groupShapes.map(shape => {
      // Calculate relative position within the group
      const relativeX = (shape.position.x - originalBounds.x) / originalBounds.width;
      const relativeY = (shape.position.y - originalBounds.y) / originalBounds.height;

      // Calculate new position
      const newX = newBounds.x + (relativeX * newBounds.width);
      const newY = newBounds.y + (relativeY * newBounds.height);

      // Scale dimensions
      const newWidth = shape.dimensions.width * scaleX;
      const newHeight = shape.dimensions.height * scaleY;

      return {
        ...shape,
        position: { x: newX, y: newY },
        dimensions: { width: newWidth, height: newHeight },
      };
    });

    const updatedGroup = {
      ...group,
      bounds: newBounds,
    };

    return { updatedShapes, updatedGroup };
  }

  /**
   * Validate that a group's shape IDs exist in the shapes array
   */
  static validateGroup(group: Group, allShapes: Shape[]): boolean {
    const shapeIds = new Set(allShapes.map(shape => shape.id));
    return group.shapeIds.every(id => shapeIds.has(id));
  }

  /**
   * Clean up groups by removing references to deleted shapes
   */
  static cleanupGroups(groups: Group[], allShapes: Shape[]): Group[] {
    const shapeIds = new Set(allShapes.map(shape => shape.id));
    
    return groups
      .map(group => ({
        ...group,
        shapeIds: group.shapeIds.filter(id => shapeIds.has(id)),
      }))
      .filter(group => group.shapeIds.length >= 2); // Remove groups with less than 2 shapes
  }

  /**
   * Check if shapes can be grouped (not already in other groups)
   */
  static canGroupShapes(shapeIds: string[], groups: Group[]): boolean {
    const groupedShapeIds = new Set(
      groups.flatMap(group => group.shapeIds)
    );

    return shapeIds.every(id => !groupedShapeIds.has(id));
  }
}