import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';
import { UndoManager } from 'yjs';
import { Shape, Group, UserPresence } from '@/types';

export interface YjsProviderConfig {
  wsUrl: string;
  roomName: string;
  maxBackoffTime?: number;
  disableBc?: boolean;
  awareness?: boolean;
}

export interface ConnectionState {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  error?: Error;
  retryCount: number;
  lastConnected?: Date;
}

export class YjsDocument {
  public doc: Y.Doc;
  public shapesMap: Y.Map<Y.Map<unknown>>;
  public groupsMap: Y.Map<Y.Map<unknown>>;
  public metaMap: Y.Map<unknown>;
  public awareness: Awareness;
  public undoManager: UndoManager;
  private provider: WebsocketProvider | null = null;
  private cleanupFunctions: (() => void)[] = [];
  private connectionState: ConnectionState = {
    status: 'disconnected',
    retryCount: 0,
  };
  private connectionListeners: ((state: ConnectionState) => void)[] = [];
  private presenceListeners: ((users: UserPresence[]) => void)[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private currentConfig: YjsProviderConfig | null = null;
  private autoReconnect: boolean = true;

  constructor() {
    this.doc = new Y.Doc();
    this.shapesMap = this.doc.getMap('shapes');
    this.groupsMap = this.doc.getMap('groups');
    this.metaMap = this.doc.getMap('meta');
    this.awareness = new Awareness(this.doc);

    // Initialize undo manager for collaborative undo/redo
    this.undoManager = new UndoManager([this.shapesMap, this.groupsMap], {
      trackedOrigins: new Set([this.doc.clientID]),
    });

    // Initialize metadata with default values
    this.initializeMetadata();

    // Set up awareness listeners
    this.setupAwarenessListeners();
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

  private setupAwarenessListeners() {
    const handleAwarenessChange = () => {
      const users = this.getConnectedUsers();
      this.presenceListeners.forEach(listener => listener(users));
    };

    this.awareness.on('change', handleAwarenessChange);

    // Store cleanup function
    const cleanup = () => {
      this.awareness.off('change', handleAwarenessChange);
    };

    this.cleanupFunctions.push(cleanup);
  }

  connect(config: YjsProviderConfig) {
    if (!config) {
      console.error('Cannot connect: config is null or undefined');
      return;
    }

    // Store the config for reconnection attempts
    this.currentConfig = config;

    if (this.provider) {
      this.provider.destroy();
    }

    this.updateConnectionState({ status: 'connecting' });

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

      switch (event.status) {
        case 'connected':
          this.updateConnectionState({
            status: 'connected',
            retryCount: 0,
            lastConnected: new Date(),
            error: undefined
          });
          break;
        case 'connecting':
          this.updateConnectionState({ status: 'connecting' });
          break;
        case 'disconnected':
          this.updateConnectionState({ status: 'disconnected' });
          if (this.currentConfig) {
            this.scheduleReconnect(this.currentConfig);
          }
          break;
      }
    });

    this.provider.on('connection-error', (error: Error) => {
      console.error('Yjs connection error:', error);
      this.updateConnectionState({
        status: 'error',
        error,
        retryCount: this.connectionState.retryCount + 1
      });
      if (this.currentConfig) {
        this.scheduleReconnect(this.currentConfig);
      }
    });

    this.provider.on('connection-close', (event) => {
      console.log('Yjs connection closed:', event?.code, event?.reason);
      this.updateConnectionState({ status: 'disconnected' });
      if (this.currentConfig) {
        this.scheduleReconnect(this.currentConfig);
      }
    });

    return this.provider;
  }

  private updateConnectionState(updates: Partial<ConnectionState>) {
    this.connectionState = { ...this.connectionState, ...updates };
    this.connectionListeners.forEach(listener => listener(this.connectionState));
  }

  private scheduleReconnect(config: YjsProviderConfig | null) {
    const configToUse = config || this.currentConfig;

    if (!configToUse) {
      console.warn('Cannot schedule reconnect: no config available');
      return;
    }

    // Don't reconnect if we're already connected, if auto-reconnect is disabled, or if the connection was manually closed
    if (this.connectionState.status === 'connected' || !this.autoReconnect) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, this.connectionState.retryCount), 30000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    console.log(`Scheduling reconnect in ${Math.round(delay)}ms (attempt ${this.connectionState.retryCount + 1})`);

    this.reconnectTimer = setTimeout(() => {
      if (this.connectionState.status !== 'connected') {
        console.log('Attempting to reconnect...');
        this.connect(configToUse);
      }
    }, delay);
  }

  onConnectionStateChange(listener: (state: ConnectionState) => void) {
    this.connectionListeners.push(listener);

    // Return cleanup function
    const cleanup = () => {
      const index = this.connectionListeners.indexOf(listener);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };

    this.cleanupFunctions.push(cleanup);
    return cleanup;
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  // User presence methods
  setLocalUser(user: Omit<UserPresence, 'userId'> & { userId?: string }) {
    const userId = user.userId || this.awareness.clientID.toString();
    this.awareness.setLocalStateField('user', {
      ...user,
      userId,
      lastSeen: Date.now(),
    });
  }

  updateLocalPresence(updates: Partial<Omit<UserPresence, 'userId'>>) {
    const currentState = this.awareness.getLocalState();
    const currentUser = currentState?.user || {};

    this.awareness.setLocalStateField('user', {
      ...currentUser,
      ...updates,
      lastSeen: Date.now(),
    });
  }

  getConnectedUsers(): UserPresence[] {
    const users: UserPresence[] = [];

    this.awareness.getStates().forEach((state, clientId) => {
      if (state.user) {
        users.push({
          ...state.user,
          userId: state.user.userId || clientId.toString(),
        });
      }
    });

    return users;
  }

  onPresenceChange(callback: (users: UserPresence[]) => void) {
    this.presenceListeners.push(callback);

    // Return cleanup function
    const cleanup = () => {
      const index = this.presenceListeners.indexOf(callback);
      if (index > -1) {
        this.presenceListeners.splice(index, 1);
      }
    };

    this.cleanupFunctions.push(cleanup);
    return cleanup;
  }

  broadcastCursor(position: { x: number; y: number }) {
    this.updateLocalPresence({ cursor: position });
  }

  broadcastSelection(selection: string[]) {
    this.updateLocalPresence({ selection });
  }

  setUserActive(isActive: boolean) {
    this.updateLocalPresence({ isActive });
  }

  // Undo/Redo methods
  undo(): boolean {
    return this.undoManager.undo() !== null;
  }

  redo(): boolean {
    return this.undoManager.redo() !== null;
  }

  canUndo(): boolean {
    return this.undoManager.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.undoManager.redoStack.length > 0;
  }

  onUndoRedoStackChange(callback: (canUndo: boolean, canRedo: boolean) => void) {
    const handleStackChange = () => {
      callback(this.canUndo(), this.canRedo());
    };

    this.undoManager.on('stack-item-added', handleStackChange);
    this.undoManager.on('stack-item-popped', handleStackChange);

    // Return cleanup function
    const cleanup = () => {
      this.undoManager.off('stack-item-added', handleStackChange);
      this.undoManager.off('stack-item-popped', handleStackChange);
    };

    this.cleanupFunctions.push(cleanup);
    return cleanup;
  }

  // Enhanced shape operations that work with undo manager
  addShapeWithUndo(shape: Shape) {
    this.doc.transact(() => {
      this.addShape(shape);
    }, this.doc.clientID);
  }

  updateShapeWithUndo(id: string, updates: Partial<Shape>) {
    this.doc.transact(() => {
      this.updateShape(id, updates);
    }, this.doc.clientID);
  }

  deleteShapeWithUndo(id: string) {
    this.doc.transact(() => {
      this.deleteShape(id);
    }, this.doc.clientID);
  }

  addGroupWithUndo(group: Group) {
    this.doc.transact(() => {
      this.addGroup(group);
    }, this.doc.clientID);
  }

  updateGroupWithUndo(id: string, updates: Partial<Group>) {
    this.doc.transact(() => {
      this.updateGroup(id, updates);
    }, this.doc.clientID);
  }

  deleteGroupWithUndo(id: string) {
    this.doc.transact(() => {
      this.deleteGroup(id);
    }, this.doc.clientID);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }

    // Clear the stored config to prevent reconnection attempts
    this.currentConfig = null;

    this.updateConnectionState({ status: 'disconnected' });
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

  disconnect() {
    this.autoReconnect = false; // Disable auto-reconnect when manually disconnecting

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }

    this.updateConnectionState({ status: 'disconnected' });
  }

  setAutoReconnect(enabled: boolean) {
    this.autoReconnect = enabled;
    if (!enabled && this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  destroy() {
    // Clean up all observers
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];

    // Clear listeners
    this.connectionListeners = [];
    this.presenceListeners = [];

    // Destroy undo manager
    this.undoManager.destroy();

    // Destroy awareness
    this.awareness.destroy();

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
