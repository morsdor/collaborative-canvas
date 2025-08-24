import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ConnectionStatus as ConnectionStatusType } from '@/types';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  onRetry?: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className = '',
  showDetails = false,
  onRetry,
}) => {
  const connectionStatus = useSelector((state: RootState) => state.collaboration.connectionStatus);

  const getStatusConfig = (status: ConnectionStatusType) => {
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
          description: 'Establishing connection to collaboration server',
        };
      case 'disconnected':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: '●',
          text: 'Disconnected',
          description: 'Working offline - changes will sync when reconnected',
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

  const config = getStatusConfig(connectionStatus);

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
        
        {connectionStatus === 'disconnected' && onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;