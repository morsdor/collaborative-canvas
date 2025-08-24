import { GroupService } from '../groupService';
import { Shape, Group, Rectangle } from '@/types';

// Mock the utils
jest.mock('@/utils', () => ({
  generateId: jest.fn(() => 'test-id'),
  getMultipleShapesBounds: jest.fn(),
}));

describe('GroupService', () => {
  const mockShapes: Shape[] = [
    {
      id: 'shape-1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      dimensions: { width: 100, height: 100 },
      style: { fill: '#ff0000', stroke: '#000000', strokeWidth: 2, opacity: 1 },
    },
    {
      id: 'shape-2',
      type: 'circle',
      position: { x: 250, y: 150 },
      dimensions: { width: 80, height: 80 },
      style: { fill: '#00ff00', stroke: '#000000', strokeWidth: 2, opacity: 1 },
    },
    {
      id: 'shape-3',
      type: 'rectangle',
      position: { x: 400, y: 200 },
      dimensions: { width: 120, height: 60 },
      style: { fill: '#0000ff', stroke: '#000000', strokeWidth: 2, opacity: 1 },
    },
  ];

  const mockBounds: Rectangle = {
    x: 100,
    y: 100,
    width: 250,
    height: 130,
  };

  const mockGroup: Group = {
    id: 'group-1',
    shapeIds: ['shape-1', 'shape-2'],
    bounds: mockBounds,
    locked: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { getMultipleShapesBounds } = require('@/utils');
    getMultipleShapesBounds.mockReturnValue(mockBounds);
  });

  describe('createGroup', () => {
    it('should create a group from multiple shapes', () => {
      const shapes = [mockShapes[0], mockShapes[1]];
      const group = GroupService.createGroup(shapes);

      expect(group).toEqual({
        id: 'test-id',
        shapeIds: ['shape-1', 'shape-2'],
        bounds: mockBounds,
        locked: false,
      });
    });

    it('should return null for less than 2 shapes', () => {
      const shapes = [mockShapes[0]];
      const group = GroupService.createGroup(shapes);

      expect(group).toBeNull();
    });

    it('should return null when bounds calculation fails', () => {
      const { getMultipleShapesBounds } = require('@/utils');
      getMultipleShapesBounds.mockReturnValue(null);

      const shapes = [mockShapes[0], mockShapes[1]];
      const group = GroupService.createGroup(shapes);

      expect(group).toBeNull();
    });
  });

  describe('calculateGroupBounds', () => {
    it('should calculate bounds for multiple shapes', () => {
      const shapes = [mockShapes[0], mockShapes[1]];
      const bounds = GroupService.calculateGroupBounds(shapes);

      expect(bounds).toEqual(mockBounds);
    });

    it('should return null for empty shapes array', () => {
      const { getMultipleShapesBounds } = require('@/utils');
      getMultipleShapesBounds.mockReturnValue(null);

      const bounds = GroupService.calculateGroupBounds([]);
      expect(bounds).toBeNull();
    });
  });

  describe('updateGroupBounds', () => {
    it('should update group bounds based on current shape positions', () => {
      const newBounds = { x: 50, y: 50, width: 300, height: 200 };
      const { getMultipleShapesBounds } = require('@/utils');
      getMultipleShapesBounds.mockReturnValue(newBounds);

      const updatedGroup = GroupService.updateGroupBounds(mockGroup, mockShapes);

      expect(updatedGroup.bounds).toEqual(newBounds);
      expect(updatedGroup.id).toBe(mockGroup.id);
      expect(updatedGroup.shapeIds).toEqual(mockGroup.shapeIds);
    });

    it('should return original group when bounds calculation fails', () => {
      const { getMultipleShapesBounds } = require('@/utils');
      getMultipleShapesBounds.mockReturnValue(null);

      const updatedGroup = GroupService.updateGroupBounds(mockGroup, mockShapes);

      expect(updatedGroup).toEqual(mockGroup);
    });
  });

  describe('getGroupShapes', () => {
    it('should return shapes that belong to the group', () => {
      const groupShapes = GroupService.getGroupShapes(mockGroup, mockShapes);

      expect(groupShapes).toHaveLength(2);
      expect(groupShapes[0].id).toBe('shape-1');
      expect(groupShapes[1].id).toBe('shape-2');
    });

    it('should return empty array when no shapes match', () => {
      const emptyGroup: Group = {
        ...mockGroup,
        shapeIds: ['non-existent-1', 'non-existent-2'],
      };

      const groupShapes = GroupService.getGroupShapes(emptyGroup, mockShapes);
      expect(groupShapes).toHaveLength(0);
    });
  });

  describe('isShapeInGroup', () => {
    const groups = [mockGroup];

    it('should return group when shape is in a group', () => {
      const group = GroupService.isShapeInGroup('shape-1', groups);
      expect(group).toEqual(mockGroup);
    });

    it('should return null when shape is not in any group', () => {
      const group = GroupService.isShapeInGroup('shape-3', groups);
      expect(group).toBeNull();
    });

    it('should return null when no groups exist', () => {
      const group = GroupService.isShapeInGroup('shape-1', []);
      expect(group).toBeNull();
    });
  });

  describe('getUngroupedShapes', () => {
    const groups = [mockGroup];

    it('should return shapes that are not in any group', () => {
      const ungroupedShapes = GroupService.getUngroupedShapes(mockShapes, groups);

      expect(ungroupedShapes).toHaveLength(1);
      expect(ungroupedShapes[0].id).toBe('shape-3');
    });

    it('should return all shapes when no groups exist', () => {
      const ungroupedShapes = GroupService.getUngroupedShapes(mockShapes, []);
      expect(ungroupedShapes).toEqual(mockShapes);
    });
  });

  describe('moveGroup', () => {
    it('should move all shapes in the group', () => {
      const deltaX = 50;
      const deltaY = 30;

      const result = GroupService.moveGroup(mockGroup, deltaX, deltaY, mockShapes);

      expect(result.updatedShapes).toHaveLength(2);
      expect(result.updatedShapes[0].position).toEqual({ x: 150, y: 130 });
      expect(result.updatedShapes[1].position).toEqual({ x: 300, y: 180 });

      expect(result.updatedGroup.bounds).toEqual({
        x: 150,
        y: 130,
        width: 250,
        height: 130,
      });
    });

    it('should handle empty group gracefully', () => {
      const emptyGroup: Group = {
        ...mockGroup,
        shapeIds: [],
      };

      const result = GroupService.moveGroup(emptyGroup, 10, 10, mockShapes);

      expect(result.updatedShapes).toHaveLength(0);
      expect(result.updatedGroup.bounds).toEqual({
        x: 110,
        y: 110,
        width: 250,
        height: 130,
      });
    });
  });

  describe('resizeGroup', () => {
    it('should resize all shapes in the group proportionally', () => {
      const newBounds: Rectangle = {
        x: 100,
        y: 100,
        width: 500, // 2x original width
        height: 260, // 2x original height
      };

      const result = GroupService.resizeGroup(mockGroup, newBounds, mockShapes);

      expect(result.updatedShapes).toHaveLength(2);
      
      // First shape should be scaled 2x
      expect(result.updatedShapes[0].dimensions).toEqual({
        width: 200, // 100 * 2
        height: 200, // 100 * 2
      });

      // Second shape should be scaled 2x
      expect(result.updatedShapes[1].dimensions).toEqual({
        width: 160, // 80 * 2
        height: 160, // 80 * 2
      });

      expect(result.updatedGroup.bounds).toEqual(newBounds);
    });

    it('should handle zero-sized original bounds gracefully', () => {
      const zeroBoundsGroup: Group = {
        ...mockGroup,
        bounds: { x: 100, y: 100, width: 0, height: 0 },
      };

      const newBounds: Rectangle = {
        x: 100,
        y: 100,
        width: 200,
        height: 200,
      };

      const result = GroupService.resizeGroup(zeroBoundsGroup, newBounds, mockShapes);

      // Should not crash and return some result
      expect(result.updatedShapes).toHaveLength(2);
      expect(result.updatedGroup.bounds).toEqual(newBounds);
    });
  });

  describe('validateGroup', () => {
    it('should return true when all shape IDs exist', () => {
      const isValid = GroupService.validateGroup(mockGroup, mockShapes);
      expect(isValid).toBe(true);
    });

    it('should return false when some shape IDs do not exist', () => {
      const invalidGroup: Group = {
        ...mockGroup,
        shapeIds: ['shape-1', 'non-existent-shape'],
      };

      const isValid = GroupService.validateGroup(invalidGroup, mockShapes);
      expect(isValid).toBe(false);
    });

    it('should return false when no shape IDs exist', () => {
      const invalidGroup: Group = {
        ...mockGroup,
        shapeIds: ['non-existent-1', 'non-existent-2'],
      };

      const isValid = GroupService.validateGroup(invalidGroup, mockShapes);
      expect(isValid).toBe(false);
    });
  });

  describe('cleanupGroups', () => {
    it('should remove references to deleted shapes', () => {
      const groups: Group[] = [
        mockGroup,
        {
          id: 'group-2',
          shapeIds: ['shape-2', 'shape-3', 'deleted-shape'],
          bounds: mockBounds,
          locked: false,
        },
      ];

      const cleanedGroups = GroupService.cleanupGroups(groups, mockShapes);

      expect(cleanedGroups).toHaveLength(2);
      expect(cleanedGroups[0]).toEqual(mockGroup); // Unchanged
      expect(cleanedGroups[1].shapeIds).toEqual(['shape-2', 'shape-3']); // Cleaned
    });

    it('should remove groups with less than 2 shapes after cleanup', () => {
      const groups: Group[] = [
        {
          id: 'group-1',
          shapeIds: ['shape-1', 'deleted-shape'],
          bounds: mockBounds,
          locked: false,
        },
        {
          id: 'group-2',
          shapeIds: ['deleted-shape-1', 'deleted-shape-2'],
          bounds: mockBounds,
          locked: false,
        },
      ];

      const cleanedGroups = GroupService.cleanupGroups(groups, mockShapes);

      expect(cleanedGroups).toHaveLength(0); // Both groups removed
    });

    it('should handle empty groups array', () => {
      const cleanedGroups = GroupService.cleanupGroups([], mockShapes);
      expect(cleanedGroups).toEqual([]);
    });
  });

  describe('canGroupShapes', () => {
    const existingGroups = [mockGroup];

    it('should return true when shapes are not in any group', () => {
      const canGroup = GroupService.canGroupShapes(['shape-3'], existingGroups);
      expect(canGroup).toBe(true);
    });

    it('should return false when some shapes are already grouped', () => {
      const canGroup = GroupService.canGroupShapes(['shape-1', 'shape-3'], existingGroups);
      expect(canGroup).toBe(false);
    });

    it('should return false when all shapes are already grouped', () => {
      const canGroup = GroupService.canGroupShapes(['shape-1', 'shape-2'], existingGroups);
      expect(canGroup).toBe(false);
    });

    it('should return true when no groups exist', () => {
      const canGroup = GroupService.canGroupShapes(['shape-1', 'shape-2'], []);
      expect(canGroup).toBe(true);
    });
  });
});