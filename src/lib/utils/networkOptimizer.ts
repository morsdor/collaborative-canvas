import { debounce, throttle } from '@/utils';

/**
 * Network optimization utilities for Yjs and WebSocket communications
 */

export interface NetworkMetrics {
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  averageLatency: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  lastMessageTime: number;
}

export interface UpdateBatch {
  operations: Array<() => void>;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

export class NetworkOptimizer {
  private metrics: NetworkMetrics = {
    messagesSent: 0,
    messagesReceived: 0,
    bytesTransferred: 0,
    averageLatency: 0,
    connectionQuality: 'excellent',
    lastMessageTime: 0,
  };

  private latencyHistory: number[] = [];
  private maxLatencyHistory = 20;
  private updateQueue: UpdateBatch[] = [];
  private isProcessingQueue = false;
  private batchTimer: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly BATCH_DELAY = 50; // ms - batch updates within this window
  private readonly MAX_BATCH_SIZE = 100;
  private readonly HIGH_PRIORITY_DELAY = 10; // ms - immediate processing for high priority
  private readonly THROTTLE_INTERVAL = 16; // ms - ~60fps for visual updates
  private readonly DEBOUNCE_DELAY = 100; // ms - for non-critical updates

  // Throttled and debounced update functions
  private throttledVisualUpdate = throttle(this.processVisualUpdates.bind(this), this.THROTTLE_INTERVAL);
  private debouncedMetadataUpdate = debounce(this.processMetadataUpdates.bind(this), this.DEBOUNCE_DELAY);

  /**
   * Add an operation to the update batch queue
   */
  batchUpdate(operation: () => void, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const batch: UpdateBatch = {
      operations: [operation],
      timestamp: Date.now(),
      priority,
    };

    // High priority updates are processed immediately
    if (priority === 'high') {
      this.processImmediately(batch);
      return;
    }

    // Add to queue for batching
    this.updateQueue.push(batch);
    this.scheduleBatchProcessing(priority);
  }

  /**
   * Batch multiple operations together
   */
  batchMultipleUpdates(operations: Array<() => void>, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const batch: UpdateBatch = {
      operations,
      timestamp: Date.now(),
      priority,
    };

    if (priority === 'high') {
      this.processImmediately(batch);
      return;
    }

    this.updateQueue.push(batch);
    this.scheduleBatchProcessing(priority);
  }

  /**
   * Process high priority updates immediately
   */
  private processImmediately(batch: UpdateBatch): void {
    setTimeout(() => {
      this.executeBatch(batch);
    }, this.HIGH_PRIORITY_DELAY);
  }

  /**
   * Schedule batch processing with appropriate delay
   */
  private scheduleBatchProcessing(priority: 'medium' | 'low'): void {
    if (this.batchTimer) {
      return; // Already scheduled
    }

    const delay = priority === 'medium' ? this.BATCH_DELAY : this.BATCH_DELAY * 2;

    this.batchTimer = setTimeout(() => {
      this.processBatchQueue();
      this.batchTimer = null;
    }, delay);
  }

  /**
   * Process the entire batch queue
   */
  private async processBatchQueue(): Promise<void> {
    if (this.isProcessingQueue || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Group batches by priority
      const highPriorityBatches = this.updateQueue.filter(b => b.priority === 'high');
      const mediumPriorityBatches = this.updateQueue.filter(b => b.priority === 'medium');
      const lowPriorityBatches = this.updateQueue.filter(b => b.priority === 'low');

      // Process in priority order
      for (const batch of [...highPriorityBatches, ...mediumPriorityBatches, ...lowPriorityBatches]) {
        await this.executeBatch(batch);
        
        // Yield control to prevent blocking
        if (batch.operations.length > 10) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      this.updateQueue = [];
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Execute a batch of operations
   */
  private async executeBatch(batch: UpdateBatch): Promise<void> {
    const startTime = performance.now();

    try {
      // Execute all operations in the batch
      for (const operation of batch.operations) {
        operation();
      }

      // Update metrics
      this.metrics.messagesSent += batch.operations.length;
      this.metrics.lastMessageTime = Date.now();

      const latency = performance.now() - startTime;
      this.updateLatencyMetrics(latency);

    } catch (error) {
      console.error('Error executing batch operations:', error);
    }
  }

  /**
   * Throttled visual updates (position, size, style changes)
   */
  private processVisualUpdates(): void {
    // This method is called by the throttled function
    // Actual visual updates are handled by the batch queue
  }

  /**
   * Debounced metadata updates (non-critical data)
   */
  private processMetadataUpdates(): void {
    // This method is called by the debounced function
    // Actual metadata updates are handled by the batch queue
  }

  /**
   * Create throttled update function for visual changes
   */
  createThrottledVisualUpdate(updateFn: () => void): () => void {
    return throttle(() => {
      this.batchUpdate(updateFn, 'medium');
    }, this.THROTTLE_INTERVAL);
  }

  /**
   * Create debounced update function for metadata changes
   */
  createDebouncedMetadataUpdate(updateFn: () => void): () => void {
    return debounce(() => {
      this.batchUpdate(updateFn, 'low');
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    this.latencyHistory.push(latency);
    
    if (this.latencyHistory.length > this.maxLatencyHistory) {
      this.latencyHistory.shift();
    }

    // Calculate average latency
    this.metrics.averageLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;

    // Update connection quality based on latency
    if (this.metrics.averageLatency < 50) {
      this.metrics.connectionQuality = 'excellent';
    } else if (this.metrics.averageLatency < 150) {
      this.metrics.connectionQuality = 'good';
    } else if (this.metrics.averageLatency < 500) {
      this.metrics.connectionQuality = 'poor';
    } else {
      this.metrics.connectionQuality = 'critical';
    }
  }

  /**
   * Record incoming message
   */
  recordIncomingMessage(size: number = 0): void {
    this.metrics.messagesReceived++;
    this.metrics.bytesTransferred += size;
    this.metrics.lastMessageTime = Date.now();
  }

  /**
   * Get current network metrics
   */
  getMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      connectionQuality: 'excellent',
      lastMessageTime: 0,
    };
    this.latencyHistory = [];
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    oldestBatchAge: number;
  } {
    const oldestBatch = this.updateQueue[0];
    const oldestBatchAge = oldestBatch ? Date.now() - oldestBatch.timestamp : 0;

    return {
      queueLength: this.updateQueue.length,
      isProcessing: this.isProcessingQueue,
      oldestBatchAge,
    };
  }

  /**
   * Force process all queued updates
   */
  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    await this.processBatchQueue();
  }

  /**
   * Clear all queued updates
   */
  clearQueue(): void {
    this.updateQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Optimize message size by compressing data
   */
  compressMessage(data: any): string {
    try {
      // Simple JSON compression - remove unnecessary whitespace
      const jsonString = JSON.stringify(data);
      
      // Could implement more sophisticated compression here
      // For now, just ensure minimal JSON representation
      return jsonString;
    } catch (error) {
      console.error('Error compressing message:', error);
      return JSON.stringify(data);
    }
  }

  /**
   * Check if network conditions are good for large operations
   */
  isNetworkOptimal(): boolean {
    return this.metrics.connectionQuality === 'excellent' || 
           this.metrics.connectionQuality === 'good';
  }

  /**
   * Get recommended batch size based on network conditions
   */
  getRecommendedBatchSize(): number {
    switch (this.metrics.connectionQuality) {
      case 'excellent':
        return this.MAX_BATCH_SIZE;
      case 'good':
        return Math.floor(this.MAX_BATCH_SIZE * 0.7);
      case 'poor':
        return Math.floor(this.MAX_BATCH_SIZE * 0.4);
      case 'critical':
        return Math.floor(this.MAX_BATCH_SIZE * 0.2);
      default:
        return this.MAX_BATCH_SIZE;
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.clearQueue();
    this.resetMetrics();
  }
}

// Singleton instance
export const networkOptimizer = new NetworkOptimizer();