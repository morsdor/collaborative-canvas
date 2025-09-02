import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ConnectionStatus as ConnectionStatusType } from '@/types';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  onRetry?: () => void;
  isOffline?: boolean;
  pendingChanges?: number;
  retryCount?: number;
  onSyncPending?: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className = '',
  showDetails = false,
  onRetry,
  isOffline = false,
  pendingChanges = 0,
  retryCount = 0,
  onSyncPending,
}) => {
  const connectionStatus = useSelector((state: RootState) => state.collaboration.connectionStatus);

  const getStatusConfig = (status: ConnectionStatusType, offline: boolean) => {
    if (offline) {
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        icon: '⚠',
        text: 'Offline',
        description: `Working offline${pendingChanges > 0 ? ` - ${pendingChanges} changes pending` : ''}`,
      };
    }

    switch (status) {
      case 'connected':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: '●',
          text: 'Connected',
          description: 'Real-time collaboration is active',
        };
      case 'connecting':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          icon: '◐',
          text: 'Connecting...',
          description: `Establishing connection to collaboration server${retryCount > 0 ? ` (attempt ${retryCount})` : ''}`,
        };
      case 'disconnected':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: '●',
          text: 'Disconnected',
          description: `Working offline - changes will sync when reconnected${pendingChanges > 0 ? ` (${pendingChanges} pending)` : ''}`,
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: '●',
          text: 'Unknown',
          description: 'Connection status unknown',
        };
    }
  };

  const config = getStatusConfig(connectionStatus, isOffline);

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`${config.color} text-sm animate-pulse`}>
          {config.icon}
        </span>
        <span className={`text-sm ${config.color}`}>
          {config.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${config.bgColor} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`${config.color} animate-pulse`}>
            {config.icon}
          </span>
          <div>
            <div className={`font-medium ${config.color}`}>
              {config.text}
            </div>
            <div className="text-xs text-gray-600">
              {config.description}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {pendingChanges > 0 && onSyncPending && connectionStatus === 'connected' && !isOffline && (
            <button
              onClick={onSyncPending}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Sync ({pendingChanges})
            </button>
          )}
          
          {(connectionStatus === 'disconnected' || isOffline) && onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Retry'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;