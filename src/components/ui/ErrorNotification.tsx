import React, { useState, useEffect } from 'react';
import { ErrorReport, ErrorType, ErrorSeverity } from '@/lib/errors';
import { Button } from './button';
import { Badge } from './badge';
import { X, AlertTriangle, AlertCircle, Info, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorNotificationProps {
  error: ErrorReport;
  onDismiss?: (errorId: string) => void;
  onRetry?: (errorId: string) => void;
  autoHideAfter?: number;
  showDetails?: boolean;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  onRetry,
  autoHideAfter,
  showDetails = false,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (autoHideAfter && autoHideAfter > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          onDismiss(error.id);
        }
      }, autoHideAfter);

      return () => clearTimeout(timer);
    }
  }, [autoHideAfter, error.id, onDismiss]);

  const getErrorIcon = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return <AlertTriangle className="w-4 h-4" />;
      case ErrorSeverity.MEDIUM:
        return <AlertCircle className="w-4 h-4" />;
      case ErrorSeverity.LOW:
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getErrorColor = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return 'border-red-600 bg-red-50 text-red-800';
      case ErrorSeverity.HIGH:
        return 'border-red-500 bg-red-50 text-red-700';
      case ErrorSeverity.MEDIUM:
        return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      case ErrorSeverity.LOW:
        return 'border-blue-500 bg-blue-50 text-blue-700';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-700';
    }
  };

  const getTypeLabel = () => {
    switch (error.type) {
      case ErrorType.VALIDATION:
        return 'Validation';
      case ErrorType.NETWORK:
        return 'Network';
      case ErrorType.SYNC:
        return 'Sync';
      case ErrorType.PERFORMANCE:
        return 'Performance';
      case ErrorType.STORAGE:
        return 'Storage';
      case ErrorType.AUTHENTICATION:
        return 'Auth';
      default:
        return 'Error';
    }
  };

  const canRetry = () => {
    return error.type === ErrorType.NETWORK || 
           error.type === ErrorType.SYNC || 
           (error.type === ErrorType.STORAGE && error.retryCount < 3);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`border-l-4 rounded-r-lg p-4 mb-2 ${getErrorColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            {getErrorIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {getTypeLabel()}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {error.severity}
              </Badge>
              {error.retryCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  Retry {error.retryCount}
                </Badge>
              )}
            </div>
            
            <p className="text-sm font-medium mb-1">
              {error.message}
            </p>
            
            <p className="text-xs opacity-75">
              {formatTimestamp(error.context.timestamp)}
            </p>

            {showDetails && isExpanded && (
              <div className="mt-3 p-3 bg-white bg-opacity-50 rounded text-xs">
                <div className="space-y-2">
                  {error.context.userId && (
                    <div>
                      <span className="font-medium">User:</span> {error.context.userId}
                    </div>
                  )}
                  {error.context.sessionId && (
                    <div>
                      <span className="font-medium">Session:</span> {error.context.sessionId}
                    </div>
                  )}
                  {error.context.operation && (
                    <div>
                      <span className="font-medium">Operation:</span> {error.context.operation}
                    </div>
                  )}
                  {error.context.shapeId && (
                    <div>
                      <span className="font-medium">Shape ID:</span> {error.context.shapeId}
                    </div>
                  )}
                  {error.context.additionalData && (
                    <div>
                      <span className="font-medium">Details:</span>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(error.context.additionalData, null, 2)}
                      </pre>
                    </div>
                  )}
                  {error.stack && (
                    <div>
                      <span className="font-medium">Stack Trace:</span>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 ml-3">
          {showDetails && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>
          )}
          
          {canRetry() && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRetry(error.id)}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}
          
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsVisible(false);
                onDismiss(error.id);
              }}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

interface ErrorNotificationListProps {
  errors: ErrorReport[];
  onDismiss?: (errorId: string) => void;
  onRetry?: (errorId: string) => void;
  onClearAll?: () => void;
  maxVisible?: number;
  autoHideAfter?: number;
  showDetails?: boolean;
  className?: string;
}

export const ErrorNotificationList: React.FC<ErrorNotificationListProps> = ({
  errors,
  onDismiss,
  onRetry,
  onClearAll,
  maxVisible = 5,
  autoHideAfter = 10000,
  showDetails = false,
  className = '',
}) => {
  const visibleErrors = errors.slice(0, maxVisible);
  const hiddenCount = Math.max(0, errors.length - maxVisible);

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 w-96 max-w-full ${className}`}>
      <div className="space-y-2">
        {visibleErrors.map((error) => (
          <ErrorNotification
            key={error.id}
            error={error}
            onDismiss={onDismiss}
            onRetry={onRetry}
            autoHideAfter={autoHideAfter}
            showDetails={showDetails}
          />
        ))}
        
        {hiddenCount > 0 && (
          <div className="bg-gray-100 border border-gray-300 rounded p-3 text-center">
            <p className="text-sm text-gray-600">
              {hiddenCount} more error{hiddenCount > 1 ? 's' : ''}
            </p>
            {onClearAll && (
              <Button
                size="sm"
                variant="outline"
                onClick={onClearAll}
                className="mt-2 text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        )}
        
        {errors.length > 1 && onClearAll && hiddenCount === 0 && (
          <div className="text-center">
            <Button
              size="sm"
              variant="outline"
              onClick={onClearAll}
              className="text-xs"
            >
              Clear All ({errors.length})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorNotification;