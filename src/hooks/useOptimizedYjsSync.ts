import { useEffect, useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { YjsDocument, getYjsDocument, YjsProviderConfig, ConnectionState } from '@/lib/yjs';
import { Shape, Group, UserPresence } from '@/types';
import { RootState } from '@/store';
import { setConnectionStatus, addUser, removeUser, updateUserPresence } from '@/store/slices/collaborationSlice';
import { networkOptimizer } from '@/lib/utils/networkOptimizer';
import { memoryManager } from '@/lib/utils/memoryManager';

interface UseOptimizedYjsSyncOptions {
  sessionId: string;
  wsUrl?: string;
  userId?: string;
  userName?: string;
  onShapesChange?: (shapes: Shape[]) => void;
  onGroupsChange?: (groups: Group[]) => void;
  onPresenceChange?: (users: UserPresence[]) => void;
  onConnectionError?: (error: Error) => void;
  onReconnect?: () => void;
  enableBatching?: boolean;
  enableMemoryOptimization?: boolean;
  batchDelay?: number;
}

interface OptimizedYjsSyncReturn {
  yjsDoc: YjsDocument;
  isConnected: boolean;
  connectionStatus: string;
  connectionError: Error | null;
  retryCount: number;
  connectedUsers: UserPresence[];
  canUndo: boolean;
  canRedo: boolean;
  networkMetrics: ReturnType<typeof networkOptimizer.getMetrics>;
  memoryMetrics: ReturnType<typeof memoryManager.getMemoryMetrics>;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  addGroup: (group: Group) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  batchShapeUpdates: (updates: Array<{ id: string; updates: Partial<Shape> }>) => void;
  getAllShapes: () => Shape[];
  getAllGroups: () => Group[];
  broadcastCursor: (position: { x: number; y: number }) => void;
  broadcastSelection: (selection: string[]) => void;
  setUserActive: (isActive: boolean) => void;
  undo: () => boolean;
  redo: () => boolean;
  reconnect: () => void;
  flushUpdates: () => Promise<void>;
  clearCache: () => void;
}

export const useOptimizedYjsSync = (options: UseOptimizedYjsSyncOptions): OptimizedYjsSyncReturn => {
  const dispatch = useDispatch();
  const connectionStatus = useSelector((state: RootState) => state.collaboration.connectionStatus);
  const yjsDocRef = useRef<YjsDocument | null>(null);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  const configRef = useRef<YjsProviderConfig | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0,
  });
  const [connectedUsers, setConnectedUsers] = useState<UserPresence[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [networkMetrics, setNetworkMetrics] = useState(networkOptimizer.getMetrics());
  const [memoryMetrics, setMemoryMetrics] = useState(memoryManager.getMemoryMetrics());

  // Optimization settings
  const enableBatching = options.enableBatching ?? true;
  const enableMemoryOptimization = options.enableMemoryOptimization ?? true;
  const batchDelay = options.batchDelay ?? 50;

  // Throttled and debounced update functions
  const throttledCursorUpdate = useRef(
    networkOptimizer.createThrottledVisualUpdate(() => {})
  );
  const debouncedMetadataUpdate = useRef(
    networkOptimizer.createDebouncedMetadataUpdate(() => {})
  );

  // Initialize Yjs document with optimizations
  useEffect(() => {
    if (!yjsDocRef.current) {
      yjsDocRef.current = getYjsDocument();
    }

    const yjsDoc = yjsDocRef.current;
    const wsUrl = options.wsUrl || 'ws://localhost:3001';
    
    const config: YjsProviderConfig = {
      wsUrl,
      roomName: options.sessionId,
    };
    
    configRef.current = config;

    // Set up memory monitoring if enabled
    if (enableMemoryOptimization) {
      const memoryCleanup = memoryManager.registerCleanupCallback(() => {
        // Clean up cached shapes and groups
        console.log('Cleaning up Yjs document cache...');
        // Force garbage collection of unused Yjs objects
        if (yjsDoc.doc.store) {
          // Clear any cached computations
          yjsDoc.doc.store.pendingStructs = null;
        }
      });

      const memoryObserver = memoryManager.registerMemoryObserver((metrics) => {
        setMemoryMetrics(metrics);
      });

      cleanupFunctionsRef.current.push(memoryCleanup, memoryObserver);
    }

    // Set up connection state monitoring with network metrics
    const connectionStateCleanup = yjsDoc.onConnectionStateChange((state) => {
      setConnectionState(state);
      
      // Update network metrics
      setNetworkMetrics(networkOptimizer.getMetrics());
      
      // Update Redux store
      switch (state.status) {
        case 'connected':
          dispatch(setConnectionStatus('connected'));
          if (options.onReconnect && state.retryCount > 0) {
            options.onReconnect();
          }
          break;
        case 'connecting':
          dispatch(setConnectionStatus('connecting'));
          break;
        case 'disconnected':
        case 'error':
          dispatch(setConnectionStatus('disconnected'));
          if (state.error && options.onConnectionError) {
            options.onConnectionError(state.error);
          }
          break;
      }
    });

    // Connect to WebSocket
    yjsDoc.connect(config);

    // Set up optimized shapes observer
    const shapesCleanup = yjsDoc.onShapesChange((shapes) => {
      networkOptimizer.recordIncomingMessage(JSON.stringify(shapes).length);
      
      if (options.onShapesChange) {
        if (enableBatching) {
          // Batch shape updates to prevent excessive re-renders
          networkOptimizer.batchUpdate(() => {
            options.onShapesChange!(shapes);
          }, 'medium');
        } else {
          options.onShapesChange(shapes);
        }
      }
    });

    // Set up optimized groups observer
    const groupsCleanup = yjsDoc.onGroupsChange((groups) => {
      networkOptimizer.recordIncomingMessage(JSON.stringify(groups).length);
      
      if (options.onGroupsChange) {
        if (enableBatching) {
          networkOptimizer.batchUpdate(() => {
            options.onGroupsChange!(groups);
          }, 'medium');
        } else {
          options.onGroupsChange(groups);
        }
      }
    });

    // Set up presence observer with throttling
    const presenceCleanup = yjsDoc.onPresenceChange((users) => {
      setConnectedUsers(users);
      
      if (options.onPresenceChange) {
        // Presence updates are less critical, so we can debounce them
        debouncedMetadataUpdate.current = networkOptimizer.createDebouncedMetadataUpdate(() => {
          options.onPresenceChange!(users);
        });
        debouncedMetadataUpdate.current();
      }
    });

    // Set up undo/redo stack observer
    const undoRedoCleanup = yjsDoc.onUndoRedoStackChange((canUndoValue, canRedoValue) => {
      setCanUndo(canUndoValue);
      setCanRedo(canRedoValue);
    });

    // Initialize local user
    if (options.userId || options.userName) {
      yjsDoc.setLocalUser({
        userId: options.userId,
        name: options.userName || 'Anonymous',
        cursor: { x: 0, y: 0 },
        selection: [],
        isActive: true,
      });
    }

    // Store cleanup functions
    cleanupFunctionsRef.current.push(
      connectionStateCleanup, 
      shapesCleanup, 
      groupsCleanup, 
      presenceCleanup, 
      undoRedoCleanup
    );

    return () => {
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, [
    options.sessionId, 
    options.wsUrl, 
    options.userId, 
    options.userName, 
    dispatch, 
    options.onShapesChange, 
    options.onGroupsChange, 
    options.onPresenceChange, 
    options.onConnectionError, 
    options.onReconnect,
    enableBatching,
    enableMemoryOptimization
  ]);

  // Optimized shape management functions
  const addShape = useCallback((shape: Shape) => {
    if (yjsDocRef.current) {
      if (enableBatching) {
        networkOptimizer.batchUpdate(() => {
          yjsDocRef.current!.addShapeWithUndo(shape);
        }, 'high'); // Shape creation is high priority
      } else {
        yjsDocRef.current.addShapeWithUndo(shape);
      }
    }
  }, [enableBatching]);

  const updateShape = useCallback((id: string, updates: Partial<Shape>) => {
    if (yjsDocRef.current) {
      if (enableBatching) {
        // Visual updates (position, size) are medium priority
        const priority = (updates.position || updates.dimensions) ? 'medium' : 'low';
        networkOptimizer.batchUpdate(() => {
          yjsDocRef.current!.updateShapeWithUndo(id, updates);
        }, priority);
      } else {
        yjsDocRef.current.updateShapeWithUndo(id, updates);
      }
    }
  }, [enableBatching]);

  const deleteShape = useCallback((id: string) => {
    if (yjsDocRef.current) {
      if (enableBatching) {
        networkOptimizer.batchUpdate(() => {
          yjsDocRef.current!.deleteShapeWithUndo(id);
        }, 'high'); // Deletion is high priority
      } else {
        yjsDocRef.current.deleteShapeWithUndo(id);
      }
    }
  }, [enableBatching]);

  // Batch multiple shape updates for efficiency
  const batchShapeUpdates = useCallback((updates: Array<{ id: string; updates: Partial<Shape> }>) => {
    if (yjsDocRef.current && updates.length > 0) {
      const operations = updates.map(({ id, updates: shapeUpdates }) => () => {
        yjsDocRef.current!.updateShapeWithUndo(id, shapeUpdates);
      });

      networkOptimizer.batchMultipleUpdates(operations, 'medium');
    }
  }, []);

  // Group management functions with batching
  const addGroup = useCallback((group: Group) => {
    if (yjsDocRef.current) {
      if (enableBatching) {
        networkOptimizer.batchUpdate(() => {
          yjsDocRef.current!.addGroupWithUndo(group);
        }, 'high');
      } else {
        yjsDocRef.current.addGroupWithUndo(group);
      }
    }
  }, [enableBatching]);

  const updateGroup = useCallback((id: string, updates: Partial<Group>) => {
    if (yjsDocRef.current) {
      if (enableBatching) {
        networkOptimizer.batchUpdate(() => {
          yjsDocRef.current!.updateGroupWithUndo(id, updates);
        }, 'medium');
      } else {
        yjsDocRef.current.updateGroupWithUndo(id, updates);
      }
    }
  }, [enableBatching]);

  const deleteGroup = useCallback((id: string) => {
    if (yjsDocRef.current) {
      if (enableBatching) {
        networkOptimizer.batchUpdate(() => {
          yjsDocRef.current!.deleteGroupWithUndo(id);
        }, 'high');
      } else {
        yjsDocRef.current.deleteGroupWithUndo(id);
      }
    }
  }, [enableBatching]);

  // Cached getter functions with memory optimization
  const getAllShapes = useCallback(() => {
    if (!yjsDocRef.current) return [];
    
    if (enableMemoryOptimization) {
      const cacheKey = `shapes_${options.sessionId}`;
      const cached = memoryManager.getCache<Shape[]>(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      const shapes = yjsDocRef.current.getAllShapes();
      memoryManager.setCache(cacheKey, shapes, 1000); // Cache for 1 second
      return shapes;
    }
    
    return yjsDocRef.current.getAllShapes();
  }, [enableMemoryOptimization, options.sessionId]);

  const getAllGroups = useCallback(() => {
    if (!yjsDocRef.current) return [];
    
    if (enableMemoryOptimization) {
      const cacheKey = `groups_${options.sessionId}`;
      const cached = memoryManager.getCache<Group[]>(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      const groups = yjsDocRef.current.getAllGroups();
      memoryManager.setCache(cacheKey, groups, 1000); // Cache for 1 second
      return groups;
    }
    
    return yjsDocRef.current.getAllGroups();
  }, [enableMemoryOptimization, options.sessionId]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (yjsDocRef.current && configRef.current) {
      console.log('Manual reconnect triggered');
      yjsDocRef.current.connect(configRef.current);
    }
  }, []);

  // Optimized presence functions
  const broadcastCursor = useCallback((position: { x: number; y: number }) => {
    if (yjsDocRef.current) {
      // Throttle cursor updates to reduce network traffic
      throttledCursorUpdate.current = networkOptimizer.createThrottledVisualUpdate(() => {
        yjsDocRef.current!.broadcastCursor(position);
      });
      throttledCursorUpdate.current();
    }
  }, []);

  const broadcastSelection = useCallback((selection: string[]) => {
    if (yjsDocRef.current) {
      // Selection updates are less frequent, so we can batch them
      networkOptimizer.batchUpdate(() => {
        yjsDocRef.current!.broadcastSelection(selection);
      }, 'low');
    }
  }, []);

  const setUserActive = useCallback((isActive: boolean) => {
    if (yjsDocRef.current) {
      // Activity status is low priority
      networkOptimizer.batchUpdate(() => {
        yjsDocRef.current!.setUserActive(isActive);
      }, 'low');
    }
  }, []);

  // Undo/Redo functions
  const undo = useCallback(() => {
    if (yjsDocRef.current) {
      return yjsDocRef.current.undo();
    }
    return false;
  }, []);

  const redo = useCallback(() => {
    if (yjsDocRef.current) {
      return yjsDocRef.current.redo();
    }
    return false;
  }, []);

  // Utility functions
  const flushUpdates = useCallback(async () => {
    await networkOptimizer.flush();
  }, []);

  const clearCache = useCallback(() => {
    memoryManager.clearCache();
  }, []);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setNetworkMetrics(networkOptimizer.getMetrics());
      if (enableMemoryOptimization) {
        setMemoryMetrics(memoryManager.getMemoryMetrics());
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [enableMemoryOptimization]);

  return {
    yjsDoc: yjsDocRef.current!,
    isConnected: connectionStatus === 'connected',
    connectionStatus: connectionState.status,
    connectionError: connectionState.error || null,
    retryCount: connectionState.retryCount,
    connectedUsers,
    canUndo,
    canRedo,
    networkMetrics,
    memoryMetrics,
    addShape,
    updateShape,
    deleteShape,
    addGroup,
    updateGroup,
    deleteGroup,
    batchShapeUpdates,
    getAllShapes,
    getAllGroups,
    broadcastCursor,
    broadcastSelection,
    setUserActive,
    undo,
    redo,
    reconnect,
    flushUpdates,
    clearCache,
  };
};