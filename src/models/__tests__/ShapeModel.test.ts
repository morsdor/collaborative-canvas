import * as Y from 'yjs';
import { ShapeModel } from '../ShapeModel';
import { Shape, ShapeType, Point, Size, ShapeStyle } from '../../types';

describe('ShapeModel', () => {
  const mockShape: Shape = {
    id: 'test-shape-1',
    type: 'rectangle' as ShapeType,
    position: { x: 100, y: 200 },
    dimensions: { width: 150, height: 100 },
    style: {
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 2,
      opacity: 0.8,
    },
    content: 'Test content',
    groupId: 'group-1',
  };

  describe('constructor', () => {
    it('should create a ShapeModel with all properties', () => {
      const model = new ShapeModel(
        mockShape.id,
        mockShape.type,
        mockShape.position,
        mockShape.dimensions,
        mockShape.style,
        mockShape.content,
        mockShape.groupId
      );

      expect(model.id).toBe(mockShape.id);
      expect(model.type).toBe(mockShape.type);
      expect(model.position).toEqual(mockShape.position);
      expect(model.dimensions).toEqual(mockShape.dimensions);
      expect(model.style).toEqual(mockShape.style);
      expect(model.content).toBe(mockShape.content);
      expect(model.groupId).toBe(mockShape.groupId);
    });

    it('should create a ShapeModel with optional properties undefined', () => {
      const model = new ShapeModel(
        'test-id',
        'circle',
        { x: 0, y: 0 },
        { width: 50, height: 50 },
        { fill: '#blue', stroke: '#black', strokeWidth: 1, opacity: 1 }
      );

      expect(model.content).toBeUndefined();
      expect(model.groupId).toBeUndefined();
    });
  });

  describe('toYjsMap', () => {
    it('should convert ShapeModel to Y.Map with all properties', () => {
      const doc = new Y.Doc();
      const model = ShapeModel.fromShape(mockShape);
      const yjsMap = model.toYjsMap();
      
      // Add the map to the document to enable access
      doc.getMap('test').set('shape', yjsMap);

      expect(yjsMap.get('type')).toBe(mockShape.type);
      expect(yjsMap.get('position')).toEqual(mockShape.position);
      expect(yjsMap.get('dimensions')).toEqual(mockShape.dimensions);
      expect(yjsMap.get('style')).toEqual(mockShape.style);
      expect(yjsMap.get('content')).toBe(mockShape.content);
      expect(yjsMap.get('groupId')).toBe(mockShape.groupId);
    });

    it('should not include undefined optional properties in Y.Map', () => {
      const doc = new Y.Doc();
      const shapeWithoutOptionals: Shape = {
        id: 'test-id',
        type: 'circle',
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        style: { fill: '#blue', stroke: '#black', strokeWidth: 1, opacity: 1 },
      };

      const model = ShapeModel.fromShape(shapeWithoutOptionals);
      const yjsMap = model.toYjsMap();
      
      // Add the map to the document to enable access
      doc.getMap('test').set('shape', yjsMap);

      expect(yjsMap.has('content')).toBe(false);
      expect(yjsMap.has('groupId')).toBe(false);
    });
  });

  describe('fromYjsMap', () => {
    it('should create ShapeModel from Y.Map with all properties', () => {
      const doc = new Y.Doc();
      const yjsMap = new Y.Map();
      
      // Add the map to the document first
      doc.getMap('test').set('shape', yjsMap);
      
      yjsMap.set('type', mockShape.type);
      yjsMap.set('position', mockShape.position);
      yjsMap.set('dimensions', mockShape.dimensions);
      yjsMap.set('style', mockShape.style);
      yjsMap.set('content', mockShape.content);
      yjsMap.set('groupId', mockShape.groupId);

      const model = ShapeModel.fromYjsMap(mockShape.id, yjsMap);

      expect(model.id).toBe(mockShape.id);
      expect(model.type).toBe(mockShape.type);
      expect(model.position).toEqual(mockShape.position);
      expect(model.dimensions).toEqual(mockShape.dimensions);
      expect(model.style).toEqual(mockShape.style);
      expect(model.content).toBe(mockShape.content);
      expect(model.groupId).toBe(mockShape.groupId);
    });

    it('should handle missing optional properties', () => {
      const doc = new Y.Doc();
      const yjsMap = new Y.Map();
      
      // Add the map to the document first
      doc.getMap('test').set('shape', yjsMap);
      
      yjsMap.set('type', 'rectangle');
      yjsMap.set('position', { x: 10, y: 20 });
      yjsMap.set('dimensions', { width: 100, height: 80 });
      yjsMap.set('style', { fill: '#red', stroke: '#blue', strokeWidth: 1, opacity: 1 });

      const model = ShapeModel.fromYjsMap('test-id', yjsMap);

      expect(model.content).toBeUndefined();
      expect(model.groupId).toBeUndefined();
    });
  });

  describe('serialization round-trip', () => {
    it('should maintain data integrity through toYjsMap -> fromYjsMap', () => {
      const doc = new Y.Doc();
      const originalModel = ShapeModel.fromShape(mockShape);
      const yjsMap = originalModel.toYjsMap();
      
      // Add the map to the document to enable access
      doc.getMap('test').set('shape', yjsMap);
      
      const deserializedModel = ShapeModel.fromYjsMap(mockShape.id, yjsMap);

      expect(deserializedModel.id).toBe(originalModel.id);
      expect(deserializedModel.type).toBe(originalModel.type);
      expect(deserializedModel.position).toEqual(originalModel.position);
      expect(deserializedModel.dimensions).toEqual(originalModel.dimensions);
      expect(deserializedModel.style).toEqual(originalModel.style);
      expect(deserializedModel.content).toBe(originalModel.content);
      expect(deserializedModel.groupId).toBe(originalModel.groupId);
    });

    it('should handle shapes without optional properties', () => {
      const doc = new Y.Doc();
      const minimalShape: Shape = {
        id: 'minimal',
        type: 'line',
        position: { x: 5, y: 10 },
        dimensions: { width: 20, height: 1 },
        style: { fill: 'transparent', stroke: '#000', strokeWidth: 2, opacity: 1 },
      };

      const originalModel = ShapeModel.fromShape(minimalShape);
      const yjsMap = originalModel.toYjsMap();
      
      // Add the map to the document to enable access
      doc.getMap('test').set('shape', yjsMap);
      
      const deserializedModel = ShapeModel.fromYjsMap(minimalShape.id, yjsMap);

      expect(deserializedModel).toEqual(originalModel);
    });
  });

  describe('toShape', () => {
    it('should convert ShapeModel to plain Shape object', () => {
      const model = ShapeModel.fromShape(mockShape);
      const shape = model.toShape();

      expect(shape).toEqual(mockShape);
      expect(shape).not.toBe(mockShape); // Should be a new object
    });
  });

  describe('fromShape', () => {
    it('should create ShapeModel from plain Shape object', () => {
      const model = ShapeModel.fromShape(mockShape);

      expect(model.id).toBe(mockShape.id);
      expect(model.type).toBe(mockShape.type);
      expect(model.position).toEqual(mockShape.position);
      expect(model.dimensions).toEqual(mockShape.dimensions);
      expect(model.style).toEqual(mockShape.style);
      expect(model.content).toBe(mockShape.content);
      expect(model.groupId).toBe(mockShape.groupId);
    });
  });

  describe('update', () => {
    it('should return new instance with updated properties', () => {
      const model = ShapeModel.fromShape(mockShape);
      const newPosition = { x: 300, y: 400 };
      const newStyle = { ...mockShape.style, fill: '#00ff00' };

      const updatedModel = model.update({
        position: newPosition,
        style: newStyle,
      });

      expect(updatedModel).not.toBe(model); // Should be new instance
      expect(updatedModel.id).toBe(model.id); // ID should remain same
      expect(updatedModel.position).toEqual(newPosition);
      expect(updatedModel.style).toEqual(newStyle);
      expect(updatedModel.type).toBe(model.type); // Unchanged properties preserved
      expect(updatedModel.dimensions).toEqual(model.dimensions);
    });

    it('should handle partial updates', () => {
      const model = ShapeModel.fromShape(mockShape);
      const updatedModel = model.update({ content: 'New content' });

      expect(updatedModel.content).toBe('New content');
      expect(updatedModel.position).toEqual(model.position);
      expect(updatedModel.style).toEqual(model.style);
    });
  });

  describe('clone', () => {
    it('should create a copy with new ID', () => {
      const model = ShapeModel.fromShape(mockShape);
      const newId = 'cloned-shape-id';
      const clonedModel = model.clone(newId);

      expect(clonedModel.id).toBe(newId);
      expect(clonedModel.type).toBe(model.type);
      expect(clonedModel.position).toEqual(model.position);
      expect(clonedModel.position).not.toBe(model.position); // Should be deep copy
      expect(clonedModel.dimensions).toEqual(model.dimensions);
      expect(clonedModel.dimensions).not.toBe(model.dimensions); // Should be deep copy
      expect(clonedModel.style).toEqual(model.style);
      expect(clonedModel.style).not.toBe(model.style); // Should be deep copy
      expect(clonedModel.content).toBe(model.content);
      expect(clonedModel.groupId).toBe(model.groupId);
    });
  });
});