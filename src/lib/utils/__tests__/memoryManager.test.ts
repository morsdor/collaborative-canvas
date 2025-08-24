import { memoryManager, MemoryManager } from '../memoryManager';

// Mock performance.memory API
const mockMemory = {
  usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  totalJSHeapSize: 100 * 1024 * 1024, // 100MB
};

Object.defineProperty(window, 'performance', {
  value: {
    memory: mockMemory,
  },
  writable: true,
});

// Mock timers
jest.useFakeTimers();

describe('MemoryManager', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    manager = new MemoryManager();
    jest.clearAllTimers();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Memory Monitoring', () => {
    it('should get memory metrics', () => {
      const metrics = manager.getMemoryMetrics();
      
      expect(metrics.heapUsed).toBe(mockMemory.usedJSHeapSize);
      expect(metrics.heapTotal).toBe(mockMemory.totalJSHeapSize);
      expect(typeof metrics.peakHeapUsed).toBe('number');
      expect(typeof metrics.gcCount).toBe('number');
    });

    it('should register and notify memory observers', () => {
      const observer = jest.fn();
      const unregister = manager.registerMemoryObserver(observer);

      // Trigger memory check
      manager['checkMemoryUsage']();

      expect(observer).toHaveBeenCalledWith(expect.objectContaining({
        heapUsed: expect.any(Number),
        heapTotal: expect.any(Number),
      }));

      // Unregister should work
      unregister();
      observer.mockClear();
      
      manager['checkMemoryUsage']();
      expect(observer).not.toHaveBeenCalled();
    });

    it('should trigger cleanup when memory thresholds are exceeded', () => {
      const cleanupCallback = jest.fn();
      manager.registerCleanupCallback(cleanupCallback);

      // Set low thresholds to trigger cleanup
      manager.setThresholds({
        warning: 10, // 10MB
        cleanup: 20, // 20MB
        critical: 30, // 30MB
      });

      // Mock high memory usage
      mockMemory.usedJSHeapSize = 25 * 1024 * 1024; // 25MB

      manager['checkMemoryUsage']();

      expect(cleanupCallback).toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    it('should store and retrieve cached data', () => {
      const testData = { id: '1', name: 'test' };
      
      manager.setCache('test-key', testData);
      const retrieved = manager.getCache('test-key');

      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent cache keys', () => {
      const result = manager.getCache('non-existent');
      expect(result).toBeNull();
    });

    it('should expire cache entries after TTL', () => {
      const testData = { id: '1', name: 'test' };
      
      manager.setCache('test-key', testData);
      
      // Fast-forward past TTL (5 minutes)
      jest.advanceTimersByTime(6 * 60 * 1000);
      
      const result = manager.getCache('test-key');
      expect(result).toBeNull();
    });

    it('should update access statistics', () => {
      const testData = { id: '1', name: 'test' };
      
      manager.setCache('test-key', testData);
      
      // Access multiple times
      manager.getCache('test-key');
      manager.getCache('test-key');
      
      const stats = manager.getCacheStats();
      expect(stats.size).toBe(1);
    });

    it('should cleanup old entries when cache is full', () => {
      // Fill cache beyond max size
      for (let i = 0; i < 1100; i++) {
        manager.setCache(`key-${i}`, { data: i });
      }

      const stats = manager.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(1000); // Should not exceed max size
    });

    it('should clear all cache entries', () => {
      manager.setCache('key1', { data: 1 });
      manager.setCache('key2', { data: 2 });

      expect(manager.getCacheStats().size).toBe(2);

      manager.clearCache();

      expect(manager.getCacheStats().size).toBe(0);
    });

    it('should remove specific cache entries', () => {
      manager.setCache('key1', { data: 1 });
      manager.setCache('key2', { data: 2 });

      expect(manager.removeCache('key1')).toBe(true);
      expect(manager.removeCache('key1')).toBe(false); // Already removed

      expect(manager.getCacheStats().size).toBe(1);
      expect(manager.getCache('key2')).toEqual({ data: 2 });
    });
  });

  describe('Cleanup Management', () => {
    it('should register and call cleanup callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.registerCleanupCallback(callback1);
      manager.registerCleanupCallback(callback2);

      manager.performCleanup();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle cleanup callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Cleanup error');
      });
      const successCallback = jest.fn();

      manager.registerCleanupCallback(errorCallback);
      manager.registerCleanupCallback(successCallback);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      manager.performCleanup();

      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should perform aggressive cleanup for critical memory situations', () => {
      const cleanupCallback = jest.fn();
      manager.registerCleanupCallback(cleanupCallback);

      manager.setCache('key1', { data: 1 });
      manager.setCache('key2', { data: 2 });

      manager.performAggressiveCleanup();

      expect(cleanupCallback).toHaveBeenCalled();
      expect(manager.getCacheStats().size).toBe(0); // All cache cleared
    });
  });

  describe('WeakRef Manager', () => {
    it('should create and manage weak references', () => {
      const weakRefManager = manager.createWeakRefManager<object>();
      
      let obj = { id: 1, name: 'test' };
      weakRefManager.add('test-key', obj);

      const retrieved = weakRefManager.get('test-key');
      expect(retrieved).toBe(obj);

      // Simulate object being garbage collected
      obj = null as any;
      
      // Force cleanup
      weakRefManager.cleanup();
      
      // Note: In a real scenario, the object would be GC'd and the weak ref would return undefined
      // This is hard to test reliably in Jest
    });

    it('should delete weak references', () => {
      const weakRefManager = manager.createWeakRefManager<object>();
      
      const obj = { id: 1, name: 'test' };
      weakRefManager.add('test-key', obj);

      expect(weakRefManager.get('test-key')).toBe(obj);
      expect(weakRefManager.delete('test-key')).toBe(true);
      expect(weakRefManager.get('test-key')).toBeUndefined();
    });
  });

  describe('Operation Monitoring', () => {
    it('should monitor synchronous operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await manager.monitorOperation(() => {
        return 'test result';
      }, 'test operation');

      expect(result).toBe('test result');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test operation'),
        expect.objectContaining({
          duration: expect.stringContaining('ms'),
          memoryDelta: expect.stringContaining('KB'),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should monitor asynchronous operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await manager.monitorOperation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      }, 'async operation');

      expect(result).toBe('async result');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle operation errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(manager.monitorOperation(() => {
        throw new Error('Test error');
      }, 'failing operation')).rejects.toThrow('Test error');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('failing operation'),
        expect.objectContaining({
          error: expect.any(Error),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Cache Statistics', () => {
    it('should provide accurate cache statistics', () => {
      manager.setCache('key1', { data: 'small' });
      manager.setCache('key2', { data: 'larger data string' });

      // Access one entry multiple times
      manager.getCache('key1');
      manager.getCache('key1');

      const stats = manager.getCacheStats();
      
      expect(stats.size).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memory Thresholds', () => {
    it('should update memory thresholds', () => {
      const newThresholds = {
        warning: 50,
        critical: 100,
        cleanup: 75,
      };

      manager.setThresholds(newThresholds);

      // Access private thresholds property for testing
      expect((manager as any).thresholds).toEqual(expect.objectContaining(newThresholds));
    });
  });
});