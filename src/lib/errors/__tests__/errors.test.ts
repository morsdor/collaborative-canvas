import {
  CanvasError,
  ValidationError,
  NetworkError,
  SyncError,
  PerformanceError,
  StorageError,
  ErrorManager,
  ErrorType,
  ErrorSeverity,
  NetworkRecoveryStrategy,
  ValidationRecoveryStrategy,
  SyncRecoveryStrategy,
} from '../index';

describe('CanvasError', () => {
  it('should create error with default values', () => {
    const error = new CanvasError('Test error');
    
    expect(error.message).toBe('Test error');
    expect(error.type).toBe(ErrorType.UNKNOWN);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.retryCount).toBe(0);
    expect(error.context.timestamp).toBeCloseTo(Date.now(), -2);
  });

  it('should create error with custom values', () => {
    const context = { userId: 'user-1', operation: 'test' };
    const error = new CanvasError(
      'Custom error',
      ErrorType.VALIDATION,
      ErrorSeverity.HIGH,
      context
    );
    
    expect(error.type).toBe(ErrorType.VALIDATION);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.context.userId).toBe('user-1');
    expect(error.context.operation).toBe('test');
  });

  it('should generate error report', () => {
    const error = new CanvasError('Test error');
    const report = error.toReport();
    
    expect(report.id).toBe(error.id);
    expect(report.message).toBe('Test error');
    expect(report.type).toBe(ErrorType.UNKNOWN);
    expect(report.severity).toBe(ErrorSeverity.MEDIUM);
    expect(report.resolved).toBe(false);
    expect(report.retryCount).toBe(0);
  });
});

describe('Specific Error Classes', () => {
  it('should create ValidationError', () => {
    const error = new ValidationError('Invalid input');
    
    expect(error.type).toBe(ErrorType.VALIDATION);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.name).toBe('ValidationError');
  });

  it('should create NetworkError', () => {
    const error = new NetworkError('Connection failed');
    
    expect(error.type).toBe(ErrorType.NETWORK);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.name).toBe('NetworkError');
  });

  it('should create SyncError', () => {
    const error = new SyncError('Sync failed');
    
    expect(error.type).toBe(ErrorType.SYNC);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.name).toBe('SyncError');
  });

  it('should create PerformanceError', () => {
    const error = new PerformanceError('Slow operation');
    
    expect(error.type).toBe(ErrorType.PERFORMANCE);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.name).toBe('PerformanceError');
  });

  it('should create StorageError', () => {
    const error = new StorageError('Storage failed');
    
    expect(error.type).toBe(ErrorType.STORAGE);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.name).toBe('StorageError');
  });
});

describe('Recovery Strategies', () => {
  describe('NetworkRecoveryStrategy', () => {
    let strategy: NetworkRecoveryStrategy;

    beforeEach(() => {
      strategy = new NetworkRecoveryStrategy();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should recover network errors within retry limit', () => {
      const error = new NetworkError('Connection failed');
      
      expect(strategy.canRecover(error)).toBe(true);
    });

    it('should not recover non-network errors', () => {
      const error = new ValidationError('Invalid input');
      
      expect(strategy.canRecover(error)).toBe(false);
    });

    it('should not recover after max retries', () => {
      const error = new NetworkError('Connection failed');
      error.retryCount = 5;
      
      expect(strategy.canRecover(error)).toBe(false);
    });

    it('should implement exponential backoff', async () => {
      const error = new NetworkError('Connection failed');
      
      const promise = strategy.recover(error);
      
      expect(error.retryCount).toBe(0);
      
      jest.advanceTimersByTime(1000);
      
      const result = await promise;
      expect(result).toBe(true);
      expect(error.retryCount).toBe(1);
    });
  });

  describe('ValidationRecoveryStrategy', () => {
    let strategy: ValidationRecoveryStrategy;

    beforeEach(() => {
      strategy = new ValidationRecoveryStrategy();
    });

    it('should handle validation errors', () => {
      const error = new ValidationError('Invalid input');
      
      expect(strategy.canRecover(error)).toBe(true);
    });

    it('should not auto-recover validation errors', async () => {
      const error = new ValidationError('Invalid input');
      
      const result = await strategy.recover(error);
      expect(result).toBe(false);
      expect(error.retryCount).toBe(1);
    });
  });

  describe('SyncRecoveryStrategy', () => {
    let strategy: SyncRecoveryStrategy;

    beforeEach(() => {
      strategy = new SyncRecoveryStrategy();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should recover sync errors', () => {
      const error = new SyncError('Sync failed');
      
      expect(strategy.canRecover(error)).toBe(true);
    });

    it('should implement backoff for sync errors', async () => {
      const error = new SyncError('Sync failed');
      
      const promise = strategy.recover(error);
      
      jest.advanceTimersByTime(500);
      
      const result = await promise;
      expect(result).toBe(true);
      expect(error.retryCount).toBe(1);
    });
  });
});

describe('ErrorManager', () => {
  let errorManager: ErrorManager;

  beforeEach(() => {
    errorManager = new ErrorManager();
  });

  afterEach(() => {
    errorManager.destroy();
  });

  describe('error handling', () => {
    it('should handle CanvasError', () => {
      const error = new ValidationError('Test error');
      const report = errorManager.handleError(error);
      
      expect(report.id).toBe(error.id);
      expect(report.type).toBe(ErrorType.VALIDATION);
      expect(report.message).toBe('Test error');
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');
      const report = errorManager.handleError(error);
      
      expect(report.type).toBe(ErrorType.UNKNOWN);
      expect(report.message).toBe('Generic error');
    });

    it('should store errors', () => {
      const error = new ValidationError('Test error');
      errorManager.handleError(error);
      
      const errors = errorManager.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].id).toBe(error.id);
    });

    it('should limit stored errors', () => {
      // Create more errors than the limit
      for (let i = 0; i < 150; i++) {
        const error = new ValidationError(`Error ${i}`);
        errorManager.handleError(error);
      }
      
      const errors = errorManager.getErrors();
      expect(errors.length).toBeLessThanOrEqual(100);
    });

    it('should notify listeners', () => {
      const listener = jest.fn();
      errorManager.onError(listener);
      
      const error = new ValidationError('Test error');
      errorManager.handleError(error);
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test error',
        type: ErrorType.VALIDATION,
      }));
    });
  });

  describe('error management', () => {
    beforeEach(() => {
      // Add some test errors
      errorManager.handleError(new ValidationError('Error 1'));
      errorManager.handleError(new NetworkError('Error 2'));
      errorManager.handleError(new SyncError('Error 3'));
    });

    it('should get error by ID', () => {
      const errors = errorManager.getErrors();
      const firstError = errors[0];
      
      const retrieved = errorManager.getErrorById(firstError.id);
      expect(retrieved).toEqual(firstError);
    });

    it('should mark error as resolved', () => {
      const errors = errorManager.getErrors();
      const errorId = errors[0].id;
      
      const result = errorManager.markErrorResolved(errorId);
      expect(result).toBe(true);
      
      const resolvedError = errorManager.getErrorById(errorId);
      expect(resolvedError?.resolved).toBe(true);
    });

    it('should clear all errors', () => {
      errorManager.clearErrors();
      
      const errors = errorManager.getErrors();
      expect(errors).toHaveLength(0);
    });

    it('should clear only resolved errors', () => {
      const errors = errorManager.getErrors();
      errorManager.markErrorResolved(errors[0].id);
      
      errorManager.clearResolvedErrors();
      
      const remainingErrors = errorManager.getErrors();
      expect(remainingErrors).toHaveLength(2);
      expect(remainingErrors.every(e => !e.resolved)).toBe(true);
    });

    it('should generate error statistics', () => {
      const stats = errorManager.getErrorStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byType[ErrorType.VALIDATION]).toBe(1);
      expect(stats.byType[ErrorType.NETWORK]).toBe(1);
      expect(stats.byType[ErrorType.SYNC]).toBe(1);
      expect(stats.unresolved).toBe(3);
      expect(stats.resolved).toBe(0);
    });
  });

  describe('recovery', () => {
    it('should attempt recovery for recoverable errors', async () => {
      const mockStrategy = {
        canRecover: jest.fn().mockReturnValue(true),
        recover: jest.fn().mockResolvedValue(true),
        maxRetries: 3,
      };
      
      errorManager.addRecoveryStrategy(mockStrategy);
      
      const error = new NetworkError('Test error');
      
      // Handle error and wait for async recovery
      const promise = errorManager.handleError(error);
      
      // Wait for all async operations to complete
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockStrategy.canRecover).toHaveBeenCalledWith(error);
      expect(mockStrategy.recover).toHaveBeenCalledWith(error);
    });

    it('should handle recovery failures gracefully', async () => {
      const mockStrategy = {
        canRecover: jest.fn().mockReturnValue(true),
        recover: jest.fn().mockRejectedValue(new Error('Recovery failed')),
        maxRetries: 3,
      };
      
      errorManager.addRecoveryStrategy(mockStrategy);
      
      const error = new NetworkError('Test error');
      
      // Should not throw
      expect(() => errorManager.handleError(error)).not.toThrow();
    });
  });

  describe('listener management', () => {
    it('should add and remove listeners', () => {
      const listener = jest.fn();
      const unsubscribe = errorManager.onError(listener);
      
      const error = new ValidationError('Test error');
      errorManager.handleError(error);
      
      expect(listener).toHaveBeenCalled();
      
      unsubscribe();
      listener.mockClear();
      
      errorManager.handleError(new ValidationError('Another error'));
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const badListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      errorManager.onError(badListener);
      
      // Should not throw
      expect(() => {
        errorManager.handleError(new ValidationError('Test error'));
      }).not.toThrow();
    });
  });
});