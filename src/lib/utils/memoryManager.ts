/**
 * Memory management utilities for preventing memory leaks and optimizing memory usage
 */

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  peakHeapUsed: number;
  gcCount: number;
  lastGcTime: number;
}

export interface MemoryThresholds {
  warning: number; // MB
  critical: number; // MB
  cleanup: number; // MB
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export class MemoryManager {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupCallbacks = new Set<() => void>();
  private observers = new Set<(metrics: MemoryMetrics) => void>();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private gcCount = 0;
  private peakHeapUsed = 0;
  private lastGcTime = 0;

  // Configuration
  private readonly DEFAULT_THRESHOLDS: MemoryThresholds = {
    warning: 100, // 100MB
    critical: 200, // 200MB
    cleanup: 150, // 150MB
  };

  private readonly CACHE_MAX_SIZE = 1000; // Maximum number of cache entries
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MONITORING_INTERVAL = 10000; // 10 seconds
  private readonly CLEANUP_BATCH_SIZE = 50;

  private thresholds: MemoryThresholds;

  constructor(thresholds?: Partial<MemoryThresholds>) {
    this.thresholds = { ...this.DEFAULT_THRESHOLDS, ...thresholds };
    this.startMonitoring();
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      this.monitoringInterval = setInterval(() => {
        this.checkMemoryUsage();
      }, this.MONITORING_INTERVAL);
    }
  }

  /**
   * Check current memory usage and trigger cleanup if needed
   */
  private checkMemoryUsage(): void {
    const metrics = this.getMemoryMetrics();
    
    // Update peak usage
    if (metrics.heapUsed > this.peakHeapUsed) {
      this.peakHeapUsed = metrics.heapUsed;
    }

    // Notify observers
    this.observers.forEach(observer => observer(metrics));

    // Check thresholds and trigger cleanup
    const heapUsedMB = metrics.heapUsed / (1024 * 1024);
    
    if (heapUsedMB > this.thresholds.critical) {
      console.warn(`Critical memory usage: ${heapUsedMB.toFixed(1)}MB`);
      this.performAggressiveCleanup();
    } else if (heapUsedMB > this.thresholds.cleanup) {
      console.warn(`High memory usage: ${heapUsedMB.toFixed(1)}MB, performing cleanup`);
      this.performCleanup();
    } else if (heapUsedMB > this.thresholds.warning) {
      console.warn(`Memory usage warning: ${heapUsedMB.toFixed(1)}MB`);
    }
  }

  /**
   * Get current memory metrics
   */
  getMemoryMetrics(): MemoryMetrics {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        heapUsed: memory.usedJSHeapSize || 0,
        heapTotal: memory.totalJSHeapSize || 0,
        external: 0, // Not available in browser
        arrayBuffers: 0, // Not available in browser
        peakHeapUsed: this.peakHeapUsed,
        gcCount: this.gcCount,
        lastGcTime: this.lastGcTime,
      };
    }

    // Fallback for environments without memory API
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      peakHeapUsed: this.peakHeapUsed,
      gcCount: this.gcCount,
      lastGcTime: this.lastGcTime,
    };
  }

  /**
   * Cache management with automatic cleanup
   */
  setCache<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const size = this.estimateSize(data);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
      size,
    };

    this.cache.set(key, entry);

    // Cleanup old entries if cache is too large
    if (this.cache.size > this.CACHE_MAX_SIZE) {
      this.cleanupCache();
    }
  }

  /**
   * Get cached data
   */
  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.data;
  }

  /**
   * Remove cached data
   */
  removeCache(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const entriesToRemove: string[] = [];

    // Find expired entries
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_TTL) {
        entriesToRemove.push(key);
      }
    });

    // If not enough expired entries, remove least recently used
    if (entriesToRemove.length < this.CLEANUP_BATCH_SIZE && this.cache.size > this.CACHE_MAX_SIZE) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

      const additionalToRemove = this.CLEANUP_BATCH_SIZE - entriesToRemove.length;
      for (let i = 0; i < additionalToRemove && i < sortedEntries.length; i++) {
        entriesToRemove.push(sortedEntries[i][0]);
      }
    }

    // Remove entries
    entriesToRemove.forEach(key => this.cache.delete(key));

    if (entriesToRemove.length > 0) {
      console.log(`Cleaned up ${entriesToRemove.length} cache entries`);
    }
  }

  /**
   * Estimate the memory size of an object
   */
  private estimateSize(obj: any): number {
    try {
      // Simple estimation based on JSON string length
      const jsonString = JSON.stringify(obj);
      return jsonString.length * 2; // Rough estimate for UTF-16 encoding
    } catch (error) {
      // Fallback for objects that can't be serialized
      return 1000; // Default estimate
    }
  }

  /**
   * Register cleanup callback
   */
  registerCleanupCallback(callback: () => void): () => void {
    this.cleanupCallbacks.add(callback);
    
    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  /**
   * Register memory observer
   */
  registerMemoryObserver(observer: (metrics: MemoryMetrics) => void): () => void {
    this.observers.add(observer);
    
    // Return unregister function
    return () => {
      this.observers.delete(observer);
    };
  }

  /**
   * Perform standard cleanup
   */
  performCleanup(): void {
    console.log('Performing memory cleanup...');
    
    // Clean up cache
    this.cleanupCache();
    
    // Call registered cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in cleanup callback:', error);
      }
    });

    // Suggest garbage collection if available
    this.suggestGarbageCollection();
  }

  /**
   * Perform aggressive cleanup for critical memory situations
   */
  performAggressiveCleanup(): void {
    console.log('Performing aggressive memory cleanup...');
    
    // Clear all cache
    this.clearCache();
    
    // Call all cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in cleanup callback:', error);
      }
    });

    // Force garbage collection if available
    this.forceGarbageCollection();
  }

  /**
   * Suggest garbage collection (if available)
   */
  private suggestGarbageCollection(): void {
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
        this.gcCount++;
        this.lastGcTime = Date.now();
        console.log('Garbage collection suggested');
      } catch (error) {
        // GC not available or failed
      }
    }
  }

  /**
   * Force garbage collection (development only)
   */
  private forceGarbageCollection(): void {
    if (process.env.NODE_ENV === 'development') {
      this.suggestGarbageCollection();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    totalSize: number;
    hitRate: number;
    oldestEntry: number;
  } {
    let totalSize = 0;
    let totalAccesses = 0;
    let totalHits = 0;
    let oldestTimestamp = Date.now();

    this.cache.forEach(entry => {
      totalSize += entry.size;
      totalAccesses++;
      totalHits += entry.accessCount;
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    });

    return {
      size: this.cache.size,
      totalSize,
      hitRate: totalAccesses > 0 ? totalHits / totalAccesses : 0,
      oldestEntry: Date.now() - oldestTimestamp,
    };
  }

  /**
   * Create a weak reference manager for DOM elements
   */
  createWeakRefManager<T extends object>(): {
    add: (key: string, obj: T) => void;
    get: (key: string) => T | undefined;
    delete: (key: string) => boolean;
    cleanup: () => void;
  } {
    const weakRefs = new Map<string, WeakRef<T>>();
    const registry = new FinalizationRegistry((key: string) => {
      weakRefs.delete(key);
    });

    return {
      add: (key: string, obj: T) => {
        const ref = new WeakRef(obj);
        weakRefs.set(key, ref);
        registry.register(obj, key);
      },
      
      get: (key: string) => {
        const ref = weakRefs.get(key);
        if (ref) {
          const obj = ref.deref();
          if (obj === undefined) {
            weakRefs.delete(key);
          }
          return obj;
        }
        return undefined;
      },
      
      delete: (key: string) => {
        return weakRefs.delete(key);
      },
      
      cleanup: () => {
        // Remove dead references
        const keysToDelete: string[] = [];
        weakRefs.forEach((ref, key) => {
          if (ref.deref() === undefined) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach(key => weakRefs.delete(key));
      }
    };
  }

  /**
   * Monitor memory usage for a specific operation
   */
  async monitorOperation<T>(
    operation: () => Promise<T> | T,
    operationName: string
  ): Promise<T> {
    const startMetrics = this.getMemoryMetrics();
    const startTime = performance.now();

    try {
      const result = await operation();
      
      const endMetrics = this.getMemoryMetrics();
      const endTime = performance.now();
      
      const memoryDelta = endMetrics.heapUsed - startMetrics.heapUsed;
      const duration = endTime - startTime;
      
      console.log(`Operation "${operationName}" completed:`, {
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta: `${(memoryDelta / 1024).toFixed(2)}KB`,
        finalMemory: `${(endMetrics.heapUsed / (1024 * 1024)).toFixed(2)}MB`
      });
      
      return result;
    } catch (error) {
      const endMetrics = this.getMemoryMetrics();
      const endTime = performance.now();
      
      console.error(`Operation "${operationName}" failed:`, {
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        memoryDelta: `${((endMetrics.heapUsed - startMetrics.heapUsed) / 1024).toFixed(2)}KB`,
        error
      });
      
      throw error;
    }
  }

  /**
   * Update memory thresholds
   */
  setThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.clearCache();
    this.cleanupCallbacks.clear();
    this.observers.clear();
  }
}

// Singleton instance
export const memoryManager = new MemoryManager();