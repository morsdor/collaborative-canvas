import { useEffect, useCallback, useState, useRef } from 'react';
import { 
  ErrorManager, 
  ErrorReport, 
  CanvasError, 
  ErrorType, 
  ErrorSeverity,
  getErrorManager,
  createValidationError,
  createNetworkError,
  createSyncError,
  createPerformanceError,
  createStorageError,
} from '@/lib/errors';

interface UseErrorHandlerOptions {
  onError?: (error: ErrorReport) => void;
  onRecovery?: (error: ErrorReport) => void;
  autoResolveAfter?: number; // Auto-resolve errors after X milliseconds
  maxDisplayedErrors?: number;
}

interface ErrorHandlerReturn {
  errors: ErrorReport[];
  errorStats: {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    resolved: number;
    unresolved: number;
  };
  handleError: (error: CanvasError | Error) => ErrorReport;
  createValidationError: (message: string, context?: any) => CanvasError;
  createNetworkError: (message: string, context?: any) => CanvasError;
  createSyncError: (message: string, context?: any) => CanvasError;
  createPerformanceError: (message: string, context?: any) => CanvasError;
  createStorageError: (message: string, context?: any) => CanvasError;
  markErrorResolved: (id: string) => void;
  clearErrors: () => void;
  clearResolvedErrors: () => void;
  retryOperation: (errorId: string, operation: () => Promise<void>) => Promise<boolean>;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}): ErrorHandlerReturn => {
  const errorManagerRef = useRef<ErrorManager | null>(null);
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [errorStats, setErrorStats] = useState({
    total: 0,
    byType: {} as Record<ErrorType, number>,
    bySeverity: {} as Record<ErrorSeverity, number>,
    resolved: 0,
    unresolved: 0,
  });

  const autoResolveTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initialize error manager
  useEffect(() => {
    if (!errorManagerRef.current) {
      errorManagerRef.current = getErrorManager();
    }

    const errorManager = errorManagerRef.current;

    // Set up error listener
    const unsubscribe = errorManager.onError((error) => {
      // Update state
      updateErrorState();

      // Call user callback
      if (options.onError) {
        options.onError(error);
      }

      // Set up auto-resolve timer if configured
      if (options.autoResolveAfter && options.autoResolveAfter > 0) {
        const timer = setTimeout(() => {
          errorManager.markErrorResolved(error.id);
          autoResolveTimersRef.current.delete(error.id);
          updateErrorState();
        }, options.autoResolveAfter);

        autoResolveTimersRef.current.set(error.id, timer);
      }
    });

    // Initial state update
    updateErrorState();

    return () => {
      unsubscribe();
      // Clear all auto-resolve timers
      autoResolveTimersRef.current.forEach(timer => clearTimeout(timer));
      autoResolveTimersRef.current.clear();
    };
  }, [options.onError, options.autoResolveAfter]);

  const updateErrorState = useCallback(() => {
    if (!errorManagerRef.current) return;

    const allErrors = errorManagerRef.current.getErrors();
    const stats = errorManagerRef.current.getErrorStats();

    // Limit displayed errors if configured
    const displayedErrors = options.maxDisplayedErrors 
      ? allErrors.slice(0, options.maxDisplayedErrors)
      : allErrors;

    setErrors(displayedErrors);
    setErrorStats(stats);
  }, [options.maxDisplayedErrors]);

  // Error handling function
  const handleError = useCallback((error: CanvasError | Error): ErrorReport => {
    if (!errorManagerRef.current) {
      throw new Error('Error manager not initialized');
    }

    return errorManagerRef.current.handleError(error);
  }, []);

  // Error creation helpers
  const createValidationErrorHelper = useCallback((message: string, context?: any) => {
    return createValidationError(message, context);
  }, []);

  const createNetworkErrorHelper = useCallback((message: string, context?: any) => {
    return createNetworkError(message, context);
  }, []);

  const createSyncErrorHelper = useCallback((message: string, context?: any) => {
    return createSyncError(message, context);
  }, []);

  const createPerformanceErrorHelper = useCallback((message: string, context?: any) => {
    return createPerformanceError(message, context);
  }, []);

  const createStorageErrorHelper = useCallback((message: string, context?: any) => {
    return createStorageError(message, context);
  }, []);

  // Error management functions
  const markErrorResolved = useCallback((id: string) => {
    if (!errorManagerRef.current) return;

    // Clear auto-resolve timer if it exists
    const timer = autoResolveTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      autoResolveTimersRef.current.delete(id);
    }

    errorManagerRef.current.markErrorResolved(id);
    updateErrorState();

    // Call recovery callback if provided
    const error = errorManagerRef.current.getErrorById(id);
    if (error && options.onRecovery) {
      options.onRecovery(error);
    }
  }, [options.onRecovery, updateErrorState]);

  const clearErrors = useCallback(() => {
    if (!errorManagerRef.current) return;

    // Clear all auto-resolve timers
    autoResolveTimersRef.current.forEach(timer => clearTimeout(timer));
    autoResolveTimersRef.current.clear();

    errorManagerRef.current.clearErrors();
    updateErrorState();
  }, [updateErrorState]);

  const clearResolvedErrors = useCallback(() => {
    if (!errorManagerRef.current) return;

    errorManagerRef.current.clearResolvedErrors();
    updateErrorState();
  }, [updateErrorState]);

  // Retry operation with error handling
  const retryOperation = useCallback(async (errorId: string, operation: () => Promise<void>): Promise<boolean> => {
    if (!errorManagerRef.current) return false;

    const error = errorManagerRef.current.getErrorById(errorId);
    if (!error) return false;

    try {
      await operation();
      markErrorResolved(errorId);
      return true;
    } catch (retryError) {
      // Handle the retry error
      const newError = retryError instanceof CanvasError 
        ? retryError 
        : new CanvasError(
            `Retry failed: ${retryError instanceof Error ? retryError.message : String(retryError)}`,
            error.type,
            error.severity,
            { ...error.context, operation: 'retry' }
          );

      handleError(newError);
      return false;
    }
  }, [handleError, markErrorResolved]);

  return {
    errors,
    errorStats,
    handleError,
    createValidationError: createValidationErrorHelper,
    createNetworkError: createNetworkErrorHelper,
    createSyncError: createSyncErrorHelper,
    createPerformanceError: createPerformanceErrorHelper,
    createStorageError: createStorageErrorHelper,
    markErrorResolved,
    clearErrors,
    clearResolvedErrors,
    retryOperation,
  };
};

// Hook for performance monitoring with error handling
export const usePerformanceMonitor = (thresholds: {
  frameTime?: number;
  memoryUsage?: number;
  renderTime?: number;
} = {}) => {
  const { handleError, createPerformanceError } = useErrorHandler();
  const frameTimeRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());

  const defaultThresholds = {
    frameTime: 16.67, // 60fps = 16.67ms per frame
    memoryUsage: 100 * 1024 * 1024, // 100MB
    renderTime: 50, // 50ms
    ...thresholds,
  };

  const monitorFrameRate = useCallback(() => {
    const now = performance.now();
    const frameTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    frameTimeRef.current.push(frameTime);
    
    // Keep only last 60 frames (1 second at 60fps)
    if (frameTimeRef.current.length > 60) {
      frameTimeRef.current.shift();
    }

    // Check if frame time exceeds threshold
    if (frameTime > defaultThresholds.frameTime * 2) { // Allow 2x threshold before error
      const avgFrameTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
      
      if (avgFrameTime > defaultThresholds.frameTime * 1.5) {
        const error = createPerformanceError(
          `Poor frame rate detected: ${Math.round(1000 / avgFrameTime)}fps (target: ${Math.round(1000 / defaultThresholds.frameTime)}fps)`,
          {
            additionalData: {
              currentFrameTime: frameTime,
              averageFrameTime: avgFrameTime,
              targetFrameTime: defaultThresholds.frameTime,
            },
          }
        );
        handleError(error);
      }
    }
  }, [handleError, createPerformanceError, defaultThresholds.frameTime]);

  const monitorMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      if (memory.usedJSHeapSize > defaultThresholds.memoryUsage!) {
        const error = createPerformanceError(
          `High memory usage detected: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
          {
            additionalData: {
              usedJSHeapSize: memory.usedJSHeapSize,
              totalJSHeapSize: memory.totalJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit,
              threshold: defaultThresholds.memoryUsage,
            },
          }
        );
        handleError(error);
      }
    }
  }, [handleError, createPerformanceError, defaultThresholds.memoryUsage]);

  const measureRenderTime = useCallback((renderFn: () => void): number => {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    const renderTime = end - start;

    if (renderTime > defaultThresholds.renderTime!) {
      const error = createPerformanceError(
        `Slow render detected: ${Math.round(renderTime)}ms (threshold: ${defaultThresholds.renderTime}ms)`,
        {
          additionalData: {
            renderTime,
            threshold: defaultThresholds.renderTime,
          },
        }
      );
      handleError(error);
    }

    return renderTime;
  }, [handleError, createPerformanceError, defaultThresholds.renderTime]);

  // Set up automatic monitoring
  useEffect(() => {
    let frameId: number;
    let memoryInterval: NodeJS.Timeout;

    const animate = () => {
      monitorFrameRate();
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    memoryInterval = setInterval(monitorMemoryUsage, 5000); // Check memory every 5 seconds

    return () => {
      cancelAnimationFrame(frameId);
      clearInterval(memoryInterval);
    };
  }, [monitorFrameRate, monitorMemoryUsage]);

  return {
    measureRenderTime,
    getCurrentFrameRate: () => {
      if (frameTimeRef.current.length === 0) return 0;
      const avgFrameTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
      return Math.round(1000 / avgFrameTime);
    },
  };
};