import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Shape, Group, UserPresence } from '@/types';

export interface YjsProviderConfig {
  wsUrl: string;
  roomName: string;
  maxBackoffTime?: number;
  disableBc?: boolean;
  awareness?: boolean;
}

export class YjsDocument {
  public doc: Y.Doc;
  public shapesMap: Y.Map<Y.Map<unknown>>;
  public groupsMap: Y.Map<Y.Map<unknown>>;
  public metaMap: Y.Map<unknown>;
  private provider: WebsocketProvider | null = null;
  private cleanupFunctions: (() => void)[] = [];

  constructor() {
    this.doc = new Y.Doc();
    this.shapesMap = this.doc.getMap('shapes');
    this.groupsMap = this.doc.getMap('groups');
    this.metaMap = this.doc.getMap('meta');
    
    // Initialize metadata with default values
    this.initializeMetadata();
  }

  private initializeMetadata() {
    if (!this.metaMap.has('version')) {
      this.metaMap.set('version', '1.0.0');
    }
    if (!this.metaMap.has('createdAt')) {
      this.metaMap.set('createdAt', new Date().toISOString());
    }
    if (!this.metaMap.has('lastModified')) {
      this.metaMap.set('lastModified', new Date().toISOString());
    }
  }

  connect(config: YjsProviderConfig) {
    if (this.provider) {
      this.provider.destroy();
    }

    this.provider = new WebsocketProvider(
      config.wsUrl, 
      config.roomName, 
      this.doc,
      {
        maxBackoffTime: config.maxBackoffTime || 30000,
        disableBc: config.disableBc || false,
      }
    );

    // Set up connection event handlers
    this.provider.on('status', (event: { status: string }) => {
      console.log('Yjs connection status:', event.status);
    });

    this.provider.on('connection-error', (error: Error) => {
      console.error('Yjs connection error:', error);
    });

    return this.provider;
  }

  disconnect() {
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
  }

  addShape(shape: Shape) {
    const shapeMap = new Y.Map();
    shapeMap.set('type', shape.type);
    shapeMap.set('position', shape.position);
    shapeMap.set('dimensions', shape.dimensions);
    shapeMap.set('style', shape.style);
    shapeMap.set('createdAt', new Date().toISOString());
    shapeMap.set('updatedAt', new Date().toISOString());

    if (shape.content) {
      shapeMap.set('content', shape.content);
    }

    if (shape.groupId) {
      shapeMap.set('groupId', shape.groupId);
    }

    this.shapesMap.set(shape.id, shapeMap);
    this.updateLastModified();
  }

  updateShape(id: string, updates: Partial<Shape>) {
    const shapeMap = this.shapesMap.get(id);
    if (shapeMap) {
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          shapeMap.set(key, value);
        }
      });
      shapeMap.set('updatedAt', new Date().toISOString());
      this.updateLastModified();
    }
  }

  deleteShape(id: string) {
    this.shapesMap.delete(id);
    this.updateLastModified();
  }

  getShape(id: string): Shape | null {
    const shapeMap = this.shapesMap.get(id);
    if (!shapeMap) return null;

    return {
      id,
      type: shapeMap.get('type'),
      position: shapeMap.get('position'),
      dimensions: shapeMap.get('dimensions'),
      style: shapeMap.get('style'),
      content: shapeMap.get('content'),
      groupId: shapeMap.get('groupId'),
    };
  }

  getAllShapes(): Shape[] {
    const shapes: Shape[] = [];
    this.shapesMap.forEach((shapeMap, id) => {
      const shape = this.getShape(id);
      if (shape) {
        shapes.push(shape);
      }
    });
    return shapes;
  }

  // Group management methods
  addGroup(group: Group) {
    const groupMap = new Y.Map();
    groupMap.set('shapeIds', group.shapeIds);
    groupMap.set('bounds', group.bounds);
    groupMap.set('locked', group.locked);
    groupMap.set('createdAt', new Date().toISOString());
    groupMap.set('updatedAt', new Date().toISOString());

    this.groupsMap.set(group.id, groupMap);
    this.updateLastModified();
  }

  updateGroup(id: string, updates: Partial<Group>) {
    const groupMap = this.groupsMap.get(id);
    if (groupMap) {
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          groupMap.set(key, value);
        }
      });
      groupMap.set('updatedAt', new Date().toISOString());
      this.updateLastModified();
    }
  }

  deleteGroup(id: string) {
    this.groupsMap.delete(id);
    this.updateLastModified();
  }

  getGroup(id: string): Group | null {
    const groupMap = this.groupsMap.get(id);
    if (!groupMap) return null;

    return {
      id,
      shapeIds: groupMap.get('shapeIds'),
      bounds: groupMap.get('bounds'),
      locked: groupMap.get('locked'),
    };
  }

  getAllGroups(): Group[] {
    const groups: Group[] = [];
    this.groupsMap.forEach((groupMap, id) => {
      const group = this.getGroup(id);
      if (group) {
        groups.push(group);
      }
    });
    return groups;
  }

  // Observer methods
  onShapesChange(callback: (shapes: Shape[]) => void) {
    const observer = () => {
      callback(this.getAllShapes());
    };

    this.shapesMap.observe(observer);

    // Return cleanup function
    const cleanup = () => {
      this.shapesMap.unobserve(observer);
    };
    
    this.cleanupFunctions.push(cleanup);
    return cleanup;
  }

  onGroupsChange(callback: (groups: Group[]) => void) {
    const observer = () => {
      callback(this.getAllGroups());
    };

    this.groupsMap.observe(observer);

    // Return cleanup function
    const cleanup = () => {
      this.groupsMap.unobserve(observer);
    };
    
    this.cleanupFunctions.push(cleanup);
    return cleanup;
  }

  onMetaChange(callback: (meta: Record<string, any>) => void) {
    const observer = () => {
      const meta: Record<string, any> = {};
      this.metaMap.forEach((value, key) => {
        meta[key] = value;
      });
      callback(meta);
    };

    this.metaMap.observe(observer);

    // Return cleanup function
    const cleanup = () => {
      this.metaMap.unobserve(observer);
    };
    
    this.cleanupFunctions.push(cleanup);
    return cleanup;
  }

  // Utility methods
  private updateLastModified() {
    this.metaMap.set('lastModified', new Date().toISOString());
  }

  getDocumentStats() {
    return {
      shapeCount: this.shapesMap.size,
      groupCount: this.groupsMap.size,
      version: this.metaMap.get('version'),
      createdAt: this.metaMap.get('createdAt'),
      lastModified: this.metaMap.get('lastModified'),
    };
  }

  // Batch operations for performance
  batchUpdate(operations: Array<() => void>) {
    this.doc.transact(() => {
      operations.forEach(op => op());
    });
  }

  destroy() {
    // Clean up all observers
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
    
    this.disconnect();
    this.doc.destroy();
  }
}

// Singleton instance for the application
let yjsDocumentInstance: YjsDocument | null = null;

export const getYjsDocument = (): YjsDocument => {
  if (!yjsDocumentInstance) {
    yjsDocumentInstance = new YjsDocument();
  }
  return yjsDocumentInstance;
};

export const destroyYjsDocument = () => {
  if (yjsDocumentInstance) {
    yjsDocumentInstance.destroy();
    yjsDocumentInstance = null;
  }
};
