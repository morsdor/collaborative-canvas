// Error types and classes for the collaborative canvas application

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  SYNC = 'SYNC',
  PERFORMANCE = 'PERFORMANCE',
  STORAGE = 'STORAGE',
  AUTHENTICATION = 'AUTHENTICATION',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  shapeId?: string;
  groupId?: string;
  operation?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: ErrorContext;
  resolved: boolean;
  retryCount: number;
  lastRetry?: number;
}

export class CanvasError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly id: string;
  public retryCount: number = 0;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {}
  ) {
    super(message);
    this.name = 'CanvasError';
    this.type = type;
    this.severity = severity;
    this.id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.context = {
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...context,
    };
  }

  toReport(): ErrorReport {
    return {
      id: this.id,
      type: this.type,
      severity: this.severity,
      message: this.message,
      stack: this.stack,
      context: this.context,
      resolved: false,
      retryCount: this.retryCount,
      lastRetry: this.retryCount > 0 ? Date.now() : undefined,
    };
  }
}

// Specific error classes
export class ValidationError extends CanvasError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.VALIDATION, ErrorSeverity.MEDIUM, context);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends CanvasError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.NETWORK, ErrorSeverity.HIGH, context);
    this.name = 'NetworkError';
  }
}

export class SyncError extends CanvasError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.SYNC, ErrorSeverity.HIGH, context);
    this.name = 'SyncError';
  }
}

export class PerformanceError extends CanvasError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.PERFORMANCE, ErrorSeverity.MEDIUM, context);
    this.name = 'PerformanceError';
  }
}

export class StorageError extends CanvasError {
  constructor(message: string, context: Partial<ErrorContext> = {}) {
    super(message, ErrorType.STORAGE, ErrorSeverity.MEDIUM, context);
    this.name = 'StorageError';
  }
}

// Error recovery strategies
export interface RecoveryStrategy {
  canRecover(error: CanvasError): boolean;
  recover(error: CanvasError): Promise<boolean>;
  maxRetries: number;
}

export class NetworkRecoveryStrategy implements RecoveryStrategy {
  maxRetries = 3;

  canRecover(error: CanvasError): boolean {
    return error.type === ErrorType.NETWORK && error.retryCount < this.maxRetries;
  }

  async recover(error: CanvasError): Promise<boolean> {
    if (!this.canRecover(error)) {
      return false;
    }

    // Wait with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, error.retryCount), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));

    error.retryCount++;
    return true;
  }
}

export class ValidationRecoveryStrategy implements RecoveryStrategy {
  maxRetries = 1;

  canRecover(error: CanvasError): boolean {
    return error.type === ErrorType.VALIDATION && error.retryCount < this.maxRetries;
  }

  async recover(error: CanvasError): Promise<boolean> {
    if (!this.canRecover(error)) {
      return false;
    }

    // For validation errors, we typically can't auto-recover
    // but we can sanitize data and try once more
    error.retryCount++;
    return false; // Usually requires user intervention
  }
}

export class SyncRecoveryStrategy implements RecoveryStrategy {
  maxRetries = 5;

  canRecover(error: CanvasError): boolean {
    return error.type === ErrorType.SYNC && error.retryCount < this.maxRetries;
  }

  async recover(error: CanvasError): Promise<boolean> {
    if (!this.canRecover(error)) {
      return false;
    }

    // Wait before retrying sync
    const delay = Math.min(500 * Math.pow(1.5, error.retryCount), 5000);
    await new Promise(resolve => setTimeout(resolve, delay));

    error.retryCount++;
    return true;
  }
}

// Error manager class
export class ErrorManager {
  private errors: Map<string, ErrorReport> = new Map();
  private listeners: ((error: ErrorReport) => void)[] = [];
  private recoveryStrategies: RecoveryStrategy[] = [];
  private maxStoredErrors = 100;

  constructor() {
    this.recoveryStrategies = [
      new NetworkRecoveryStrategy(),
      new ValidationRecoveryStrategy(),
      new SyncRecoveryStrategy(),
    ];

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers() {
    if (typeof window !== 'undefined') {
      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        const error = new CanvasError(
          `Unhandled promise rejection: ${event.reason}`,
          ErrorType.UNKNOWN,
          ErrorSeverity.HIGH,
          { additionalData: { reason: event.reason } }
        );
        this.handleError(error);
      });

      // Handle JavaScript errors
      window.addEventListener('error', (event) => {
        const error = new CanvasError(
          event.message,
          ErrorType.UNKNOWN,
          ErrorSeverity.HIGH,
          {
            additionalData: {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            },
          }
        );
        this.handleError(error);
      });
    }
  }

  handleError(error: CanvasError | Error): ErrorReport {
    let canvasError: CanvasError;

    if (error instanceof CanvasError) {
      canvasError = error;
    } else {
      canvasError = new CanvasError(
        error.message,
        ErrorType.UNKNOWN,
        ErrorSeverity.MEDIUM,
        { additionalData: { originalError: error.name } }
      );
      canvasError.stack = error.stack;
    }

    const report = canvasError.toReport();
    
    // Store the error
    this.errors.set(report.id, report);
    
    // Limit stored errors to prevent memory issues
    if (this.errors.size > this.maxStoredErrors) {
      const oldestKey = this.errors.keys().next().value;
      this.errors.delete(oldestKey);
    }

    // Notify listeners
    this.notifyListeners(report);

    // Attempt recovery
    this.attemptRecovery(canvasError);

    // Log error for debugging
    this.logError(report);

    return report;
  }

  private async attemptRecovery(error: CanvasError): Promise<boolean> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error)) {
        try {
          const recovered = await strategy.recover(error);
          if (recovered) {
            console.log(`Successfully recovered from error: ${error.message}`);
            return true;
          }
        } catch (recoveryError) {
          console.error('Error during recovery attempt:', recoveryError);
        }
      }
    }
    return false;
  }

  private notifyListeners(report: ErrorReport) {
    this.listeners.forEach(listener => {
      try {
        listener(report);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  private logError(report: ErrorReport) {
    const logLevel = this.getLogLevel(report.severity);
    const message = `[${report.type}] ${report.message}`;
    
    switch (logLevel) {
      case 'error':
        console.error(message, report);
        break;
      case 'warn':
        console.warn(message, report);
        break;
      case 'info':
        console.info(message, report);
        break;
      default:
        console.log(message, report);
    }
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' | 'log' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  onError(listener: (error: ErrorReport) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getErrors(): ErrorReport[] {
    return Array.from(this.errors.values()).sort((a, b) => b.context.timestamp - a.context.timestamp);
  }

  getErrorById(id: string): ErrorReport | undefined {
    return this.errors.get(id);
  }

  markErrorResolved(id: string): boolean {
    const error = this.errors.get(id);
    if (error) {
      error.resolved = true;
      return true;
    }
    return false;
  }

  clearErrors(): void {
    this.errors.clear();
  }

  clearResolvedErrors(): void {
    for (const [id, error] of this.errors.entries()) {
      if (error.resolved) {
        this.errors.delete(id);
      }
    }
  }

  getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    resolved: number;
    unresolved: number;
  } {
    const errors = this.getErrors();
    const stats = {
      total: errors.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      resolved: 0,
      unresolved: 0,
    };

    // Initialize counters
    Object.values(ErrorType).forEach(type => {
      stats.byType[type] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // Count errors
    errors.forEach(error => {
      stats.byType[error.type]++;
      stats.bySeverity[error.severity]++;
      if (error.resolved) {
        stats.resolved++;
      } else {
        stats.unresolved++;
      }
    });

    return stats;
  }

  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  destroy(): void {
    this.listeners = [];
    this.errors.clear();
    this.recoveryStrategies = [];
  }
}

// Singleton instance
let errorManagerInstance: ErrorManager | null = null;

export const getErrorManager = (): ErrorManager => {
  if (!errorManagerInstance) {
    errorManagerInstance = new ErrorManager();
  }
  return errorManagerInstance;
};

export const destroyErrorManager = () => {
  if (errorManagerInstance) {
    errorManagerInstance.destroy();
    errorManagerInstance = null;
  }
};

// Utility functions for common error scenarios
export const createValidationError = (message: string, context?: Partial<ErrorContext>) => {
  return new ValidationError(message, context);
};

export const createNetworkError = (message: string, context?: Partial<ErrorContext>) => {
  return new NetworkError(message, context);
};

export const createSyncError = (message: string, context?: Partial<ErrorContext>) => {
  return new SyncError(message, context);
};

export const createPerformanceError = (message: string, context?: Partial<ErrorContext>) => {
  return new PerformanceError(message, context);
};

export const createStorageError = (message: string, context?: Partial<ErrorContext>) => {
  return new StorageError(message, context);
};