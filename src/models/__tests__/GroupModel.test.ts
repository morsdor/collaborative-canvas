import * as Y from 'yjs';
import { GroupModel } from '../GroupModel';
import { Group, Rectangle } from '../../types';

describe('GroupModel', () => {
  const mockBounds: Rectangle = {
    x: 100,
    y: 200,
    width: 300,
    height: 150,
  };

  const mockGroup: Group = {
    id: 'test-group-1',
    shapeIds: ['shape-1', 'shape-2', 'shape-3'],
    bounds: mockBounds,
    locked: false,
  };

  describe('constructor', () => {
    it('should create a GroupModel with all properties', () => {
      const model = new GroupModel(
        mockGroup.id,
        mockGroup.shapeIds,
        mockGroup.bounds,
        mockGroup.locked
      );

      expect(model.id).toBe(mockGroup.id);
      expect(model.shapeIds).toEqual(mockGroup.shapeIds);
      expect(model.bounds).toEqual(mockGroup.bounds);
      expect(model.locked).toBe(mockGroup.locked);
    });

    it('should default locked to false when not provided', () => {
      const model = new GroupModel(
        'test-id',
        ['shape-1'],
        mockBounds
      );

      expect(model.locked).toBe(false);
    });
  });

  describe('toYjsMap', () => {
    it('should convert GroupModel to Y.Map with all properties', () => {
      const doc = new Y.Doc();
      const model = GroupModel.fromGroup(mockGroup);
      const yjsMap = model.toYjsMap();
      
      // Add the map to the document to enable access
      doc.getMap('test').set('group', yjsMap);

      expect(yjsMap.get('shapeIds')).toEqual(mockGroup.shapeIds);
      expect(yjsMap.get('bounds')).toEqual(mockGroup.bounds);
      expect(yjsMap.get('locked')).toBe(mockGroup.locked);
    });
  });

  describe('fromYjsMap', () => {
    it('should create GroupModel from Y.Map with all properties', () => {
      const doc = new Y.Doc();
      const yjsMap = new Y.Map();
      
      // Add the map to the document first
      doc.getMap('test').set('group', yjsMap);
      
      yjsMap.set('shapeIds', mockGroup.shapeIds);
      yjsMap.set('bounds', mockGroup.bounds);
      yjsMap.set('locked', mockGroup.locked);

      const model = GroupModel.fromYjsMap(mockGroup.id, yjsMap);

      expect(model.id).toBe(mockGroup.id);
      expect(model.shapeIds).toEqual(mockGroup.shapeIds);
      expect(model.bounds).toEqual(mockGroup.bounds);
      expect(model.locked).toBe(mockGroup.locked);
    });
  });

  describe('serialization round-trip', () => {
    it('should maintain data integrity through toYjsMap -> fromYjsMap', () => {
      const doc = new Y.Doc();
      const originalModel = GroupModel.fromGroup(mockGroup);
      const yjsMap = originalModel.toYjsMap();
      
      // Add the map to the document to enable access
      doc.getMap('test').set('group', yjsMap);
      
      const deserializedModel = GroupModel.fromYjsMap(mockGroup.id, yjsMap);

      expect(deserializedModel.id).toBe(originalModel.id);
      expect(deserializedModel.shapeIds).toEqual(originalModel.shapeIds);
      expect(deserializedModel.bounds).toEqual(originalModel.bounds);
      expect(deserializedModel.locked).toBe(originalModel.locked);
    });
  });

  describe('toGroup', () => {
    it('should convert GroupModel to plain Group object', () => {
      const model = GroupModel.fromGroup(mockGroup);
      const group = model.toGroup();

      expect(group).toEqual(mockGroup);
      expect(group).not.toBe(mockGroup); // Should be a new object
    });
  });

  describe('fromGroup', () => {
    it('should create GroupModel from plain Group object', () => {
      const model = GroupModel.fromGroup(mockGroup);

      expect(model.id).toBe(mockGroup.id);
      expect(model.shapeIds).toEqual(mockGroup.shapeIds);
      expect(model.bounds).toEqual(mockGroup.bounds);
      expect(model.locked).toBe(mockGroup.locked);
    });
  });

  describe('update', () => {
    it('should return new instance with updated properties', () => {
      const model = GroupModel.fromGroup(mockGroup);
      const newBounds = { x: 50, y: 75, width: 200, height: 100 };
      const newShapeIds = ['shape-4', 'shape-5'];

      const updatedModel = model.update({
        bounds: newBounds,
        shapeIds: newShapeIds,
      });

      expect(updatedModel).not.toBe(model); // Should be new instance
      expect(updatedModel.id).toBe(model.id); // ID should remain same
      expect(updatedModel.bounds).toEqual(newBounds);
      expect(updatedModel.shapeIds).toEqual(newShapeIds);
      expect(updatedModel.locked).toBe(model.locked); // Unchanged properties preserved
    });

    it('should handle partial updates', () => {
      const model = GroupModel.fromGroup(mockGroup);
      const updatedModel = model.update({ locked: true });

      expect(updatedModel.locked).toBe(true);
      expect(updatedModel.shapeIds).toEqual(model.shapeIds);
      expect(updatedModel.bounds).toEqual(model.bounds);
    });
  });

  describe('addShape', () => {
    it('should add a new shape to the group', () => {
      const model = GroupModel.fromGroup(mockGroup);
      const newShapeId = 'shape-4';
      const updatedModel = model.addShape(newShapeId);

      expect(updatedModel.shapeIds).toContain(newShapeId);
      expect(updatedModel.shapeIds).toHaveLength(mockGroup.shapeIds.length + 1);
      expect(updatedModel).not.toBe(model); // Should be new instance
    });

    it('should not add duplicate shapes', () => {
      const model = GroupModel.fromGroup(mockGroup);
      const existingShapeId = mockGroup.shapeIds[0];
      const updatedModel = model.addShape(existingShapeId);

      expect(updatedModel).toBe(model); // Should return same instance
      expect(updatedModel.shapeIds).toHaveLength(mockGroup.shapeIds.length);
    });
  });

  describe('removeShape', () => {
    it('should remove a shape from the group', () => {
      const model = GroupModel.fromGroup(mockGroup);
      const shapeToRemove = mockGroup.shapeIds[1];
      const updatedModel = model.removeShape(shapeToRemove);

      expect(updatedModel.shapeIds).not.toContain(shapeToRemove);
      expect(updatedModel.shapeIds).toHaveLength(mockGroup.shapeIds.length - 1);
      expect(updatedModel).not.toBe(model); // Should be new instance
    });

    it('should return same instance if shape not in group', () => {
      const model = GroupModel.fromGroup(mockGroup);
      const nonExistentShapeId = 'non-existent-shape';
      const updatedModel = model.removeShape(nonExistentShapeId);

      expect(updatedModel).toBe(model); // Should return same instance
      expect(updatedModel.shapeIds).toHaveLength(mockGroup.shapeIds.length);
    });
  });

  describe('containsShape', () => {
    it('should return true for shapes in the group', () => {
      const model = GroupModel.fromGroup(mockGroup);
      
      mockGroup.shapeIds.forEach(shapeId => {
        expect(model.containsShape(shapeId)).toBe(true);
      });
    });

    it('should return false for shapes not in the group', () => {
      const model = GroupModel.fromGroup(mockGroup);
      
      expect(model.containsShape('non-existent-shape')).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('should return false for group with shapes', () => {
      const model = GroupModel.fromGroup(mockGroup);
      expect(model.isEmpty()).toBe(false);
    });

    it('should return true for empty group', () => {
      const emptyGroup: Group = {
        id: 'empty-group',
        shapeIds: [],
        bounds: mockBounds,
        locked: false,
      };
      
      const model = GroupModel.fromGroup(emptyGroup);
      expect(model.isEmpty()).toBe(true);
    });
  });

  describe('updateBounds', () => {
    it('should update the bounds of the group', () => {
      const model = GroupModel.fromGroup(mockGroup);
      const newBounds = { x: 50, y: 75, width: 200, height: 100 };
      const updatedModel = model.updateBounds(newBounds);

      expect(updatedModel.bounds).toEqual(newBounds);
      expect(updatedModel).not.toBe(model); // Should be new instance
    });
  });

  describe('toggleLocked', () => {
    it('should toggle the locked state', () => {
      const model = GroupModel.fromGroup(mockGroup);
      const toggledModel = model.toggleLocked();

      expect(toggledModel.locked).toBe(!mockGroup.locked);
      expect(toggledModel).not.toBe(model); // Should be new instance
    });

    it('should toggle back to original state', () => {
      const model = GroupModel.fromGroup(mockGroup);
      const doubleToggledModel = model.toggleLocked().toggleLocked();

      expect(doubleToggledModel.locked).toBe(mockGroup.locked);
    });
  });

  describe('clone', () => {
    it('should create a copy with new ID', () => {
      const model = GroupModel.fromGroup(mockGroup);
      const newId = 'cloned-group-id';
      const clonedModel = model.clone(newId);

      expect(clonedModel.id).toBe(newId);
      expect(clonedModel.shapeIds).toEqual(model.shapeIds);
      expect(clonedModel.shapeIds).not.toBe(model.shapeIds); // Should be deep copy
      expect(clonedModel.bounds).toEqual(model.bounds);
      expect(clonedModel.bounds).not.toBe(model.bounds); // Should be deep copy
      expect(clonedModel.locked).toBe(model.locked);
    });
  });
});