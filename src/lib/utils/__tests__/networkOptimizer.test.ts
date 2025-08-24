import { networkOptimizer, NetworkOptimizer } from '../networkOptimizer';

// Mock timers
jest.useFakeTimers();

describe('NetworkOptimizer', () => {
  let optimizer: NetworkOptimizer;

  beforeEach(() => {
    optimizer = new NetworkOptimizer();
    jest.clearAllTimers();
  });

  afterEach(() => {
    optimizer.destroy();
  });

  describe('Update Batching', () => {
    it('should batch multiple updates together', async () => {
      const operations: jest.Mock[] = [];
      
      // Add multiple operations
      for (let i = 0; i < 5; i++) {
        const operation = jest.fn();
        operations.push(operation);
        optimizer.batchUpdate(operation, 'medium');
      }

      // Operations should not be executed immediately
      operations.forEach(op => expect(op).not.toHaveBeenCalled());

      // Fast-forward time to trigger batch processing
      jest.advanceTimersByTime(100);
      
      // Run all pending promises
      await new Promise(resolve => setImmediate(resolve));

      // All operations should be executed
      operations.forEach(op => expect(op).toHaveBeenCalledTimes(1));
    });

    it('should process high priority updates immediately', async () => {
      const highPriorityOp = jest.fn();
      const mediumPriorityOp = jest.fn();

      optimizer.batchUpdate(highPriorityOp, 'high');
      optimizer.batchUpdate(mediumPriorityOp, 'medium');

      // High priority should be processed quickly
      jest.advanceTimersByTime(15);
      await new Promise(resolve => setImmediate(resolve));

      expect(highPriorityOp).toHaveBeenCalled();
      expect(mediumPriorityOp).not.toHaveBeenCalled();

      // Medium priority processed after batch delay
      jest.advanceTimersByTime(50);
      await new Promise(resolve => setImmediate(resolve));

      expect(mediumPriorityOp).toHaveBeenCalled();
    });

    it('should handle batch processing errors gracefully', async () => {
      const successOp = jest.fn();
      const errorOp = jest.fn(() => {
        throw new Error('Test error');
      });

      optimizer.batchUpdate(successOp, 'medium');
      optimizer.batchUpdate(errorOp, 'medium');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      jest.advanceTimersByTime(100);
      await new Promise(resolve => setImmediate(resolve));

      expect(successOp).toHaveBeenCalled();
      expect(errorOp).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Network Metrics', () => {
    it('should track network metrics correctly', () => {
      const initialMetrics = optimizer.getMetrics();
      expect(initialMetrics.messagesSent).toBe(0);
      expect(initialMetrics.messagesReceived).toBe(0);

      // Record some messages
      optimizer.recordIncomingMessage(100);
      optimizer.recordIncomingMessage(200);

      const updatedMetrics = optimizer.getMetrics();
      expect(updatedMetrics.messagesReceived).toBe(2);
      expect(updatedMetrics.bytesTransferred).toBe(300);
    });

    it('should calculate connection quality based on latency', () => {
      // Simulate excellent connection (low latency)
      for (let i = 0; i < 10; i++) {
        optimizer['updateLatencyMetrics'](20); // 20ms latency
      }

      let metrics = optimizer.getMetrics();
      expect(metrics.connectionQuality).toBe('excellent');

      // Simulate poor connection (high latency)
      for (let i = 0; i < 10; i++) {
        optimizer['updateLatencyMetrics'](300); // 300ms latency
      }

      metrics = optimizer.getMetrics();
      expect(metrics.connectionQuality).toBe('poor');
    });
  });

  describe('Throttled and Debounced Updates', () => {
    it('should create throttled update functions', async () => {
      const updateFn = jest.fn();
      const throttledUpdate = optimizer.createThrottledVisualUpdate(updateFn);

      // Call multiple times rapidly
      throttledUpdate();
      throttledUpdate();
      throttledUpdate();

      // Should not be called immediately
      expect(updateFn).not.toHaveBeenCalled();

      // Fast-forward past throttle interval and batch delay
      jest.advanceTimersByTime(100);
      await new Promise(resolve => setImmediate(resolve));
      
      expect(updateFn).toHaveBeenCalledTimes(1);
    });

    it('should create debounced update functions', async () => {
      const updateFn = jest.fn();
      const debouncedUpdate = optimizer.createDebouncedMetadataUpdate(updateFn);

      // Call multiple times rapidly
      debouncedUpdate();
      debouncedUpdate();
      debouncedUpdate();

      // Should not be called immediately
      expect(updateFn).not.toHaveBeenCalled();

      // Fast-forward past debounce delay and batch delay
      jest.advanceTimersByTime(200);
      await new Promise(resolve => setImmediate(resolve));
      
      expect(updateFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Queue Management', () => {
    it('should provide queue status information', () => {
      const operation = jest.fn();
      
      optimizer.batchUpdate(operation, 'medium');
      optimizer.batchUpdate(operation, 'medium');

      const status = optimizer.getQueueStatus();
      expect(status.queueLength).toBe(2);
      expect(status.isProcessing).toBe(false);
      expect(status.oldestBatchAge).toBeGreaterThanOrEqual(0);
    });

    it('should flush all queued updates', async () => {
      const operations: jest.Mock[] = [];
      
      for (let i = 0; i < 3; i++) {
        const operation = jest.fn();
        operations.push(operation);
        optimizer.batchUpdate(operation, 'medium');
      }

      // Flush without waiting for timer
      await optimizer.flush();

      operations.forEach(op => expect(op).toHaveBeenCalled());
    });

    it('should clear all queued updates', () => {
      const operation = jest.fn();
      
      optimizer.batchUpdate(operation, 'medium');
      optimizer.batchUpdate(operation, 'medium');

      expect(optimizer.getQueueStatus().queueLength).toBe(2);

      optimizer.clearQueue();

      expect(optimizer.getQueueStatus().queueLength).toBe(0);
    });
  });

  describe('Network Optimization', () => {
    it('should recommend appropriate batch sizes based on connection quality', () => {
      // Simulate excellent connection
      optimizer['metrics'].connectionQuality = 'excellent';
      expect(optimizer.getRecommendedBatchSize()).toBe(100);

      // Simulate poor connection
      optimizer['metrics'].connectionQuality = 'poor';
      expect(optimizer.getRecommendedBatchSize()).toBeLessThan(50);

      // Simulate critical connection
      optimizer['metrics'].connectionQuality = 'critical';
      expect(optimizer.getRecommendedBatchSize()).toBeLessThan(25);
    });

    it('should detect optimal network conditions', () => {
      optimizer['metrics'].connectionQuality = 'excellent';
      expect(optimizer.isNetworkOptimal()).toBe(true);

      optimizer['metrics'].connectionQuality = 'good';
      expect(optimizer.isNetworkOptimal()).toBe(true);

      optimizer['metrics'].connectionQuality = 'poor';
      expect(optimizer.isNetworkOptimal()).toBe(false);

      optimizer['metrics'].connectionQuality = 'critical';
      expect(optimizer.isNetworkOptimal()).toBe(false);
    });

    it('should compress messages', () => {
      const testData = {
        shapes: [
          { id: '1', type: 'rectangle', position: { x: 0, y: 0 } },
          { id: '2', type: 'circle', position: { x: 100, y: 100 } }
        ]
      };

      const compressed = optimizer.compressMessage(testData);
      expect(typeof compressed).toBe('string');
      expect(compressed.length).toBeGreaterThan(0);

      // Should be valid JSON
      expect(() => JSON.parse(compressed)).not.toThrow();
    });
  });

  describe('Performance Monitoring', () => {
    it('should reset metrics correctly', () => {
      // Add some data
      optimizer.recordIncomingMessage(100);
      optimizer['updateLatencyMetrics'](50);

      let metrics = optimizer.getMetrics();
      expect(metrics.messagesReceived).toBeGreaterThan(0);

      // Reset
      optimizer.resetMetrics();

      metrics = optimizer.getMetrics();
      expect(metrics.messagesReceived).toBe(0);
      expect(metrics.bytesTransferred).toBe(0);
      expect(metrics.averageLatency).toBe(0);
    });
  });
});