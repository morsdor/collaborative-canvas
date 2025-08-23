import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { YjsDocument, getYjsDocument } from '@/lib/yjs';
import { Shape, Group, UserPresence } from '@/types';
import { RootState } from '@/store';
import { setConnectionStatus, addUser, removeUser, updateUserPresence } from '@/store/slices/collaborationSlice';

interface UseYjsSyncOptions {
  sessionId: string;
  wsUrl?: string;
  onShapesChange?: (shapes: Shape[]) => void;
  onGroupsChange?: (groups: Group[]) => void;
}

interface YjsSyncReturn {
  yjsDoc: YjsDocument;
  isConnected: boolean;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  addGroup: (group: Group) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  getAllShapes: () => Shape[];
  getAllGroups: () => Group[];
}

export const useYjsSync = (options: UseYjsSyncOptions): YjsSyncReturn => {
  const dispatch = useDispatch();
  const connectionStatus = useSelector((state: RootState) => state.collaboration.connectionStatus);
  const yjsDocRef = useRef<YjsDocument | null>(null);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);

  // Initialize Yjs document
  useEffect(() => {
    if (!yjsDocRef.current) {
      yjsDocRef.current = getYjsDocument();
    }

    const yjsDoc = yjsDocRef.current;
    const wsUrl = options.wsUrl || 'ws://localhost:3001';

    // Connect to WebSocket
    const provider = yjsDoc.connect({
      wsUrl,
      roomName: options.sessionId,
    });

    // Set up connection status monitoring
    const handleConnectionStatus = (event: { status: string }) => {
      switch (event.status) {
        case 'connected':
          dispatch(setConnectionStatus('connected'));
          break;
        case 'connecting':
          dispatch(setConnectionStatus('connecting'));
          break;
        case 'disconnected':
          dispatch(setConnectionStatus('disconnected'));
          break;
      }
    };

    provider.on('status', handleConnectionStatus);

    // Set up shapes observer
    const shapesCleanup = yjsDoc.onShapesChange((shapes) => {
      if (options.onShapesChange) {
        options.onShapesChange(shapes);
      }
    });

    // Set up groups observer
    const groupsCleanup = yjsDoc.onGroupsChange((groups) => {
      if (options.onGroupsChange) {
        options.onGroupsChange(groups);
      }
    });

    // Store cleanup functions
    cleanupFunctionsRef.current = [shapesCleanup, groupsCleanup];

    return () => {
      provider.off('status', handleConnectionStatus);
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, [options.sessionId, options.wsUrl, dispatch, options.onShapesChange, options.onGroupsChange]);

  // Shape management functions
  const addShape = useCallback((shape: Shape) => {
    if (yjsDocRef.current) {
      yjsDocRef.current.addShape(shape);
    }
  }, []);

  const updateShape = useCallback((id: string, updates: Partial<Shape>) => {
    if (yjsDocRef.current) {
      yjsDocRef.current.updateShape(id, updates);
    }
  }, []);

  const deleteShape = useCallback((id: string) => {
    if (yjsDocRef.current) {
      yjsDocRef.current.deleteShape(id);
    }
  }, []);

  // Group management functions
  const addGroup = useCallback((group: Group) => {
    if (yjsDocRef.current) {
      yjsDocRef.current.addGroup(group);
    }
  }, []);

  const updateGroup = useCallback((id: string, updates: Partial<Group>) => {
    if (yjsDocRef.current) {
      yjsDocRef.current.updateGroup(id, updates);
    }
  }, []);

  const deleteGroup = useCallback((id: string) => {
    if (yjsDocRef.current) {
      yjsDocRef.current.deleteGroup(id);
    }
  }, []);

  // Getter functions
  const getAllShapes = useCallback(() => {
    return yjsDocRef.current?.getAllShapes() || [];
  }, []);

  const getAllGroups = useCallback(() => {
    return yjsDocRef.current?.getAllGroups() || [];
  }, []);

  return {
    yjsDoc: yjsDocRef.current!,
    isConnected: connectionStatus === 'connected',
    addShape,
    updateShape,
    deleteShape,
    addGroup,
    updateGroup,
    deleteGroup,
    getAllShapes,
    getAllGroups,
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