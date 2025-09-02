import { useEffect, useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { YjsDocument, getYjsDocument, YjsProviderConfig, ConnectionState } from '@/lib/yjs';
import { Shape, Group, UserPresence } from '@/types';
import { RootState } from '@/store';
import { setConnectionStatus, addUser, removeUser, updateUserPresence } from '@/store/slices/collaborationSlice';
import { useOfflineSync } from './useOfflineSync';

interface UseYjsSyncOptions {
  sessionId: string;
  wsUrl?: string;
  userId?: string;
  userName?: string;
  onShapesChange?: (shapes: Shape[]) => void;
  onGroupsChange?: (groups: Group[]) => void;
  onPresenceChange?: (users: UserPresence[]) => void;
  onConnectionError?: (error: Error) => void;
  onReconnect?: () => void;
}

interface YjsSyncReturn {
  yjsDoc: YjsDocument;
  isConnected: boolean;
  connectionStatus: string;
  connectionError: Error | null;
  retryCount: number;
  connectedUsers: UserPresence[];
  canUndo: boolean;
  canRedo: boolean;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  addGroup: (group: Group) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  getAllShapes: () => Shape[];
  getAllGroups: () => Group[];
  broadcastCursor: (position: { x: number; y: number }) => void;
  broadcastSelection: (selection: string[]) => void;
  setUserActive: (isActive: boolean) => void;
  undo: () => boolean;
  redo: () => boolean;
  reconnect: () => void;
  // Offline support
  isOffline: boolean;
  pendingChanges: number;
  syncPendingChanges: () => Promise<boolean>;
  clearPendingChanges: () => void;
}

export const useYjsSync = (options: UseYjsSyncOptions): YjsSyncReturn => {
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

  // Initialize offline sync after yjsDoc is available
  const offlineSync = useOfflineSync({
    yjsDoc: yjsDocRef.current!,
    userId: options.userId || 'anonymous',
    onOfflineStateChange: (state) => {
      console.log('Offline state changed:', state);
    },
    onReconnectionAttempt: (attempt, delay) => {
      console.log(`Reconnection attempt ${attempt} in ${delay}ms`);
    },
    onSyncComplete: (syncedChanges) => {
      console.log(`Synced ${syncedChanges} offline changes`);
    },
    onSyncError: (error) => {
      console.error('Sync error:', error);
    },
  });

  // Stable callback references to prevent infinite loops
  const callbacksRef = useRef({
    onShapesChange: options.onShapesChange,
    onGroupsChange: options.onGroupsChange,
    onPresenceChange: options.onPresenceChange,
    onConnectionError: options.onConnectionError,
    onReconnect: options.onReconnect,
  });

  // Update callback refs when options change
  useEffect(() => {
    callbacksRef.current = {
      onShapesChange: options.onShapesChange,
      onGroupsChange: options.onGroupsChange,
      onPresenceChange: options.onPresenceChange,
      onConnectionError: options.onConnectionError,
      onReconnect: options.onReconnect,
    };
  }, [options.onShapesChange, options.onGroupsChange, options.onPresenceChange, options.onConnectionError, options.onReconnect]);

  // Initialize Yjs document
  useEffect(() => {
    let isMounted = true;
    
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

    // Set up connection state monitoring
    const connectionStateCleanup = yjsDoc.onConnectionStateChange((state) => {
      if (!isMounted) return; // Prevent state updates after unmount
      
      setConnectionState(state);
      
      // Update Redux store
      switch (state.status) {
        case 'connected':
          dispatch(setConnectionStatus('connected'));
          if (callbacksRef.current.onReconnect && state.retryCount > 0) {
            callbacksRef.current.onReconnect();
          }
          break;
        case 'connecting':
          dispatch(setConnectionStatus('connecting'));
          break;
        case 'disconnected':
        case 'error':
          dispatch(setConnectionStatus('disconnected'));
          if (state.error && callbacksRef.current.onConnectionError) {
            callbacksRef.current.onConnectionError(state.error);
          }
          break;
      }
    });

    // Connect to WebSocket
    yjsDoc.connect(config);

    // Set up shapes observer
    const shapesCleanup = yjsDoc.onShapesChange((shapes) => {
      if (callbacksRef.current.onShapesChange) {
        callbacksRef.current.onShapesChange(shapes);
      }
    });

    // Set up groups observer
    const groupsCleanup = yjsDoc.onGroupsChange((groups) => {
      if (callbacksRef.current.onGroupsChange) {
        callbacksRef.current.onGroupsChange(groups);
      }
    });

    // Set up presence observer
    const presenceCleanup = yjsDoc.onPresenceChange((users) => {
      setConnectedUsers(users);
      if (callbacksRef.current.onPresenceChange) {
        callbacksRef.current.onPresenceChange(users);
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
    cleanupFunctionsRef.current = [connectionStateCleanup, shapesCleanup, groupsCleanup, presenceCleanup, undoRedoCleanup];

    return () => {
      isMounted = false; // Mark as unmounted
      
      // Stop all connections and cleanup
      if (yjsDocRef.current) {
        yjsDocRef.current.stopAllConnections();
      }
      
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, [options.sessionId, options.wsUrl, options.userId, options.userName, dispatch]);

  // Shape management functions (with undo support and offline queueing)
  const addShape = useCallback((shape: Shape) => {
    if (yjsDocRef.current) {
      if (offlineSync.isOffline) {
        offlineSync.queueShapeChange('add', shape);
      } else {
        yjsDocRef.current.addShapeWithUndo(shape);
      }
    }
  }, [offlineSync]);

  const updateShape = useCallback((id: string, updates: Partial<Shape>) => {
    if (yjsDocRef.current) {
      if (offlineSync.isOffline) {
        offlineSync.queueShapeChange('update', { id, ...updates }, id);
      } else {
        yjsDocRef.current.updateShapeWithUndo(id, updates);
      }
    }
  }, [offlineSync]);

  const deleteShape = useCallback((id: string) => {
    if (yjsDocRef.current) {
      if (offlineSync.isOffline) {
        offlineSync.queueShapeChange('delete', {}, id);
      } else {
        yjsDocRef.current.deleteShapeWithUndo(id);
      }
    }
  }, [offlineSync]);

  // Group management functions (with undo support and offline queueing)
  const addGroup = useCallback((group: Group) => {
    if (yjsDocRef.current) {
      if (offlineSync.isOffline) {
        offlineSync.queueGroupChange('add', group);
      } else {
        yjsDocRef.current.addGroupWithUndo(group);
      }
    }
  }, [offlineSync]);

  const updateGroup = useCallback((id: string, updates: Partial<Group>) => {
    if (yjsDocRef.current) {
      if (offlineSync.isOffline) {
        offlineSync.queueGroupChange('update', { id, ...updates }, id);
      } else {
        yjsDocRef.current.updateGroupWithUndo(id, updates);
      }
    }
  }, [offlineSync]);

  const deleteGroup = useCallback((id: string) => {
    if (yjsDocRef.current) {
      if (offlineSync.isOffline) {
        offlineSync.queueGroupChange('delete', {}, id);
      } else {
        yjsDocRef.current.deleteGroupWithUndo(id);
      }
    }
  }, [offlineSync]);

  // Getter functions
  const getAllShapes = useCallback(() => {
    return yjsDocRef.current?.getAllShapes() || [];
  }, []);

  const getAllGroups = useCallback(() => {
    return yjsDocRef.current?.getAllGroups() || [];
  }, []);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (yjsDocRef.current && configRef.current) {
      console.log('Manual reconnect triggered');
      yjsDocRef.current.connect(configRef.current);
    }
  }, []);

  // Presence functions
  const broadcastCursor = useCallback((position: { x: number; y: number }) => {
    if (yjsDocRef.current) {
      yjsDocRef.current.broadcastCursor(position);
    }
  }, []);

  const broadcastSelection = useCallback((selection: string[]) => {
    if (yjsDocRef.current) {
      yjsDocRef.current.broadcastSelection(selection);
    }
  }, []);

  const setUserActive = useCallback((isActive: boolean) => {
    if (yjsDocRef.current) {
      yjsDocRef.current.setUserActive(isActive);
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

  return {
    yjsDoc: yjsDocRef.current!,
    isConnected: connectionStatus === 'connected' && !offlineSync.isOffline,
    connectionStatus: offlineSync.isOffline ? 'offline' : connectionState.status,
    connectionError: connectionState.error || null,
    retryCount: Math.max(connectionState.retryCount, offlineSync.retryCount),
    connectedUsers,
    canUndo,
    canRedo,
    addShape,
    updateShape,
    deleteShape,
    addGroup,
    updateGroup,
    deleteGroup,
    getAllShapes,
    getAllGroups,
    broadcastCursor,
    broadcastSelection,
    setUserActive,
    undo,
    redo,
    reconnect,
    // Offline support
    isOffline: offlineSync.isOffline,
    pendingChanges: offlineSync.queueSize,
    syncPendingChanges: offlineSync.syncPendingChanges,
    clearPendingChanges: offlineSync.clearPendingChanges,
  };
};

// Hook for managing user presence
export const useUserPresence = (sessionId: string, userId: string, userName: string) => {
  const dispatch = useDispatch();
  const users = useSelector((state: RootState) => state.collaboration.users);
  const currentUserId = useSelector((state: RootState) => state.collaboration.currentUserId);

  const updateCursor = useCallback((position: { x: number; y: number }) => {
    dispatch(updateUserPresence({
      userId,
      presence: { cursor: position }
    }));
  }, [dispatch, userId]);

  const updateSelection = useCallback((selection: string[]) => {
    dispatch(updateUserPresence({
      userId,
      presence: { selection }
    }));
  }, [dispatch, userId]);

  const setActive = useCallback((isActive: boolean) => {
    dispatch(updateUserPresence({
      userId,
      presence: { isActive }
    }));
  }, [dispatch, userId]);

  // Initialize current user
  useEffect(() => {
    const currentUser: UserPresence = {
      userId,
      name: userName,
      cursor: { x: 0, y: 0 },
      selection: [],
      isActive: true,
    };

    dispatch(addUser(currentUser));

    return () => {
      dispatch(removeUser(userId));
    };
  }, [dispatch, userId, userName]);

  return {
    users,
    currentUserId,
    updateCursor,
    updateSelection,
    setActive,
  };
};