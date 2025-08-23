import { Group, DragState, SelectionState, UserPresence, Point, Rectangle, DragType } from '../types';

/**
 * Validation utilities for group and interaction data
 */
export class InteractionValidator {
  /**
   * Validate a rectangle has valid coordinates and dimensions
   */
  static validateRectangle(rect: Rectangle): boolean {
    return (
      typeof rect.x === 'number' &&
      typeof rect.y === 'number' &&
      typeof rect.width === 'number' &&
      typeof rect.height === 'number' &&
      Number.isFinite(rect.x) &&
      Number.isFinite(rect.y) &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height) &&
      rect.width >= 0 &&
      rect.height >= 0
    );
  }

  /**
   * Validate a group object
   */
  static validateGroup(group: Group): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!group.id || typeof group.id !== 'string') {
      errors.push('Group ID must be a non-empty string');
    }

    if (!Array.isArray(group.shapeIds)) {
      errors.push('Shape IDs must be an array');
    } else {
      if (group.shapeIds.length === 0) {
        errors.push('Group must contain at least one shape');
      }
      
      if (!group.shapeIds.every(id => typeof id === 'string' && id.length > 0)) {
        errors.push('All shape IDs must be non-empty strings');
      }

      // Check for duplicate shape IDs
      const uniqueIds = new Set(group.shapeIds);
      if (uniqueIds.size !== group.shapeIds.length) {
        errors.push('Group cannot contain duplicate shape IDs');
      }
    }

    if (!this.validateRectangle(group.bounds)) {
      errors.push('Group bounds must be a valid rectangle');
    }

    if (typeof group.locked !== 'boolean') {
      errors.push('Group locked property must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate drag type
   */
  static validateDragType(dragType: any): dragType is DragType {
    const validTypes: DragType[] = ['move', 'resize', 'rotate'];
    return validTypes.includes(dragType);
  }

  /**
   * Validate drag state
   */
  static validateDragState(dragState: DragState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof dragState.isDragging !== 'boolean') {
      errors.push('isDragging must be a boolean');
    }

    if (!this.validatePosition(dragState.startPosition)) {
      errors.push('Start position must be valid coordinates');
    }

    if (!this.validatePosition(dragState.currentPosition)) {
      errors.push('Current position must be valid coordinates');
    }

    if (!Array.isArray(dragState.targetShapeIds)) {
      errors.push('Target shape IDs must be an array');
    } else if (!dragState.targetShapeIds.every(id => typeof id === 'string' && id.length > 0)) {
      errors.push('All target shape IDs must be non-empty strings');
    }

    if (!this.validateDragType(dragState.dragType)) {
      errors.push('Drag type must be one of: move, resize, rotate');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate selection state
   */
  static validateSelectionState(selectionState: SelectionState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!(selectionState.selectedIds instanceof Set)) {
      errors.push('Selected IDs must be a Set');
    } else {
      // Check that all IDs are valid strings
      for (const id of selectionState.selectedIds) {
        if (typeof id !== 'string' || id.length === 0) {
          errors.push('All selected IDs must be non-empty strings');
          break;
        }
      }
    }

    if (selectionState.selectionBounds !== null && !this.validateRectangle(selectionState.selectionBounds)) {
      errors.push('Selection bounds must be null or a valid rectangle');
    }

    if (typeof selectionState.isMultiSelect !== 'boolean') {
      errors.push('isMultiSelect must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user presence data
   */
  static validateUserPresence(presence: UserPresence): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!presence.userId || typeof presence.userId !== 'string') {
      errors.push('User ID must be a non-empty string');
    }

    if (!presence.name || typeof presence.name !== 'string') {
      errors.push('User name must be a non-empty string');
    }

    if (presence.avatar !== undefined && typeof presence.avatar !== 'string') {
      errors.push('Avatar must be a string if provided');
    }

    if (!this.validatePosition(presence.cursor)) {
      errors.push('Cursor position must be valid coordinates');
    }

    if (!Array.isArray(presence.selection)) {
      errors.push('Selection must be an array');
    } else if (!presence.selection.every(id => typeof id === 'string' && id.length > 0)) {
      errors.push('All selection IDs must be non-empty strings');
    }

    if (typeof presence.isActive !== 'boolean') {
      errors.push('isActive must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate position coordinates (helper method)
   */
  private static validatePosition(position: Point): boolean {
    return (
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      Number.isFinite(position.x) &&
      Number.isFinite(position.y)
    );
  }

  /**
   * Sanitize group data to fix common issues
   */
  static sanitizeGroup(group: Partial<Group>): Partial<Group> {
    const sanitized: Partial<Group> = { ...group };

    // Ensure shape IDs is an array of unique strings
    if (Array.isArray(sanitized.shapeIds)) {
      sanitized.shapeIds = [...new Set(sanitized.shapeIds.filter(id => 
        typeof id === 'string' && id.length > 0
      ))];
    }

    // Ensure bounds is a valid rectangle
    if (sanitized.bounds) {
      const width = Number.isFinite(sanitized.bounds.width) ? sanitized.bounds.width : 100;
      const height = Number.isFinite(sanitized.bounds.height) ? sanitized.bounds.height : 100;
      
      sanitized.bounds = {
        x: Number.isFinite(sanitized.bounds.x) ? sanitized.bounds.x : 0,
        y: Number.isFinite(sanitized.bounds.y) ? sanitized.bounds.y : 0,
        width: Math.max(0, width),
        height: Math.max(0, height),
      };
    }

    // Ensure locked is a boolean
    if (typeof sanitized.locked !== 'boolean') {
      sanitized.locked = false;
    }

    return sanitized;
  }

  /**
   * Sanitize drag state to fix common issues
   */
  static sanitizeDragState(dragState: Partial<DragState>): Partial<DragState> {
    const sanitized: Partial<DragState> = { ...dragState };

    // Ensure isDragging is boolean
    if (typeof sanitized.isDragging !== 'boolean') {
      sanitized.isDragging = false;
    }

    // Sanitize positions
    if (sanitized.startPosition) {
      sanitized.startPosition = {
        x: Number.isFinite(sanitized.startPosition.x) ? sanitized.startPosition.x : 0,
        y: Number.isFinite(sanitized.startPosition.y) ? sanitized.startPosition.y : 0,
      };
    }

    if (sanitized.currentPosition) {
      sanitized.currentPosition = {
        x: Number.isFinite(sanitized.currentPosition.x) ? sanitized.currentPosition.x : 0,
        y: Number.isFinite(sanitized.currentPosition.y) ? sanitized.currentPosition.y : 0,
      };
    }

    // Ensure target shape IDs is an array
    if (Array.isArray(sanitized.targetShapeIds)) {
      sanitized.targetShapeIds = sanitized.targetShapeIds.filter(id => 
        typeof id === 'string' && id.length > 0
      );
    }

    // Ensure drag type is valid
    if (!this.validateDragType(sanitized.dragType)) {
      sanitized.dragType = 'move';
    }

    return sanitized;
  }

  /**
   * Sanitize selection state to fix common issues
   */
  static sanitizeSelectionState(selectionState: Partial<SelectionState>): Partial<SelectionState> {
    const sanitized: Partial<SelectionState> = { ...selectionState };

    // Ensure selectedIds is a Set
    if (!(sanitized.selectedIds instanceof Set)) {
      sanitized.selectedIds = new Set();
    } else {
      // Filter out invalid IDs
      const validIds = Array.from(sanitized.selectedIds).filter(id => 
        typeof id === 'string' && id.length > 0
      );
      sanitized.selectedIds = new Set(validIds);
    }

    // Sanitize selection bounds
    if (sanitized.selectionBounds && !this.validateRectangle(sanitized.selectionBounds)) {
      sanitized.selectionBounds = null;
    }

    // Ensure isMultiSelect is boolean
    if (typeof sanitized.isMultiSelect !== 'boolean') {
      sanitized.isMultiSelect = false;
    }

    return sanitized;
  }
}

/**
 * Validation error class for interaction-related errors
 */
export class InteractionValidationError extends Error {
  constructor(
    message: string,
    public entityId?: string,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'InteractionValidationError';
  }
}