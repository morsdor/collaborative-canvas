'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { InteractiveCanvas } from './InteractiveCanvas';
import { Shape, Point, Group } from '@/types';
import { useYjsSync } from '@/hooks/useYjsSync';
import { useGroupOperations } from '@/hooks/useGroupOperations';

interface GroupOperations {
  createGroup: () => void;
  ungroupShapes: () => void;
  canCreateGroup: boolean;
  canUngroupShapes: boolean;
  selectedGroup: Group | null;
}

interface CanvasContainerProps {
  sessionId?: string;
  className?: string;
  onShapesChange?: (shapes: Shape[]) => void;
  onGroupsChange?: (groups: Group[]) => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onStyleChange?: (shapeIds: string[], style: Partial<Shape['style']>) => void;
  onGroupCreated?: (group: Group) => void;
  onGroupDeleted?: (groupId: string) => void;
  onGroupOperationsChange?: (operations: GroupOperations) => void;
}

export const CanvasContainer: React.FC<CanvasContainerProps> = ({ 
  sessionId = 'default-session',
  className,
  onShapesChange,
  onGroupsChange,
  onSelectionChange,
  onStyleChange,
  onGroupCreated,
  onGroupDeleted,
  onGroupOperationsChange
}) => {
  const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());
  const [localShapes, setLocalShapes] = useState<Shape[]>([]);
  const [localGroups, setLocalGroups] = useState<Group[]>([]);

  // Use Yjs for real-time collaboration
  const { updateShape, addGroup, updateGroup, deleteGroup } = useYjsSync({
    sessionId,
    onShapesChange: (shapes) => {
      setLocalShapes(shapes);
      if (onShapesChange) {
        onShapesChange(shapes);
      }
    },
    onGroupsChange: (groups) => {
      setLocalGroups(groups);
      if (onGroupsChange) {
        onGroupsChange(groups);
      }
    },
  });

  // Get current shapes and groups (from Yjs or fallback to mock data)
  const shapes = localShapes.length > 0 ? localShapes : getMockShapes();
  const groups = localGroups.length > 0 ? localGroups : [];

  // Set up group operations
  const groupOperations = useGroupOperations({
    shapes,
    groups,
    onAddGroup: addGroup,
    onUpdateGroup: updateGroup,
    onDeleteGroup: deleteGroup,
    onUpdateShape: updateShape,
  });

  const handleShapeClick = useCallback((shapeId: string, event: React.MouseEvent) => {
    console.log('Shape clicked:', shapeId);
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      setSelectedShapeIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(shapeId)) {
          newSet.delete(shapeId);
        } else {
          newSet.add(shapeId);
        }
        if (onSelectionChange) {
          onSelectionChange(newSet);
        }
        return newSet;
      });
    } else {
      // Single select
      const newSelectedIds = new Set([shapeId]);
      setSelectedShapeIds(newSelectedIds);
      if (onSelectionChange) {
        onSelectionChange(newSelectedIds);
      }
    }
  }, [onSelectionChange]);

  const handleCanvasClick = useCallback((position: Point) => {
    console.log('Canvas clicked at:', position);
    // Clear selection when clicking on empty canvas
    const emptySet = new Set<string>();
    setSelectedShapeIds(emptySet);
    if (onSelectionChange) {
      onSelectionChange(emptySet);
    }
  }, [onSelectionChange]);

  const handleShapeHover = useCallback((shapeId: string | null) => {
    // Could be used for showing shape info or other hover effects
    if (shapeId) {
      console.log('Hovering over shape:', shapeId);
    }
  }, []);

  const handleShapeCreated = useCallback((shape: Shape) => {
    console.log('Shape created:', shape);
    // Shape is automatically added to Yjs document by useShapeCreation hook
    // The onShapesChange callback will update localShapes
  }, []);

  const handleShapeUpdate = useCallback((id: string, updates: Partial<Shape>) => {
    console.log('Shape updated:', id, updates);
    updateShape(id, updates);
  }, [updateShape]);

  const handleShapeStyleChange = useCallback((shapeIds: string[], styleUpdates: Partial<Shape['style']>) => {
    console.log('Style updated for shapes:', shapeIds, styleUpdates);
    shapeIds.forEach(id => {
      const shape = shapes.find(s => s.id === id);
      if (shape) {
        updateShape(id, {
          style: { ...shape.style, ...styleUpdates }
        });
      }
    });
    
    // Also call the external callback if provided
    if (onStyleChange) {
      onStyleChange(shapeIds, styleUpdates);
    }
  }, [shapes, updateShape, onStyleChange]);

  // Group operation handlers
  const handleCreateGroup = useCallback(() => {
    const newGroup = groupOperations.createGroup();
    if (newGroup && onGroupCreated) {
      onGroupCreated(newGroup);
    }
  }, [groupOperations, onGroupCreated]);

  const handleUngroupShapes = useCallback(() => {
    groupOperations.ungroupShapes();
    if (onGroupDeleted) {
      // Find which groups were affected by the ungroup operation
      const selectedIds = Array.from(selectedShapeIds);
      selectedIds.forEach(shapeId => {
        const group = groups.find(g => g.shapeIds.includes(shapeId));
        if (group) {
          onGroupDeleted(group.id);
        }
      });
    }
  }, [groupOperations, selectedShapeIds, groups, onGroupDeleted]);

  // Expose group operations and state for toolbar
  const groupOperationsForToolbar = {
    createGroup: handleCreateGroup,
    ungroupShapes: handleUngroupShapes,
    canCreateGroup: groupOperations.canCreateGroup(),
    canUngroupShapes: groupOperations.canUngroupShapes(),
    selectedGroup: groupOperations.getSelectedGroup(),
  };

  // Notify parent of group operations changes
  useEffect(() => {
    if (onGroupOperationsChange) {
      onGroupOperationsChange(groupOperationsForToolbar);
    }
  }, [groupOperationsForToolbar, onGroupOperationsChange]);

  return (
    <InteractiveCanvas
      shapes={shapes}
      groups={groups}
      selectedShapeIds={selectedShapeIds}
      sessionId={sessionId}
      onShapeClick={handleShapeClick}
      onCanvasClick={handleCanvasClick}
      onShapeHover={handleShapeHover}
      onShapeCreated={handleShapeCreated}
      onShapeUpdate={handleShapeUpdate}
      onShapeStyleChange={handleShapeStyleChange}
      groupOperations={groupOperationsForToolbar}
      className={className}
    />
  );
};

/**
 * Mock shapes for testing when no Yjs data is available
 */
function getMockShapes(): Shape[] {
  return [
    {
      id: '1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      dimensions: { width: 200, height: 150 },
      style: {
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2,
        opacity: 1,
      },
    },
    {
      id: '2',
      type: 'circle',
      position: { x: 400, y: 200 },
      dimensions: { width: 120, height: 120 },
      style: {
        fill: '#ef4444',
        stroke: '#dc2626',
        strokeWidth: 2,
        opacity: 0.8,
      },
    },
    {
      id: '3',
      type: 'text',
      position: { x: 200, y: 350 },
      dimensions: { width: 300, height: 50 },
      style: {
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 0,
        opacity: 1,
      },
      content: 'Hello Interactive Canvas!',
    },
  ];
}