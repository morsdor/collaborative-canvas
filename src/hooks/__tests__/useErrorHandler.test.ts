import { renderHook, act } from '@testing-library/react';
import { useErrorHandler, usePerformanceMonitor } from '../useErrorHandler';
import { CanvasError, ErrorType, ErrorSeverity } from '@/lib/errors';

// Mock the error manager
const mockErrorManager = {
  onError: jest.fn(() => jest.fn()),
  handleError: jest.fn(),
  getErrors: jest.fn(() => []),
  getErrorStats: jest.fn(() => ({
    total: 0,
    byType: {},
    bySeverity: {},
    resolved: 0,
    unresolved: 0,
  })),
  markErrorResolved: jest.fn(),
  clearErrors: jest.fn(),
  clearResolvedErrors: jest.fn(),
  getErrorById: jest.fn(),
};

jest.mock('@/lib/errors', () => ({
  ...jest.requireActual('@/lib/errors'),
  getErrorManager: () => mockErrorManager,
}));

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 200 * 1024 * 1024,
    },
  },
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.errors).toEqual([]);
      expect(result.current.errorStats.total).toBe(0);
    });

    it('should set up error listener', () => {
      renderHook(() => useErrorHandler());

      expect(mockErrorManager.onError).toHaveBeenCalled();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();
      renderHook(() => useErrorHandler({ onError }));

      // Simulate error
      const errorCallback = mockErrorManager.onError.mock.calls[0][0];
      const mockError = {
        id: 'error-1',
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Test error',
        context: { timestamp: Date.now() },
        resolved: false,
        retryCount: 0,
      };

      act(() => {
        errorCallback(mockError);
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('error handling', () => {
    it('should handle errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      const error = new CanvasError('Test error');
      const mockReport = {
        id: 'error-1',
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        message: 'Test error',
        context: { timestamp: Date.now() },
        resolved: false,
        retryCount: 0,
      };

      mockErrorManager.handleError.mockReturnValue(mockReport);

      act(() => {
        const report = result.current.handleError(error);
        expect(report).toEqual(mockReport);
      });

      expect(mockErrorManager.handleError).toHaveBeenCalledWith(error);
    });

    it('should create validation errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        const error = result.current.createValidationError('Invalid input', { field: 'name' });
        expect(error.type).toBe(ErrorType.VALIDATION);
        expect(error.message).toBe('Invalid input');
      });
    });

    it('should create network errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        const error = result.current.createNetworkError('Connection failed');
        expect(error.type).toBe(ErrorType.NETWORK);
        expect(error.message).toBe('Connection failed');
      });
    });

    it('should create sync errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        const error = result.current.createSyncError('Sync failed');
        expect(error.type).toBe(ErrorType.SYNC);
        expect(error.message).toBe('Sync failed');
      });
    });

    it('should create performance errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        const error = result.current.createPerformanceError('Slow operation');
        expect(error.type).toBe(ErrorType.PERFORMANCE);
        expect(error.message).toBe('Slow operation');
      });
    });

    it('should create storage errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        const error = result.current.createStorageError('Storage failed');
        expect(error.type).toBe(ErrorType.STORAGE);
        expect(error.message).toBe('Storage failed');
      });
    });
  });

  describe('error management', () => {
    it('should mark errors as resolved', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.markErrorResolved('error-1');
      });

      expect(mockErrorManager.markErrorResolved).toHaveBeenCalledWith('error-1');
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.clearErrors();
      });

      expect(mockErrorManager.clearErrors).toHaveBeenCalled();
    });

    it('should clear resolved errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.clearResolvedErrors();
      });

      expect(mockErrorManager.clearResolvedErrors).toHaveBeenCalled();
    });
  });

  describe('retry operations', () => {
    it('should retry successful operations', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const mockOperation = jest.fn().mockResolvedValue(undefined);
      mockErrorManager.getErrorById.mockReturnValue({
        id: 'error-1',
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.HIGH,
        message: 'Network error',
        context: { timestamp: Date.now() },
        resolved: false,
        retryCount: 0,
      });

      await act(async () => {
        const success = await result.current.retryOperation('error-1', mockOperation);
        expect(success).toBe(true);
      });

      expect(mockOperation).toHaveBeenCalled();
      expect(mockErrorManager.markErrorResolved).toHaveBeenCalledWith('error-1');
    });

    it('should handle retry failures', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const mockOperation = jest.fn().mockRejectedValue(new Error('Retry failed'));
      mockErrorManager.getErrorById.mockReturnValue({
        id: 'error-1',
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.HIGH,
        message: 'Network error',
        context: { timestamp: Date.now() },
        resolved: false,
        retryCount: 0,
      });

      await act(async () => {
        const success = await result.current.retryOperation('error-1', mockOperation);
        expect(success).toBe(false);
      });

      expect(mockOperation).toHaveBeenCalled();
      expect(mockErrorManager.handleError).toHaveBeenCalled();
    });

    it('should return false for non-existent errors', async () => {
      const { result } = renderHook(() => useErrorHandler());

      const mockOperation = jest.fn();
      mockErrorManager.getErrorById.mockReturnValue(undefined);

      await act(async () => {
        const success = await result.current.retryOperation('non-existent', mockOperation);
        expect(success).toBe(false);
      });

      expect(mockOperation).not.toHaveBeenCalled();
    });
  });

  describe('auto-resolve', () => {
    it('should auto-resolve errors after timeout', () => {
      const { result } = renderHook(() => useErrorHandler({ autoResolveAfter: 5000 }));

      // Simulate error
      const errorCallback = mockErrorManager.onError.mock.calls[0][0];
      const mockError = {
        id: 'error-1',
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Test error',
        context: { timestamp: Date.now() },
        resolved: false,
        retryCount: 0,
      };

      act(() => {
        errorCallback(mockError);
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockErrorManager.markErrorResolved).toHaveBeenCalledWith('error-1');
    });

    it('should cancel auto-resolve when manually resolved', () => {
      const { result } = renderHook(() => useErrorHandler({ autoResolveAfter: 5000 }));

      // Simulate error
      const errorCallback = mockErrorManager.onError.mock.calls[0][0];
      const mockError = {
        id: 'error-1',
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Test error',
        context: { timestamp: Date.now() },
        resolved: false,
        retryCount: 0,
      };

      act(() => {
        errorCallback(mockError);
      });

      // Manually resolve before timeout
      act(() => {
        result.current.markErrorResolved('error-1');
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should only be called once (manually)
      expect(mockErrorManager.markErrorResolved).toHaveBeenCalledTimes(1);
    });
  });

  describe('max displayed errors', () => {
    it('should limit displayed errors', () => {
      const mockErrors = Array.from({ length: 10 }, (_, i) => ({
        id: `error-${i}`,
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: `Error ${i}`,
        context: { timestamp: Date.now() },
        resolved: false,
        retryCount: 0,
      }));

      mockErrorManager.getErrors.mockReturnValue(mockErrors);

      const { result } = renderHook(() => useErrorHandler({ maxDisplayedErrors: 5 }));

      expect(result.current.errors).toHaveLength(5);
    });
  });
});

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should monitor frame rate', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    // Simulate some frames
    act(() => {
      jest.advanceTimersByTime(100);
    });

    const frameRate = result.current.getCurrentFrameRate();
    expect(typeof frameRate).toBe('number');
  });

  it('should measure render time', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    const mockRenderFn = jest.fn();
    let renderTime: number;

    act(() => {
      renderTime = result.current.measureRenderTime(mockRenderFn);
    });

    expect(mockRenderFn).toHaveBeenCalled();
    expect(typeof renderTime!).toBe('number');
    expect(renderTime!).toBeGreaterThanOrEqual(0);
  });

  it('should detect slow renders', () => {
    const mockHandleError = jest.fn();
    
    // Mock useErrorHandler to return our mock
    jest.doMock('../useErrorHandler', () => ({
      useErrorHandler: () => ({
        handleError: mockHandleError,
        createPerformanceError: (message: string, context?: any) => 
          new CanvasError(message, ErrorType.PERFORMANCE, ErrorSeverity.MEDIUM, context),
      }),
    }));

    const { result } = renderHook(() => usePerformanceMonitor({ renderTime: 10 }));

    // Mock a slow render function
    const slowRenderFn = jest.fn(() => {
      // Simulate slow operation
      const start = Date.now();
      while (Date.now() - start < 20) {
        // Busy wait
      }
    });

    act(() => {
      result.current.measureRenderTime(slowRenderFn);
    });

    expect(mockHandleError).toHaveBeenCalled();
  });
});