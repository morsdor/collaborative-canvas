import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useOfflineSync } from '../useOfflineSync';
import { YjsDocument } from '@/lib/yjs';
import { Shape, Group } from '@/types';
import collaborationReducer from '@/store/slices/collaborationSlice';

// Mock the offline manager
jest.mock('@/lib/offline', () => ({
  getOfflineManager: jest.fn(() => ({
    onStateChange: jest.fn(() => jest.fn()),
    queueChange: jest.fn(),
    getPendingChanges: jest.fn(() => []),
    clearPendingChanges: jest.fn(),
    removePendingChange: jest.fn(),
    getOfflineState: jest.fn(() => ({
      isOffline: false,
      pendingChanges: [],
      lastSyncTimestamp: Date.now(),
      queueSize: 0,
    })),
    setOfflineMode: jest.fn(),
  })),
  getReconnectionManager: jest.fn(() => ({
    onReconnectionAttempt: jest.fn(() => jest.fn()),
    attemptReconnection: jest.fn(),
    reset: jest.fn(),
    getRetryCount: jest.fn(() => 0),
    isAttempting: jest.fn(() => false),
    destroy: jest.fn(),
  })),
}));

// Mock YjsDocument
const mockYjsDoc = {
  onConnectionStateChange: jest.fn(() => jest.fn()),
  getConnectionState: jest.fn(() => ({ status: 'connected', retryCount: 0 })),
  connect: jest.fn(),
  addShape: jest.fn(),
  updateShape: jest.fn(),
  deleteShape: jest.fn(),
  addGroup: jest.fn(),
  updateGroup: jest.fn(),
  deleteGroup: jest.fn(),
} as unknown as YjsDocument;

const createTestStore = () => {
  return configureStore({
    reducer: {
      collaboration: collaborationReducer,
    },
  });
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={createTestStore()}>{children}</Provider>
);

describe('useOfflineSync', () => {
  const defaultOptions = {
    yjsDoc: mockYjsDoc,
    userId: 'test-user',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      expect(result.current.isOffline).toBe(false);
      expect(result.current.pendingChanges).toHaveLength(0);
      expect(result.current.queueSize).toBe(0);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.isReconnecting).toBe(false);
    });

    it('should set up offline state monitoring', () => {
      const { getOfflineManager } = require('@/lib/offline');
      const mockOfflineManager = getOfflineManager();

      renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      expect(mockOfflineManager.onStateChange).toHaveBeenCalled();
    });

    it('should set up reconnection monitoring', () => {
      const { getReconnectionManager } = require('@/lib/offline');
      const mockReconnectionManager = getReconnectionManager();

      renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      expect(mockReconnectionManager.onReconnectionAttempt).toHaveBeenCalled();
    });

    it('should monitor Yjs connection state', () => {
      renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      expect(mockYjsDoc.onConnectionStateChange).toHaveBeenCalled();
    });
  });

  describe('shape operations', () => {
    it('should queue shape changes when offline', () => {
      const { getOfflineManager } = require('@/lib/offline');
      const mockOfflineManager = getOfflineManager();
      
      // Mock offline state
      mockOfflineManager.getOfflineState.mockReturnValue({
        isOffline: true,
        pendingChanges: [],
        lastSyncTimestamp: Date.now(),
        queueSize: 0,
      });

      const { result } = renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      const testShape: Shape = {
        id: 'shape-1',
        type: 'rectangle',
        position: { x: 0, y: 0 },
        dimensions: { width: 100, height: 100 },
        style: { fill: '#000', stroke: '#000', strokeWidth: 1, opacity: 1 },
      };

      act(() => {
        result.current.queueShapeChange('add', testShape);
      });

      expect(mockOfflineManager.queueChange).toHaveBeenCalledWith({
        type: 'shape',
        operation: 'add',
        data: testShape,
        userId: 'test-user',
      });
    });

    it('should queue shape updates when offline', () => {
      const { getOfflineManager } = require('@/lib/offline');
      const mockOfflineManager = getOfflineManager();

      const { result } = renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      const updates = { position: { x: 10, y: 10 } };

      act(() => {
        result.current.queueShapeChange('update', updates, 'shape-1');
      });

      expect(mockOfflineManager.queueChange).toHaveBeenCalledWith({
        type: 'shape',
        operation: 'update',
        data: { id: 'shape-1', ...updates },
        userId: 'test-user',
      });
    });

    it('should queue shape deletions when offline', () => {
      const { getOfflineManager } = require('@/lib/offline');
      const mockOfflineManager = getOfflineManager();

      const { result } = renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      act(() => {
        result.current.queueShapeChange('delete', {}, 'shape-1');
      });

      expect(mockOfflineManager.queueChange).toHaveBeenCalledWith({
        type: 'shape',
        operation: 'delete',
        data: { id: 'shape-1' },
        userId: 'test-user',
      });
    });
  });

  describe('group operations', () => {
    it('should queue group changes when offline', () => {
      const { getOfflineManager } = require('@/lib/offline');
      const mockOfflineManager = getOfflineManager();

      const { result } = renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      const testGroup: Group = {
        id: 'group-1',
        shapeIds: ['shape-1', 'shape-2'],
        bounds: { x: 0, y: 0, width: 200, height: 200 },
        locked: false,
      };

      act(() => {
        result.current.queueGroupChange('add', testGroup);
      });

      expect(mockOfflineManager.queueChange).toHaveBeenCalledWith({
        type: 'group',
        operation: 'add',
        data: testGroup,
        userId: 'test-user',
      });
    });

    it('should queue group updates when offline', () => {
      const { getOfflineManager } = require('@/lib/offline');
      const mockOfflineManager = getOfflineManager();

      const { result } = renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      const updates = { locked: true };

      act(() => {
        result.current.queueGroupChange('update', updates, 'group-1');
      });

      expect(mockOfflineManager.queueChange).toHaveBeenCalledWith({
        type: 'group',
        operation: 'update',
        data: { id: 'group-1', ...updates },
        userId: 'test-user',
      });
    });
  });

  describe('sync operations', () => {
    it('should sync pending changes when connected', async () => {
      const { getOfflineManager } = require('@/lib/offline');
      const mockOfflineManager = getOfflineManager();

      const mockPendingChanges = [
        {
          id: 'change-1',
          type: 'shape',
          operation: 'add',
          data: {
            id: 'shape-1',
            type: 'rectangle',
            position: { x: 0, y: 0 },
            dimensions: { width: 100, height: 100 },
            style: { fill: '#000', stroke: '#000', strokeWidth: 1, opacity: 1 },
          },
          timestamp: Date.now(),
          userId: 'test-user',
        },
      ];

      mockOfflineManager.getPendingChanges.mockReturnValue(mockPendingChanges);

      const { result } = renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      await act(async () => {
        const success = await result.current.syncPendingChanges();
        expect(success).toBe(true);
      });

      expect(mockYjsDoc.addShape).toHaveBeenCalledWith(mockPendingChanges[0].data);
      expect(mockOfflineManager.removePendingChange).toHaveBeenCalledWith('change-1');
    });

    it('should handle sync errors gracefully', async () => {
      const { getOfflineManager } = require('@/lib/offline';
      const mockOfflineManager = getOfflineManager();

      const mockPendingChanges = [
        {
          id: 'change-1',
          type: 'shape',
          operation: 'add',
          data: { invalid: 'data' },
          timestamp: Date.now(),
          userId: 'test-user',
        },
      ];

      mockOfflineManager.getPendingChanges.mockReturnValue(mockPendingChanges);
      mockYjsDoc.addShape.mockImplementation(() => {
        throw new Error('Invalid shape data');
      });

      const onSyncError = jest.fn();
      const { result } = renderHook(
        () => useOfflineSync({ ...defaultOptions, onSyncError }),
        { wrapper }
      );

      await act(async () => {
        const success = await result.current.syncPendingChanges();
        expect(success).toBe(false);
      });

      expect(onSyncError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should clear pending changes', () => {
      const { getOfflineManager } = require('@/lib/offline');
      const mockOfflineManager = getOfflineManager();

      const { result } = renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      act(() => {
        result.current.clearPendingChanges();
      });

      expect(mockOfflineManager.clearPendingChanges).toHaveBeenCalled();
    });
  });

  describe('offline mode control', () => {
    it('should force offline mode', () => {
      const { getOfflineManager } = require('@/lib/offline');
      const mockOfflineManager = getOfflineManager();

      const { result } = renderHook(() => useOfflineSync(defaultOptions), { wrapper });

      act(() => {
        result.current.forceOfflineMode(true);
      });

      expect(mockOfflineManager.setOfflineMode).toHaveBeenCalledWith(true);
    });
  });

  describe('callbacks', () => {
    it('should call onOfflineStateChange when state changes', () => {
      const onOfflineStateChange = jest.fn();
      
      renderHook(
        () => useOfflineSync({ ...defaultOptions, onOfflineStateChange }),
        { wrapper }
      );

      // Simulate state change
      const { getOfflineManager } = require('@/lib/offline');
      const mockOfflineManager = getOfflineManager();
      const stateChangeCallback = mockOfflineManager.onStateChange.mock.calls[0][0];

      const newState = {
        isOffline: true,
        pendingChanges: [],
        lastSyncTimestamp: Date.now(),
        queueSize: 0,
      };

      act(() => {
        stateChangeCallback(newState);
      });

      expect(onOfflineStateChange).toHaveBeenCalledWith(newState);
    });

    it('should call onReconnectionAttempt during reconnection', () => {
      const onReconnectionAttempt = jest.fn();
      
      renderHook(
        () => useOfflineSync({ ...defaultOptions, onReconnectionAttempt }),
        { wrapper }
      );

      // Simulate reconnection attempt
      const { getReconnectionManager } = require('@/lib/offline');
      const mockReconnectionManager = getReconnectionManager();
      const reconnectionCallback = mockReconnectionManager.onReconnectionAttempt.mock.calls[0][0];

      act(() => {
        reconnectionCallback(1, 2000);
      });

      expect(onReconnectionAttempt).toHaveBeenCalledWith(1, 2000);
    });

    it('should call onSyncComplete after successful sync', async () => {
      const onSyncComplete = jest.fn();
      const { getOfflineManager } = require('@/lib/offline');
      const mockOfflineManager = getOfflineManager();

      const mockPendingChanges = [
        {
          id: 'change-1',
          type: 'shape',
          operation: 'add',
          data: {
            id: 'shape-1',
            type: 'rectangle',
            position: { x: 0, y: 0 },
            dimensions: { width: 100, height: 100 },
            style: { fill: '#000', stroke: '#000', strokeWidth: 1, opacity: 1 },
          },
          timestamp: Date.now(),
          userId: 'test-user',
        },
      ];

      mockOfflineManager.getPendingChanges.mockReturnValue(mockPendingChanges);

      const { result } = renderHook(
        () => useOfflineSync({ ...defaultOptions, onSyncComplete }),
        { wrapper }
      );

      await act(async () => {
        await result.current.syncPendingChanges();
      });

      expect(onSyncComplete).toHaveBeenCalledWith(1);
    });
  });
});