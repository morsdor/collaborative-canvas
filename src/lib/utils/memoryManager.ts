/**
 * Memory management utilities for the collaborative canvas
 * Helps prevent memory leaks and manage cleanup of subscriptions
 */

export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupFunctions: Map<string, (() => void)[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private observers: Map<string, any[]> = new Map();

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Register a cleanup function for a specific context
   */
  registerCleanup(context: string, cleanup: () => void): void {
    if (!this.cleanupFunctions.has(context)) {
      this.cleanupFunctions.set(context, []);
    }
    this.cleanupFunctions.get(context)!.push(cleanup);
  }

  /**
   * Register a timer for cleanup
   */
  registerTimer(context: string, timer: NodeJS.Timeout): void {
    // Clear existing timer if any
    this.clearTimer(context);
    this.timers.set(context, timer);
  }

  /**
   * Register an observer for cleanup
   */
  registerObserver(context: string, observer: any): void {
    if (!this.observers.has(context)) {
      this.observers.set(context, []);
    }
    this.observers.get(context)!.push(observer);
  }

  /**
   * Clear a specific timer
   */
  clearTimer(context: string): void {
    const timer = this.timers.get(context);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(context);
    }
  }

  /**
   * Clean up all resources for a specific context
   */
  cleanup(context: string): void {
    // Run cleanup functions
    const cleanups = this.cleanupFunctions.get(context);
    if (cleanups) {
      cleanups.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn(`Cleanup error for context ${context}:`, error);
        }
      });
      this.cleanupFunctions.delete(context);
    }

    // Clear timers
    this.clearTimer(context);

    // Clear observers
    this.observers.delete(context);
  }

  /**
   * Clean up all resources
   */
  cleanupAll(): void {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Run all cleanup functions
    this.cleanupFunctions.forEach((cleanups, context) => {
      cleanups.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn(`Cleanup error for context ${context}:`, error);
        }
      });
    });
    this.cleanupFunctions.clear();

    // Clear observers
    this.observers.clear();
  }

  /**
   * Get memory usage statistics
   */
  getStats(): {
    contexts: number;
    cleanupFunctions: number;
    timers: number;
    observers: number;
  } {
    let totalCleanupFunctions = 0;
    this.cleanupFunctions.forEach(cleanups => {
      totalCleanupFunctions += cleanups.length;
    });

    let totalObservers = 0;
    this.observers.forEach(observers => {
      totalObservers += observers.length;
    });

    return {
      contexts: this.cleanupFunctions.size,
      cleanupFunctions: totalCleanupFunctions,
      timers: this.timers.size,
      observers: totalObservers,
    };
  }
}

/**
 * Hook for automatic cleanup on component unmount
 */
export const useMemoryManager = (context: string) => {
  const memoryManager = MemoryManager.getInstance();

  const registerCleanup = (cleanup: () => void) => {
    memoryManager.registerCleanup(context, cleanup);
  };

  const registerTimer = (timer: NodeJS.Timeout) => {
    memoryManager.registerTimer(context, timer);
  };

  const registerObserver = (observer: any) => {
    memoryManager.registerObserver(context, observer);
  };

  // Cleanup on unmount
  const cleanup = () => {
    memoryManager.cleanup(context);
  };

  return {
    registerCleanup,
    registerTimer,
    registerObserver,
    cleanup,
  };
};

/**
 * Debounce utility with automatic cleanup
 */
export const createDebouncedFunction = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  context: string
): T => {
  const memoryManager = MemoryManager.getInstance();
  let timeoutId: NodeJS.Timeout;

  const debouncedFunction = ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
    memoryManager.registerTimer(`${context}-debounce`, timeoutId);
  }) as T;

  return debouncedFunction;
};

/**
 * Throttle utility with automatic cleanup
 */
export const createThrottledFunction = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  context: string
): T => {
  const memoryManager = MemoryManager.getInstance();
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout;

  const throttledFunction = ((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - (now - lastCall));
      memoryManager.registerTimer(`${context}-throttle`, timeoutId);
    }
  }) as T;

  return throttledFunction;
};