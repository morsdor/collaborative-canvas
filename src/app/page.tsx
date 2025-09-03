'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { Toolbar } from '@/components/toolbar';
import { CanvasContainer } from '@/components/canvas';
import { StylePanel } from '@/components/ui/StylePanel';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { UserPresenceList, UserCursor } from '@/components/ui/UserPresence';
import { useYjsSync } from '@/hooks/useYjsSync';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Shape, Group, ShapeStyle, TextStyle, UserPresence } from '@/types';

interface GroupOperations {
  createGroup: () => void;
  ungroupShapes: () => void;
  canCreateGroup: boolean;
  canUngroupShapes: boolean;
  selectedGroup: Group | null;
}

function HomeContent() {
  const [selectedShapes, setSelectedShapes] = useState<Shape[]>([]);
  const [allShapes, setAllShapes] = useState<Shape[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [groupOperations, setGroupOperations] = useState<GroupOperations | null>(null);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<UserPresence[]>([]);

  // Generate a simple user ID and name for demo
  const userId = React.useMemo(() => `user-${Math.random().toString(36).substr(2, 9)}`, []);
  const userName = React.useMemo(() => `User ${userId.slice(-4)}`, [userId]);

  const handleShapesChange = useCallback((shapes: Shape[]) => {
    setAllShapes(shapes);
    // Update selected shapes when shapes change
    setSelectedShapes(prev => {
      const selectedIds = new Set(prev.map(s => s.id));
      return shapes.filter(shape => selectedIds.has(shape.id));
    });
  }, []);

  const handleGroupsChange = useCallback((groups: Group[]) => {
    setAllGroups(groups);
  }, []);

  const handlePresenceChange = useCallback((users: UserPresence[]) => {
    setConnectedUsers(users);
  }, []);

  const handleConnectionError = useCallback((error: Error) => {
    setConnectionError(error);
  }, []);

  const handleReconnect = useCallback(() => {
    setConnectionError(null);
    console.log('Successfully reconnected to collaboration server');
  }, []);

  // Create a ref to store the broadcast function to avoid dependency issues
  const broadcastSelectionRef = useRef<((selection: string[]) => void) | null>(null);

  const handleSelectionChange = useCallback((selectedIds: Set<string>) => {
    const selected = allShapes.filter(shape => selectedIds.has(shape.id));
    setSelectedShapes(selected);

    // Broadcast selection to other users
    if (broadcastSelectionRef.current) {
      broadcastSelectionRef.current(Array.from(selectedIds));
    }
  }, [allShapes]);



  // Set up real-time synchronization
  const {
    isConnected,
    connectionStatus,
    connectedUsers: yjsConnectedUsers,
    canUndo,
    canRedo,
    broadcastCursor,
    broadcastSelection,
    setUserActive,
    undo,
    redo,
    reconnect
  } = useYjsSync({
    sessionId: 'demo-session',
    userId,
    userName,
    onShapesChange: handleShapesChange,
    onGroupsChange: handleGroupsChange,
    onPresenceChange: handlePresenceChange,
    onConnectionError: handleConnectionError,
    onReconnect: handleReconnect,
  });

  // Update the broadcast function ref when it changes
  useEffect(() => {
    broadcastSelectionRef.current = broadcastSelection;
  }, [broadcastSelection]);

  const handleStyleChange = useCallback((shapeIds: string[], style: Partial<ShapeStyle>) => {
    console.log('Style change requested:', shapeIds, style);
    // The CanvasContainer will handle the actual style updates
  }, []);

  const handleTextStyleChange = useCallback((shapeIds: string[], textStyle: Partial<TextStyle>) => {
    console.log('Text style change requested:', shapeIds, textStyle);
    // The CanvasContainer will handle the actual text style updates
  }, []);

  const handleGroupCreated = useCallback((group: Group) => {
    console.log('Group created:', group);
  }, []);

  const handleGroupDeleted = useCallback((groupId: string) => {
    console.log('Group deleted:', groupId);
  }, []);

  const handleGroupOperationsChange = useCallback((operations: GroupOperations) => {
    setGroupOperations(operations);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    // Broadcast cursor position to other users
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    broadcastCursor({ x, y });
  }, [broadcastCursor]);

  // Set user as active/inactive based on window focus
  React.useEffect(() => {
    const handleFocus = () => setUserActive(true);
    const handleBlur = () => setUserActive(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [setUserActive]);

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: () => {
      if (canUndo) {
        undo();
      }
    },
    onRedo: () => {
      if (canRedo) {
        redo();
      }
    },
    onGroup: () => {
      if (groupOperations?.canCreateGroup) {
        groupOperations.createGroup();
      }
    },
    onUngroup: () => {
      if (groupOperations?.canUngroupShapes) {
        groupOperations.ungroupShapes();
      }
    },
    onDelete: () => {
      // Delete selected shapes
      selectedShapes.forEach(shape => {
        // The CanvasContainer will handle the actual deletion
        console.log('Delete shape via keyboard:', shape.id);
      });
    },
    enabled: true,
  });

  return (
    <div className="h-screen flex flex-col">
      {/* Header with connection status */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <h1 className="text-xl font-semibold">Collaborative Canvas</h1>
        <div className="flex items-center gap-4">
          <UserPresenceList
            users={connectedUsers}
            currentUserId={userId}
          />
          <ConnectionStatus
            showDetails={!isConnected}
            onRetry={reconnect}
          />
          {connectionError && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded">
              Connection error: {connectionError.message}
            </div>
          )}
        </div>
      </div>

      <Toolbar
        selectedShapes={selectedShapes}
        groups={allGroups}
        onStyleChange={handleStyleChange}
        onTextStyleChange={handleTextStyleChange}
        groupOperations={groupOperations || undefined}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      <div className="flex flex-1">
        <div className="flex-1 relative" onMouseMove={handleMouseMove}>
          <CanvasContainer
            sessionId="demo-session"
            className="w-full h-full"
            onShapesChange={handleShapesChange}
            onGroupsChange={handleGroupsChange}
            onSelectionChange={handleSelectionChange}
            onStyleChange={handleStyleChange}
            onTextStyleChange={handleTextStyleChange}
            onGroupCreated={handleGroupCreated}
            onGroupDeleted={handleGroupDeleted}
            onGroupOperationsChange={handleGroupOperationsChange}
          />

          {/* Render other users' cursors */}
          {connectedUsers.map((user) => (
            <UserCursor
              key={user.userId}
              user={user}
              isCurrentUser={user.userId === userId}
            />
          ))}
        </div>

        {/* Style Panel */}
        {selectedShapes.length > 0 && (
          <div className="w-80 border-l bg-gray-50 p-4">
            <StylePanel
              selectedShapes={selectedShapes}
              onStyleChange={handleStyleChange}
            />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-20 left-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-sm">
        <h3 className="font-semibold mb-2">Collaborative Canvas Demo</h3>
        <ul className="text-sm space-y-1">
          <li>• Select a tool from the toolbar</li>
          <li>• Click on the canvas to create shapes</li>
          <li>• Drag shapes to move them around</li>
          <li>• Click shapes to select them</li>
          <li>• Double-click text shapes to edit</li>
          <li>• Ctrl/Cmd + click for multi-select</li>
          <li>• Use resize handles to resize shapes</li>
          <li>• Use style panel to change colors</li>
          <li>• Use text formatting for text shapes</li>
          <li>• Ctrl/Cmd + G to group selected shapes</li>
          <li>• Ctrl/Cmd + Shift + G to ungroup</li>
          <li>• Use Ctrl/Cmd + mouse to pan</li>
          <li>• Scroll to zoom in/out</li>
        </ul>

        {/* Connection status in instructions */}
        <div className="mt-4 pt-3 border-t">
          <div className="text-xs text-gray-600">
            Status: <ConnectionStatus />
          </div>
          {!isConnected && (
            <div className="text-xs text-amber-600 mt-1">
              Working offline - changes will sync when reconnected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Provider store={store}>
      <HomeContent />
    </Provider>
  );
}