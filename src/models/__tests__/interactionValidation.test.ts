import { InteractionValidator, InteractionValidationError } from '../interactionValidation';
import { Group, DragState, SelectionState, UserPresence, Rectangle } from '../../types';

describe('InteractionValidator', () => {
  const validRectangle: Rectangle = {
    x: 100,
    y: 200,
    width: 300,
    height: 150,
  };

  const validGroup: Group = {
    id: 'test-group',
    shapeIds: ['shape-1', 'shape-2'],
    bounds: validRectangle,
    locked: false,
  };

  const validDragState: DragState = {
    isDragging: true,
    startPosition: { x: 100, y: 200 },
    currentPosition: { x: 150, y: 250 },
    targetShapeIds: ['shape-1'],
    dragType: 'move',
  };

  const validSelectionState: SelectionState = {
    selectedIds: new Set(['shape-1', 'shape-2']),
    selectionBounds: validRectangle,
    isMultiSelect: true,
  };

  const validUserPresence: UserPresence = {
    userId: 'user-123',
    name: 'John Doe',
    avatar: 'avatar-url',
    cursor: { x: 100, y: 200 },
    selection: ['shape-1'],
    isActive: true,
  };

  describe('validateRectangle', () => {
    it('should validate valid rectangles', () => {
      expect(InteractionValidator.validateRectangle(validRectangle)).toBe(true);
      expect(InteractionValidator.validateRectangle({ x: 0, y: 0, width: 0, height: 0 })).toBe(true);
      expect(InteractionValidator.validateRectangle({ x: -10, y: -20, width: 100, height: 50 })).toBe(true);
    });

    it('should reject invalid rectangles', () => {
      expect(InteractionValidator.validateRectangle({ x: NaN, y: 0, width: 100, height: 50 })).toBe(false);
      expect(InteractionValidator.validateRectangle({ x: 0, y: Infinity, width: 100, height: 50 })).toBe(false);
      expect(InteractionValidator.validateRectangle({ x: 0, y: 0, width: -10, height: 50 })).toBe(false);
      expect(InteractionValidator.validateRectangle({ x: 0, y: 0, width: 100, height: 'invalid' as any })).toBe(false);
    });
  });

  describe('validateGroup', () => {
    it('should validate a valid group', () => {
      const result = InteractionValidator.validateGroup(validGroup);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject group with invalid ID', () => {
      const invalidGroup = { ...validGroup, id: '' };
      const result = InteractionValidator.validateGroup(invalidGroup);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Group ID must be a non-empty string');
    });

    it('should reject group with empty shape IDs', () => {
      const invalidGroup = { ...validGroup, shapeIds: [] };
      const result = InteractionValidator.validateGroup(invalidGroup);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Group must contain at least one shape');
    });

    it('should reject group with invalid shape IDs', () => {
      const invalidGroup = { ...validGroup, shapeIds: ['valid-id', '', 'another-valid'] };
      const result = InteractionValidator.validateGroup(invalidGroup);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All shape IDs must be non-empty strings');
    });

    it('should reject group with duplicate shape IDs', () => {
      const invalidGroup = { ...validGroup, shapeIds: ['shape-1', 'shape-2', 'shape-1'] };
      const result = InteractionValidator.validateGroup(invalidGroup);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Group cannot contain duplicate shape IDs');
    });

    it('should reject group with invalid bounds', () => {
      const invalidGroup = { ...validGroup, bounds: { x: NaN, y: 0, width: 100, height: 50 } };
      const result = InteractionValidator.validateGroup(invalidGroup);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Group bounds must be a valid rectangle');
    });

    it('should reject group with invalid locked property', () => {
      const invalidGroup = { ...validGroup, locked: 'not-boolean' as any };
      const result = InteractionValidator.validateGroup(invalidGroup);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Group locked property must be a boolean');
    });
  });

  describe('validateDragType', () => {
    it('should validate valid drag types', () => {
      expect(InteractionValidator.validateDragType('move')).toBe(true);
      expect(InteractionValidator.validateDragType('resize')).toBe(true);
      expect(InteractionValidator.validateDragType('rotate')).toBe(true);
    });

    it('should reject invalid drag types', () => {
      expect(InteractionValidator.validateDragType('invalid')).toBe(false);
      expect(InteractionValidator.validateDragType('')).toBe(false);
      expect(InteractionValidator.validateDragType(null)).toBe(false);
      expect(InteractionValidator.validateDragType(123)).toBe(false);
    });
  });

  describe('validateDragState', () => {
    it('should validate a valid drag state', () => {
      const result = InteractionValidator.validateDragState(validDragState);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject drag state with invalid isDragging', () => {
      const invalidDragState = { ...validDragState, isDragging: 'not-boolean' as any };
      const result = InteractionValidator.validateDragState(invalidDragState);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('isDragging must be a boolean');
    });

    it('should reject drag state with invalid positions', () => {
      const invalidDragState = { ...validDragState, startPosition: { x: NaN, y: 0 } };
      const result = InteractionValidator.validateDragState(invalidDragState);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start position must be valid coordinates');
    });

    it('should reject drag state with invalid target shape IDs', () => {
      const invalidDragState = { ...validDragState, targetShapeIds: ['valid-id', ''] };
      const result = InteractionValidator.validateDragState(invalidDragState);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All target shape IDs must be non-empty strings');
    });

    it('should reject drag state with invalid drag type', () => {
      const invalidDragState = { ...validDragState, dragType: 'invalid' as any };
      const result = InteractionValidator.validateDragState(invalidDragState);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Drag type must be one of: move, resize, rotate');
    });
  });

  describe('validateSelectionState', () => {
    it('should validate a valid selection state', () => {
      const result = InteractionValidator.validateSelectionState(validSelectionState);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate selection state with null bounds', () => {
      const selectionWithNullBounds = { ...validSelectionState, selectionBounds: null };
      const result = InteractionValidator.validateSelectionState(selectionWithNullBounds);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject selection state with invalid selectedIds', () => {
      const invalidSelectionState = { ...validSelectionState, selectedIds: ['not', 'a', 'set'] as any };
      const result = InteractionValidator.validateSelectionState(invalidSelectionState);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Selected IDs must be a Set');
    });

    it('should reject selection state with invalid ID in set', () => {
      const invalidSelectionState = { ...validSelectionState, selectedIds: new Set(['valid-id', '']) };
      const result = InteractionValidator.validateSelectionState(invalidSelectionState);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All selected IDs must be non-empty strings');
    });

    it('should reject selection state with invalid bounds', () => {
      const invalidSelectionState = { 
        ...validSelectionState, 
        selectionBounds: { x: NaN, y: 0, width: 100, height: 50 } 
      };
      const result = InteractionValidator.validateSelectionState(invalidSelectionState);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Selection bounds must be null or a valid rectangle');
    });

    it('should reject selection state with invalid isMultiSelect', () => {
      const invalidSelectionState = { ...validSelectionState, isMultiSelect: 'not-boolean' as any };
      const result = InteractionValidator.validateSelectionState(invalidSelectionState);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('isMultiSelect must be a boolean');
    });
  });

  describe('validateUserPresence', () => {
    it('should validate a valid user presence', () => {
      const result = InteractionValidator.validateUserPresence(validUserPresence);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate user presence without avatar', () => {
      const presenceWithoutAvatar = { ...validUserPresence };
      delete presenceWithoutAvatar.avatar;
      
      const result = InteractionValidator.validateUserPresence(presenceWithoutAvatar);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject user presence with invalid user ID', () => {
      const invalidPresence = { ...validUserPresence, userId: '' };
      const result = InteractionValidator.validateUserPresence(invalidPresence);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID must be a non-empty string');
    });

    it('should reject user presence with invalid name', () => {
      const invalidPresence = { ...validUserPresence, name: '' };
      const result = InteractionValidator.validateUserPresence(invalidPresence);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User name must be a non-empty string');
    });

    it('should reject user presence with invalid avatar type', () => {
      const invalidPresence = { ...validUserPresence, avatar: 123 as any };
      const result = InteractionValidator.validateUserPresence(invalidPresence);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Avatar must be a string if provided');
    });

    it('should reject user presence with invalid cursor', () => {
      const invalidPresence = { ...validUserPresence, cursor: { x: NaN, y: 0 } };
      const result = InteractionValidator.validateUserPresence(invalidPresence);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cursor position must be valid coordinates');
    });

    it('should reject user presence with invalid selection', () => {
      const invalidPresence = { ...validUserPresence, selection: ['valid-id', ''] };
      const result = InteractionValidator.validateUserPresence(invalidPresence);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All selection IDs must be non-empty strings');
    });

    it('should reject user presence with invalid isActive', () => {
      const invalidPresence = { ...validUserPresence, isActive: 'not-boolean' as any };
      const result = InteractionValidator.validateUserPresence(invalidPresence);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('isActive must be a boolean');
    });
  });

  describe('sanitizeGroup', () => {
    it('should fix invalid shape IDs', () => {
      const invalidGroup = {
        shapeIds: ['valid-id', '', 'another-valid', 'valid-id'], // Empty string and duplicate
      };

      const sanitized = InteractionValidator.sanitizeGroup(invalidGroup);
      expect(sanitized.shapeIds).toEqual(['valid-id', 'another-valid']); // Duplicates and empty removed
    });

    it('should fix invalid bounds', () => {
      const invalidGroup = {
        bounds: { x: NaN, y: Infinity, width: -10, height: 'invalid' as any },
      };

      const sanitized = InteractionValidator.sanitizeGroup(invalidGroup);
      expect(sanitized.bounds).toEqual({ x: 0, y: 0, width: 0, height: 100 });
    });

    it('should fix invalid locked property', () => {
      const invalidGroup = {
        locked: 'not-boolean' as any,
      };

      const sanitized = InteractionValidator.sanitizeGroup(invalidGroup);
      expect(sanitized.locked).toBe(false);
    });

    it('should preserve valid properties', () => {
      const sanitized = InteractionValidator.sanitizeGroup(validGroup);
      expect(sanitized).toEqual(validGroup);
    });
  });

  describe('sanitizeDragState', () => {
    it('should fix invalid isDragging', () => {
      const invalidDragState = {
        isDragging: 'not-boolean' as any,
      };

      const sanitized = InteractionValidator.sanitizeDragState(invalidDragState);
      expect(sanitized.isDragging).toBe(false);
    });

    it('should fix invalid positions', () => {
      const invalidDragState = {
        startPosition: { x: NaN, y: Infinity },
        currentPosition: { x: 'invalid' as any, y: -Infinity },
      };

      const sanitized = InteractionValidator.sanitizeDragState(invalidDragState);
      expect(sanitized.startPosition).toEqual({ x: 0, y: 0 });
      expect(sanitized.currentPosition).toEqual({ x: 0, y: 0 });
    });

    it('should fix invalid target shape IDs', () => {
      const invalidDragState = {
        targetShapeIds: ['valid-id', '', 'another-valid'],
      };

      const sanitized = InteractionValidator.sanitizeDragState(invalidDragState);
      expect(sanitized.targetShapeIds).toEqual(['valid-id', 'another-valid']);
    });

    it('should fix invalid drag type', () => {
      const invalidDragState = {
        dragType: 'invalid' as any,
      };

      const sanitized = InteractionValidator.sanitizeDragState(invalidDragState);
      expect(sanitized.dragType).toBe('move');
    });

    it('should preserve valid properties', () => {
      const sanitized = InteractionValidator.sanitizeDragState(validDragState);
      expect(sanitized).toEqual(validDragState);
    });
  });

  describe('sanitizeSelectionState', () => {
    it('should fix invalid selectedIds', () => {
      const invalidSelectionState = {
        selectedIds: ['not', 'a', 'set'] as any,
      };

      const sanitized = InteractionValidator.sanitizeSelectionState(invalidSelectionState);
      expect(sanitized.selectedIds).toEqual(new Set());
    });

    it('should filter invalid IDs from Set', () => {
      const invalidSelectionState = {
        selectedIds: new Set(['valid-id', '', 'another-valid']),
      };

      const sanitized = InteractionValidator.sanitizeSelectionState(invalidSelectionState);
      expect(sanitized.selectedIds).toEqual(new Set(['valid-id', 'another-valid']));
    });

    it('should fix invalid selection bounds', () => {
      const invalidSelectionState = {
        selectionBounds: { x: NaN, y: 0, width: 100, height: 50 },
      };

      const sanitized = InteractionValidator.sanitizeSelectionState(invalidSelectionState);
      expect(sanitized.selectionBounds).toBeNull();
    });

    it('should fix invalid isMultiSelect', () => {
      const invalidSelectionState = {
        isMultiSelect: 'not-boolean' as any,
      };

      const sanitized = InteractionValidator.sanitizeSelectionState(invalidSelectionState);
      expect(sanitized.isMultiSelect).toBe(false);
    });

    it('should preserve valid properties', () => {
      const sanitized = InteractionValidator.sanitizeSelectionState(validSelectionState);
      expect(sanitized).toEqual(validSelectionState);
    });
  });
});

describe('InteractionValidationError', () => {
  it('should create error with message', () => {
    const error = new InteractionValidationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('InteractionValidationError');
  });

  it('should create error with entity ID and errors', () => {
    const errors = ['Error 1', 'Error 2'];
    const error = new InteractionValidationError('Test error', 'entity-123', errors);
    
    expect(error.message).toBe('Test error');
    expect(error.entityId).toBe('entity-123');
    expect(error.errors).toEqual(errors);
  });
});