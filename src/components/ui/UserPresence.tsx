import React from 'react';
import { UserPresence as UserPresenceType } from '@/types';

interface UserCursorProps {
  user: UserPresenceType;
  isCurrentUser?: boolean;
}

export const UserCursor: React.FC<UserCursorProps> = ({ user, isCurrentUser = false }) => {
  if (isCurrentUser || !user.isActive) {
    return null;
  }

  const cursorColor = getUserColor(user.userId);

  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-100"
      style={{
        left: user.cursor.x,
        top: user.cursor.y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        className="drop-shadow-sm"
      >
        <path
          d="M2 2L18 8L8 12L2 18L2 2Z"
          fill={cursorColor}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      
      {/* User name label */}
      <div
        className="absolute top-5 left-2 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
        style={{ backgroundColor: cursorColor }}
      >
        {user.name}
      </div>
    </div>
  );
};

interface UserPresenceListProps {
  users: UserPresenceType[];
  currentUserId?: string;
  className?: string;
}

export const UserPresenceList: React.FC<UserPresenceListProps> = ({
  users,
  currentUserId,
  className = '',
}) => {
  const activeUsers = users.filter(user => user.isActive && user.userId !== currentUserId);

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600">Online:</span>
      <div className="flex -space-x-2">
        {activeUsers.slice(0, 5).map((user) => (
          <UserAvatar key={user.userId} user={user} />
        ))}
        {activeUsers.length > 5 && (
          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
            +{activeUsers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
};

interface UserAvatarProps {
  user: UserPresenceType;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  showName = false,
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const userColor = getUserColor(user.userId);
  const initials = getInitials(user.name);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full border-2 border-white flex items-center justify-center font-medium text-white shadow-sm`}
        style={{ backgroundColor: userColor }}
        title={user.name}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      {showName && (
        <span className="text-sm font-medium text-gray-700">{user.name}</span>
      )}
    </div>
  );
};

interface UserSelectionOverlayProps {
  users: UserPresenceType[];
  currentUserId?: string;
}

export const UserSelectionOverlay: React.FC<UserSelectionOverlayProps> = ({
  users,
  currentUserId,
}) => {
  const otherUsers = users.filter(user => 
    user.userId !== currentUserId && 
    user.isActive && 
    user.selection.length > 0
  );

  return (
    <>
      {otherUsers.map((user) => (
        <div key={user.userId}>
          {user.selection.map((shapeId) => (
            <div
              key={`${user.userId}-${shapeId}`}
              className="absolute pointer-events-none border-2 border-dashed rounded"
              style={{
                borderColor: getUserColor(user.userId),
                // Position will be set by the parent component based on shape bounds
              }}
            >
              <div
                className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded shadow-sm whitespace-nowrap"
                style={{ backgroundColor: getUserColor(user.userId) }}
              >
                {user.name} selected
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
};

// Utility functions
function getUserColor(userId: string): string {
  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // yellow
    '#8B5CF6', // purple
    '#F97316', // orange
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#EC4899', // pink
    '#6B7280', // gray
  ];
  
  // Create a simple hash from userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
  }
  
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default UserPresenceList;