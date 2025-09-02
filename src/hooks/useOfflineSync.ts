import { useEffect, useCallback, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { 
  OfflineManager, 
  ReconnectionManager, 
  OfflineState, 
  OfflineChange,
  getOfflineManager,
  getReconnectionManager 
} from '@/lib/offline';
import { YjsDocument } from '@/lib/yjs';
import { Shape, Group } from '@/types';
import { setConnectionStatus } from '@/store/slices/collaborationSlice';

interface UseOfflineSyncOptions {
  yjsDoc: YjsDocument;
  userId: string;
  onOfflineStateChange?: (state: OfflineState) => void;
  onReconnectionAttempt?: (attempt: number, delay: number) => void;
  onSyncComplete?: (syncedChanges: number) => void;
  onSyncError?: (error: Error) => void;
}

interface OfflineSyncReturn {
  isOffline: boolean;
  pendingChanges: OfflineChange[];
  queueSize: number;
  retryCount: number;
  isReconnecting: boolean;
  lastSyncTimestamp: number;
  queueShapeChange: (operation: 'add' | 'update' | 'delete', shape: Shape | Partial<Shape>, shapeId?: string) => void;
  queueGroupChange: (operation: 'add' | 'update' | 'delete', group: Group | Partial<Group>, groupId?: string) => void;
  syncPendingChanges: () => Promise<boolean>;
  clearPendingChanges: () => void;
  forceOfflineMode: (offline: boolean) => void;
}

export const useOfflineSync = (options: UseOfflineSyncOptions): OfflineSyncReturn => {
  const dispatch = useDispatch();
  const offlineManagerRef = useRef<OfflineManager | null>(null);
  const reconnectionManagerRef = useRef<ReconnectionManager | null>(null);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  const isSyncingRef = useRef(false);
  
  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOffline: false,
    pendingChanges: [],
    lastSyncTimestamp: Date.now(),
    queueSize: 0,
  });
  
  const [retryCount, setRetryCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Initialize managers
  useEffect(() => {
    if (!offlineManagerRef.current) {
      offlineManagerRef.current = getOfflineManager();
    }
    
    if (!reconnectionManagerRef.current) {
      reconnectionManagerRef.current = getReconnectionManager({
        maxRetries: 10,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
      });
    }

    const offlineManager = offlineManagerRef.current;
    const reconnectionManager = reconnectionManagerRef.current;

    // Set up offline state monitoring
    const offlineStateCleanup = offlineManager.onStateChange((state) => {
      setOfflineState(state);
      
      // Update Redux store
      if (state.isOffline) {
        dispatch(setConnectionStatus('disconnected'));
      }
      
      // Call user callback
      if (options.onOfflineStateChange) {
        options.onOfflineStateChange(state);
      }
    });

    // Set up reconnection monitoring
    const reconnectionCleanup = reconnectionManager.onReconnectionAttempt((attempt, delay) => {
      setRetryCount(attempt);
      setIsReconnecting(true);
      
      if (options.onReconnectionAttempt) {
        options.onReconnectionAttempt(attempt, delay);
      }
    });

    // Monitor Yjs connection state for automatic reconnection
    const connectionCleanup = options.yjsDoc.onConnectionStateChange((connectionState) => {
      if (connectionState.status === 'disconnected' && !offlineState.isOffline) {
        // Network disconnection detected, attempt reconnection
        handleReconnection();
      } else if (connectionState.status === 'connected') {
        // Connection restored, sync pending changes
        reconnectionManager.reset();
        setRetryCount(0);
        setIsReconnecting(false);
        
        if (offlineState.pendingChanges.length > 0) {
          syncPendingChanges();
        }
      }
    });

    cleanupFunctionsRef.current = [offlineStateCleanup, reconnectionCleanup, connectionCleanup];

    // Get initial state
    setOfflineState(offlineManager.getOfflineState());

    return () => {
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, [options.yjsDoc, options.onOfflineStateChange, options.onReconnectionAttempt, dispatch]);

  // Handle reconnection attempts
  const handleReconnection = useCallback(async () => {
    if (!reconnectionManagerRef.current || !options.yjsDoc) {
      return false;
    }

    const reconnectionManager = reconnectionManagerRef.current;
    
    const reconnectFn = async (): Promise<boolean> => {
      try {
        // Check if we're actually online
        if (!navigator.onLine) {
          return false;
        }

        // Get current connection state
        const connectionState = options.yjsDoc.getConnectionState();
        
        if (connectionState.status === 'connected') {
          return true;
        }

        // Attempt to reconnect
        const currentConfig = (options.yjsDoc as any).currentConfig;
        if (currentConfig) {
          options.yjsDoc.connect(currentConfig);
          
          // Wait a bit to see if connection succeeds
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const newState = options.yjsDoc.getConnectionState();
          return newState.status === 'connected';
        }
        
        return false;
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        return false;
      }
    };

    return await reconnectionManager.attemptReconnection(reconnectFn);
  }, [options.yjsDoc]);

  // Queue shape changes for offline sync
  const queueShapeChange = useCallback((
    operation: 'add' | 'update' | 'delete',
    shape: Shape | Partial<Shape>,
    shapeId?: string
  ) => {
    if (!offlineManagerRef.current) return;

    const change: Omit<OfflineChange, 'id' | 'timestamp'> = {
      type: 'shape',
      operation,
      data: operation === 'delete' ? { id: shapeId } : shape,
      userId: options.userId,
    };

    offlineManagerRef.current.queueChange(change);
  }, [options.userId]);

  // Queue group changes for offline sync
  const queueGroupChange = useCallback((
    operation: 'add' | 'update' | 'delete',
    group: Group | Partial<Group>,
    groupId?: string
  ) => {
    if (!offlineManagerRef.current) return;

    const change: Omit<OfflineChange, 'id' | 'timestamp'> = {
      type: 'group',
      operation,
      data: operation === 'delete' ? { id: groupId } : group,
      userId: options.userId,
    };

    offlineManagerRef.current.queueChange(change);
  }, [options.userId]);

  // Sync pending changes when connection is restored
  const syncPendingChanges = useCallback(async (): Promise<boolean> => {
    if (!offlineManagerRef.current || !options.yjsDoc || isSyncingRef.current) {
      return false;
    }

    const offlineManager = offlineManagerRef.current;
    const pendingChanges = offlineManager.getPendingChanges();

    if (pendingChanges.length === 0) {
      return true;
    }

    isSyncingRef.current = true;

    try {
      console.log(`Syncing ${pendingChanges.length} pending changes...`);

      // Sort changes by timestamp to maintain order
      const sortedChanges = [...pendingChanges].sort((a, b) => a.timestamp - b.timestamp);
      
      let syncedCount = 0;
      const failedChanges: OfflineChange[] = [];

      for (const change of sortedChanges) {
        try {
          await applyChange(change);
          offlineManager.removePendingChange(change.id);
          syncedCount++;
        } catch (error) {
          console.error('Failed to apply change:', change, error);
          failedChanges.push(change);
        }
      }

      console.log(`Successfully synced ${syncedCount} changes, ${failedChanges.length} failed`);

      if (options.onSyncComplete) {
        options.onSyncComplete(syncedCount);
      }

      return failedChanges.length === 0;
    } catch (error) {
      console.error('Error during sync:', error);
      
      if (options.onSyncError) {
        options.onSyncError(error as Error);
      }
      
      return false;
    } finally {
      isSyncingRef.current = false;
    }
  }, [options.yjsDoc, options.onSyncComplete, options.onSyncError]);

  // Apply a single change to the Yjs document
  const applyChange = useCallback(async (change: OfflineChange): Promise<void> => {
    if (!options.yjsDoc) {
      throw new Error('Yjs document not available');
    }

    const { type, operation, data } = change;

    if (type === 'shape') {
      switch (operation) {
        case 'add':
          options.yjsDoc.addShape(data as Shape);
          break;
        case 'update':
          if (data.id) {
            const { id, ...updates } = data;
            options.yjsDoc.updateShape(id, updates);
          }
          break;
        case 'delete':
          if (data.id) {
            options.yjsDoc.deleteShape(data.id);
          }
          break;
      }
    } else if (type === 'group') {
      switch (operation) {
        case 'add':
          options.yjsDoc.addGroup(data as Group);
          break;
        case 'update':
          if (data.id) {
            const { id, ...updates } = data;
            options.yjsDoc.updateGroup(id, updates);
          }
          break;
        case 'delete':
          if (data.id) {
            options.yjsDoc.deleteGroup(data.id);
          }
          break;
      }
    }
  }, [options.yjsDoc]);

  // Clear all pending changes
  const clearPendingChanges = useCallback(() => {
    if (offlineManagerRef.current) {
      offlineManagerRef.current.clearPendingChanges();
    }
  }, []);

  // Force offline mode (for testing)
  const forceOfflineMode = useCallback((offline: boolean) => {
    if (offlineManagerRef.current) {
      offlineManagerRef.current.setOfflineMode(offline);
    }
  }, []);

  return {
    isOffline: offlineState.isOffline,
    pendingChanges: offlineState.pendingChanges,
    queueSize: offlineState.queueSize,
    retryCount,
    isReconnecting,
    lastSyncTimestamp: offlineState.lastSyncTimestamp,
    queueShapeChange,
    queueGroupChange,
    syncPendingChanges,
    clearPendingChanges,
    forceOfflineMode,
  };
};