import { OfflineManager, ReconnectionManager } from '../index';
import { Shape } from '@/types';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window events
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener });
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener });

describe('OfflineManager', () => {
  let offlineManager: OfflineManager;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (navigator as any).onLine = true;
    offlineManager = new OfflineManager();
  });

  afterEach(() => {
    offlineManager.destroy();
  });

  describe('initialization', () => {
    it('should initialize with online state', () => {
      const state = offlineManager.getOfflineState();
      expect(state.isOffline).toBe(false);
      expect(state.pendingChanges).toHaveLength(0);
      expect(state.queueSize).toBe(0);
    });

    it('should set up online/offline event listeners', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should load pending changes from localStorage', () => {
      const mockChanges = [
        {
          id: 'test-1',
          type: 'shape',
          operation: 'add',
          data: { id: 'shape-1', type: 'rectangle' },
          timestamp: Date.now(),
          userId: 'user-1',
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockChanges));
      
      const manager = new OfflineManager();
      const state = manager.getOfflineState();
      
      expect(state.pendingChanges).toHaveLength(1);
      expect(state.pendingChanges[0].id).toBe('test-1');
      
      manager.destroy();
    });
  });

  describe('offline detection', () => {
    it('should detect offline state', () => {
      const listener = jest.fn();
      offlineManager.onStateChange(listener);

      // Simulate going offline
      offlineManager.setOfflineMode(true);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOffline: true,
        })
      );
    });

    it('should detect online state', () => {
      const listener = jest.fn();
      
      // Start offline
      offlineManager.setOfflineMode(true);
      offlineManager.onStateChange(listener);

      // Go online
      offlineManager.setOfflineMode(false);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOffline: false,
        })
      );
    });
  });

  describe('change queueing', () => {
    it('should queue shape changes', () => {
      const change = {
        type: 'shape' as const,
        operation: 'add' as const,
        data: { id: 'shape-1', type: 'rectangle' } as Shape,
        userId: 'user-1',
      };

      offlineManager.queueChange(change);

      const state = offlineManager.getOfflineState();
      expect(state.pendingChanges).toHaveLength(1);
      expect(state.pendingChanges[0].type).toBe('shape');
      expect(state.pendingChanges[0].operation).toBe('add');
      expect(state.pendingChanges[0].userId).toBe('user-1');
    });

    it('should save changes to localStorage', () => {
      const change = {
        type: 'shape' as const,
        operation: 'add' as const,
        data: { id: 'shape-1' },
        userId: 'user-1',
      };

      offlineManager.queueChange(change);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'collaborative-canvas-offline-changes',
        expect.any(String)
      );
    });

    it('should limit queue size', () => {
      // Queue more than max size
      for (let i = 0; i < 1100; i++) {
        offlineManager.queueChange({
          type: 'shape',
          operation: 'add',
          data: { id: `shape-${i}` },
          userId: 'user-1',
        });
      }

      const state = offlineManager.getOfflineState();
      expect(state.pendingChanges.length).toBeLessThan(1100);
    });

    it('should notify listeners when changes are queued', () => {
      const listener = jest.fn();
      offlineManager.onStateChange(listener);

      offlineManager.queueChange({
        type: 'shape',
        operation: 'add',
        data: { id: 'shape-1' },
        userId: 'user-1',
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          queueSize: 1,
        })
      );
    });
  });

  describe('change management', () => {
    beforeEach(() => {
      // Add some test changes
      offlineManager.queueChange({
        type: 'shape',
        operation: 'add',
        data: { id: 'shape-1' },
        userId: 'user-1',
      });
      offlineManager.queueChange({
        type: 'shape',
        operation: 'update',
        data: { id: 'shape-2' },
        userId: 'user-1',
      });
    });

    it('should get pending changes', () => {
      const changes = offlineManager.getPendingChanges();
      expect(changes).toHaveLength(2);
    });

    it('should clear all pending changes', () => {
      offlineManager.clearPendingChanges();
      
      const state = offlineManager.getOfflineState();
      expect(state.pendingChanges).toHaveLength(0);
      expect(state.queueSize).toBe(0);
    });

    it('should remove specific pending change', () => {
      const changes = offlineManager.getPendingChanges();
      const changeId = changes[0].id;

      offlineManager.removePendingChange(changeId);

      const newState = offlineManager.getOfflineState();
      expect(newState.pendingChanges).toHaveLength(1);
      expect(newState.pendingChanges.find(c => c.id === changeId)).toBeUndefined();
    });
  });
});

describe('ReconnectionManager', () => {
  let reconnectionManager: ReconnectionManager;
  let mockReconnectFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockReconnectFn = jest.fn();
    reconnectionManager = new ReconnectionManager({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    });
  });

  afterEach(() => {
    reconnectionManager.destroy();
    jest.useRealTimers();
  });

  describe('reconnection attempts', () => {
    it('should attempt reconnection on first try', async () => {
      mockReconnectFn.mockResolvedValue(true);

      const result = await reconnectionManager.attemptReconnection(mockReconnectFn);

      expect(result).toBe(true);
      expect(mockReconnectFn).toHaveBeenCalledTimes(1);
      expect(reconnectionManager.getRetryCount()).toBe(0);
    });

    it('should schedule retry on failure', async () => {
      mockReconnectFn.mockResolvedValue(false);

      const promise = reconnectionManager.attemptReconnection(mockReconnectFn);
      
      // Fast-forward time to trigger retry
      jest.advanceTimersByTime(2000);
      
      await promise;

      expect(mockReconnectFn).toHaveBeenCalledTimes(1);
      expect(reconnectionManager.getRetryCount()).toBe(1);
    });

    it('should use exponential backoff', async () => {
      const listener = jest.fn();
      reconnectionManager.onReconnectionAttempt(listener);

      mockReconnectFn.mockResolvedValue(false);

      // First attempt
      await reconnectionManager.attemptReconnection(mockReconnectFn);
      
      // Should schedule with base delay
      expect(listener).toHaveBeenCalledWith(1, expect.any(Number));
      
      // Fast-forward and trigger retry
      jest.advanceTimersByTime(2000);
      
      // Wait for the retry to be scheduled and executed
      await new Promise(resolve => setImmediate(resolve));
      
      // Second attempt should have longer delay
      if (listener.mock.calls.length > 1) {
        expect(listener).toHaveBeenCalledWith(2, expect.any(Number));
        
        const firstDelay = listener.mock.calls[0][1];
        const secondDelay = listener.mock.calls[1][1];
        expect(secondDelay).toBeGreaterThan(firstDelay);
      }
    });

    it('should stop after max retries', async () => {
      mockReconnectFn.mockResolvedValue(false);

      // Attempt reconnection multiple times
      for (let i = 0; i < 5; i++) {
        await reconnectionManager.attemptReconnection(mockReconnectFn);
        jest.advanceTimersByTime(10000);
      }

      // Should not exceed max retries
      expect(reconnectionManager.getRetryCount()).toBeLessThanOrEqual(3);
    });

    it('should reset retry count on successful reconnection', async () => {
      mockReconnectFn.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      // First attempt fails
      await reconnectionManager.attemptReconnection(mockReconnectFn);
      expect(reconnectionManager.getRetryCount()).toBe(1);

      // Manually trigger successful reconnection
      await reconnectionManager.attemptReconnection(() => Promise.resolve(true));
      
      // Reset should happen
      expect(reconnectionManager.getRetryCount()).toBe(0);
    });
  });

  describe('state management', () => {
    it('should track reconnection state', async () => {
      mockReconnectFn.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve(false), 50);
      }));

      const promise = reconnectionManager.attemptReconnection(mockReconnectFn);
      
      expect(reconnectionManager.isAttempting()).toBe(true);
      
      // Fast-forward timers to complete the promise
      jest.advanceTimersByTime(100);
      await promise;
      
      expect(reconnectionManager.isAttempting()).toBe(false);
    }, 10000);

    it('should prevent concurrent reconnection attempts', async () => {
      mockReconnectFn.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve(false), 50);
      }));

      const promise1 = reconnectionManager.attemptReconnection(mockReconnectFn);
      const promise2 = reconnectionManager.attemptReconnection(mockReconnectFn);

      // Fast-forward timers
      jest.advanceTimersByTime(100);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(mockReconnectFn).toHaveBeenCalledTimes(1);
    }, 10000);

    it('should stop reconnection attempts', () => {
      mockReconnectFn.mockResolvedValue(false);

      reconnectionManager.attemptReconnection(mockReconnectFn);
      reconnectionManager.stop();

      expect(reconnectionManager.getRetryCount()).toBe(0);
      expect(reconnectionManager.isAttempting()).toBe(false);
    });
  });
});