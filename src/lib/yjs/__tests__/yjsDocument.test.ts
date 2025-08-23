import { YjsDocument } from '../index';
import { Shape, Group, ShapeType } from '@/types';
import * as Y from 'yjs';

describe('YjsDocument', () => {
  let yjsDoc: YjsDocument;

  beforeEach(() => {
    yjsDoc = new YjsDocument();
  });

  afterEach(() => {
    yjsDoc.destroy();
  });

  describe('Document Initialization', () => {
    it('should initialize with empty maps', () => {
      expect(yjsDoc.shapesMap.size).toBe(0);
      expect(yjsDoc.groupsMap.size).toBe(0);
      expect(yjsDoc.metaMap.size).toBeGreaterThan(0); // Should have default metadata
    });

    it('should initialize metadata with default values', () => {
      expect(yjsDoc.metaMap.get('version')).toBe('1.0.0');
      expect(yjsDoc.metaMap.get('createdAt')).toBeDefined();
      expect(yjsDoc.metaMap.get('lastModified')).toBeDefined();
    });

    it('should provide document stats', () => {
      const stats = yjsDoc.getDocumentStats();
      expect(stats).toEqual({
        shapeCount: 0,
        groupCount: 0,
        version: '1.0.0',
        createdAt: expect.any(String),
        lastModified: expect.any(String),
      });
    });
  });

  describe('Shape Management', () => {
    const mockShape: Shape = {
      id: 'shape-1',
      type: 'rectangle' as ShapeType,
      position: { x: 100, y: 100 },
      dimensions: { width: 200, height: 150 },
      style: {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
        opacity: 1,
      },
    };

    it('should add a shape to the document', () => {
      yjsDoc.addShape(mockShape);
      
      expect(yjsDoc.shapesMap.size).toBe(1);
      const retrievedShape = yjsDoc.getShape('shape-1');
      expect(retrievedShape).toEqual(mockShape);
    });

    it('should update a shape in the document', () => {
      yjsDoc.addShape(mockShape);
      
      const updates = {
        position: { x: 150, y: 150 },
        style: { ...mockShape.style, fill: '#00ff00' },
      };
      
      yjsDoc.updateShape('shape-1', updates);
      
      const updatedShape = yjsDoc.getShape('shape-1');
      expect(updatedShape?.position).toEqual({ x: 150, y: 150 });
      expect(updatedShape?.style.fill).toBe('#00ff00');
    });

    it('should delete a shape from the document', () => {
      yjsDoc.addShape(mockShape);
      expect(yjsDoc.shapesMap.size).toBe(1);
      
      yjsDoc.deleteShape('shape-1');
      expect(yjsDoc.shapesMap.size).toBe(0);
      expect(yjsDoc.getShape('shape-1')).toBeNull();
    });

    it('should get all shapes', () => {
      const shape2: Shape = { ...mockShape, id: 'shape-2' };
      
      yjsDoc.addShape(mockShape);
      yjsDoc.addShape(shape2);
      
      const allShapes = yjsDoc.getAllShapes();
      expect(allShapes).toHaveLength(2);
      expect(allShapes.map(s => s.id)).toContain('shape-1');
      expect(allShapes.map(s => s.id)).toContain('shape-2');
    });

    it('should handle shape with optional properties', () => {
      const textShape: Shape = {
        ...mockShape,
        id: 'text-shape',
        type: 'text',
        content: 'Hello World',
        groupId: 'group-1',
      };
      
      yjsDoc.addShape(textShape);
      const retrieved = yjsDoc.getShape('text-shape');
      
      expect(retrieved?.content).toBe('Hello World');
      expect(retrieved?.groupId).toBe('group-1');
    });
  });

  describe('Group Management', () => {
    const mockGroup: Group = {
      id: 'group-1',
      shapeIds: ['shape-1', 'shape-2'],
      bounds: { x: 50, y: 50, width: 300, height: 200 },
      locked: false,
    };

    it('should add a group to the document', () => {
      yjsDoc.addGroup(mockGroup);
      
      expect(yjsDoc.groupsMap.size).toBe(1);
      const retrievedGroup = yjsDoc.getGroup('group-1');
      expect(retrievedGroup).toEqual(mockGroup);
    });

    it('should update a group in the document', () => {
      yjsDoc.addGroup(mockGroup);
      
      const updates = {
        locked: true,
        bounds: { x: 60, y: 60, width: 320, height: 220 },
      };
      
      yjsDoc.updateGroup('group-1', updates);
      
      const updatedGroup = yjsDoc.getGroup('group-1');
      expect(updatedGroup?.locked).toBe(true);
      expect(updatedGroup?.bounds).toEqual({ x: 60, y: 60, width: 320, height: 220 });
    });

    it('should delete a group from the document', () => {
      yjsDoc.addGroup(mockGroup);
      expect(yjsDoc.groupsMap.size).toBe(1);
      
      yjsDoc.deleteGroup('group-1');
      expect(yjsDoc.groupsMap.size).toBe(0);
      expect(yjsDoc.getGroup('group-1')).toBeNull();
    });

    it('should get all groups', () => {
      const group2: Group = { ...mockGroup, id: 'group-2' };
      
      yjsDoc.addGroup(mockGroup);
      yjsDoc.addGroup(group2);
      
      const allGroups = yjsDoc.getAllGroups();
      expect(allGroups).toHaveLength(2);
      expect(allGroups.map(g => g.id)).toContain('group-1');
      expect(allGroups.map(g => g.id)).toContain('group-2');
    });
  });

  describe('Observers', () => {
    it('should notify on shape changes', (done) => {
      const mockShape: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        position: { x: 100, y: 100 },
        dimensions: { width: 200, height: 150 },
        style: {
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 2,
          opacity: 1,
        },
      };

      let callCount = 0;
      const cleanup = yjsDoc.onShapesChange((shapes) => {
        callCount++;
        if (callCount === 1) {
          expect(shapes).toHaveLength(1);
          expect(shapes[0].id).toBe('shape-1');
          cleanup();
          done();
        }
      });

      yjsDoc.addShape(mockShape);
    });

    it('should notify on group changes', (done) => {
      const mockGroup: Group = {
        id: 'group-1',
        shapeIds: ['shape-1'],
        bounds: { x: 50, y: 50, width: 300, height: 200 },
        locked: false,
      };

      let callCount = 0;
      const cleanup = yjsDoc.onGroupsChange((groups) => {
        callCount++;
        if (callCount === 1) {
          expect(groups).toHaveLength(1);
          expect(groups[0].id).toBe('group-1');
          cleanup();
          done();
        }
      });

      yjsDoc.addGroup(mockGroup);
    });

    it('should notify on metadata changes', (done) => {
      let callCount = 0;
      const cleanup = yjsDoc.onMetaChange((meta) => {
        callCount++;
        if (callCount === 1) {
          expect(meta.customField).toBe('test-value');
          cleanup();
          done();
        }
      });

      yjsDoc.metaMap.set('customField', 'test-value');
    });
  });

  describe('Batch Operations', () => {
    it('should perform batch updates in a single transaction', () => {
      const shape1: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        position: { x: 100, y: 100 },
        dimensions: { width: 200, height: 150 },
        style: { fill: '#ff0000', stroke: '#000000', strokeWidth: 2, opacity: 1 },
      };

      const shape2: Shape = {
        id: 'shape-2',
        type: 'circle',
        position: { x: 200, y: 200 },
        dimensions: { width: 100, height: 100 },
        style: { fill: '#00ff00', stroke: '#000000', strokeWidth: 2, opacity: 1 },
      };

      // Batch add multiple shapes
      yjsDoc.batchUpdate([
        () => yjsDoc.addShape(shape1),
        () => yjsDoc.addShape(shape2),
      ]);

      expect(yjsDoc.shapesMap.size).toBe(2);
      expect(yjsDoc.getShape('shape-1')).toBeTruthy();
      expect(yjsDoc.getShape('shape-2')).toBeTruthy();
    });
  });

  describe('Serialization and Yjs Integration', () => {
    it('should properly serialize shapes to Yjs maps', () => {
      const mockShape: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        position: { x: 100, y: 100 },
        dimensions: { width: 200, height: 150 },
        style: {
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 2,
          opacity: 1,
        },
      };

      yjsDoc.addShape(mockShape);
      
      const shapeMap = yjsDoc.shapesMap.get('shape-1');
      expect(shapeMap).toBeDefined();
      expect(shapeMap?.get('type')).toBe('rectangle');
      expect(shapeMap?.get('position')).toEqual({ x: 100, y: 100 });
      expect(shapeMap?.get('createdAt')).toBeDefined();
      expect(shapeMap?.get('updatedAt')).toBeDefined();
    });

    it('should handle concurrent modifications', () => {
      // Create two Yjs documents to simulate different clients
      const doc1 = new YjsDocument();
      const doc2 = new YjsDocument();

      try {
        // Sync the documents
        const state1 = Y.encodeStateAsUpdate(doc1.doc);
        Y.applyUpdate(doc2.doc, state1);

        // Add shapes from both documents
        const shape1: Shape = {
          id: 'shape-1',
          type: 'rectangle',
          position: { x: 100, y: 100 },
          dimensions: { width: 200, height: 150 },
          style: { fill: '#ff0000', stroke: '#000000', strokeWidth: 2, opacity: 1 },
        };

        const shape2: Shape = {
          id: 'shape-2',
          type: 'circle',
          position: { x: 200, y: 200 },
          dimensions: { width: 100, height: 100 },
          style: { fill: '#00ff00', stroke: '#000000', strokeWidth: 2, opacity: 1 },
        };

        doc1.addShape(shape1);
        doc2.addShape(shape2);

        // Sync changes
        const update1 = Y.encodeStateAsUpdate(doc1.doc);
        const update2 = Y.encodeStateAsUpdate(doc2.doc);
        
        Y.applyUpdate(doc1.doc, update2);
        Y.applyUpdate(doc2.doc, update1);

        // Both documents should have both shapes
        expect(doc1.getAllShapes()).toHaveLength(2);
        expect(doc2.getAllShapes()).toHaveLength(2);
      } finally {
        doc1.destroy();
        doc2.destroy();
      }
    });
  });

  describe('Cleanup', () => {
    it('should clean up observers on destroy', () => {
      const callback = jest.fn();
      yjsDoc.onShapesChange(callback);
      yjsDoc.onGroupsChange(callback);
      yjsDoc.onMetaChange(callback);

      expect(yjsDoc['cleanupFunctions']).toHaveLength(3);

      yjsDoc.destroy();

      expect(yjsDoc['cleanupFunctions']).toHaveLength(0);
    });
  });
});