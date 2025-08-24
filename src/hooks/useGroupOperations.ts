import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from './redux';
import { setSelectedShapeIds, clearSelection } from '@/store/slices/uiSlice';
import { Shape, Group, Rectangle } from '@/types';
import { GroupService } from '@/services/groupService';
import { generateId } from '@/utils';

interface UseGroupOperationsProps {
  shapes: Shape[];
  groups: Group[];
  onAddGroup: (group: Group) => void;
  onUpdateGroup: (id: string, updates: Partial<Group>) => void;
  onDeleteGroup: (id: string) => void;
  onUpdateShape: (id: string, updates: Partial<Shape>) => void;
}

export const useGroupOperations = ({
  shapes,
  groups,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onUpdateShape,
}: UseGroupOperationsProps) => {
  const dispatch = useAppDispatch();
  const { selectedShapeIds } = useAppSelector((state) => state.ui);

  /**
   * Create a group from currently selected shapes
   */
  const createGroup = useCallback(() => {
    if (selectedShapeIds.length < 2) {
      console.warn('Need at least 2 shapes to create a group');
      return null;
    }

    const selectedShapes = shapes.filter(shape => 
      selectedShapeIds.includes(shape.id)
    );

    // Check if any selected shapes are already in groups
    if (!GroupService.canGroupShapes(selectedShapeIds, groups)) {
      console.warn('Some selected shapes are already in groups');
      return null;
    }

    const newGroup = GroupService.createGroup(selectedShapes);
    if (!newGroup) {
      console.warn('Failed to create group');
      return null;
    }

    // Update shapes to reference the new group
    selectedShapes.forEach(shape => {
      onUpdateShape(shape.id, { groupId: newGroup.id });
    });

    // Add the group
    onAddGroup(newGroup);

    // Select the group (by selecting all its shapes)
    dispatch(setSelectedShapeIds(newGroup.shapeIds));

    return newGroup;
  }, [selectedShapeIds, shapes, groups, onAddGroup, onUpdateShape, dispatch]);

  /**
   * Ungroup selected shapes
   */
  const ungroupShapes = useCallback(() => {
    if (selectedShapeIds.length === 0) {
      return;
    }

    const affectedGroups = new Set<string>();
    
    // Find all groups that contain selected shapes
    selectedShapeIds.forEach(shapeId => {
      const group = GroupService.isShapeInGroup(shapeId, groups);
      if (group) {
        affectedGroups.add(group.id);
      }
    });

    // Ungroup each affected group
    affectedGroups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      // Remove group reference from all shapes in the group
      group.shapeIds.forEach(shapeId => {
        onUpdateShape(shapeId, { groupId: undefined });
      });

      // Delete the group
      onDeleteGroup(groupId);
    });

    // Keep the same shapes selected
    dispatch(setSelectedShapeIds(selectedShapeIds));
  }, [selectedShapeIds, groups, onUpdateShape, onDeleteGroup, dispatch]);

  /**
   * Move a group and all its shapes
   */
  const moveGroup = useCallback((
    groupId: string, 
    deltaX: number, 
    deltaY: number
  ) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const { updatedShapes, updatedGroup } = GroupService.moveGroup(
      group, 
      deltaX, 
      deltaY, 
      shapes
    );

    // Update all shapes in the group
    updatedShapes.forEach(shape => {
      onUpdateShape(shape.id, {
        position: shape.position,
      });
    });

    // Update the group bounds
    onUpdateGroup(groupId, {
      bounds: updatedGroup.bounds,
    });
  }, [groups, shapes, onUpdateShape, onUpdateGroup]);

  /**
   * Resize a group and all its shapes
   */
  const resizeGroup = useCallback((
    groupId: string, 
    newBounds: Rectangle
  ) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const { updatedShapes, updatedGroup } = GroupService.resizeGroup(
      group,
      newBounds,
      shapes
    );

    // Update all shapes in the group
    updatedShapes.forEach(shape => {
      onUpdateShape(shape.id, {
        position: shape.position,
        dimensions: shape.dimensions,
      });
    });

    // Update the group bounds
    onUpdateGroup(groupId, {
      bounds: updatedGroup.bounds,
    });
  }, [groups, shapes, onUpdateShape, onUpdateGroup]);

  /**
   * Update group bounds based on current shape positions
   */
  const updateGroupBounds = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const updatedGroup = GroupService.updateGroupBounds(group, shapes);
    
    if (updatedGroup.bounds !== group.bounds) {
      onUpdateGroup(groupId, {
        bounds: updatedGroup.bounds,
      });
    }
  }, [groups, shapes, onUpdateGroup]);

  /**
   * Get the group that contains the currently selected shapes (if any)
   */
  const getSelectedGroup = useCallback((): Group | null => {
    if (selectedShapeIds.length === 0) return null;

    // Check if all selected shapes belong to the same group
    const firstShapeGroup = GroupService.isShapeInGroup(selectedShapeIds[0], groups);
    if (!firstShapeGroup) return null;

    // Verify all selected shapes are in the same group
    const allInSameGroup = selectedShapeIds.every(shapeId => 
      firstShapeGroup.shapeIds.includes(shapeId)
    );

    return allInSameGroup ? firstShapeGroup : null;
  }, [selectedShapeIds, groups]);

  /**
   * Check if currently selected shapes can be grouped
   */
  const canCreateGroup = useCallback((): boolean => {
    if (selectedShapeIds.length < 2) return false;
    return GroupService.canGroupShapes(selectedShapeIds, groups);
  }, [selectedShapeIds, groups]);

  /**
   * Check if currently selected shapes can be ungrouped
   */
  const canUngroupShapes = useCallback((): boolean => {
    if (selectedShapeIds.length === 0) return false;
    
    return selectedShapeIds.some(shapeId => 
      GroupService.isShapeInGroup(shapeId, groups) !== null
    );
  }, [selectedShapeIds, groups]);

  /**
   * Select all shapes in a group
   */
  const selectGroup = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    dispatch(setSelectedShapeIds(group.shapeIds));
  }, [groups, dispatch]);

  /**
   * Toggle group lock state
   */
  const toggleGroupLock = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    onUpdateGroup(groupId, {
      locked: !group.locked,
    });
  }, [groups, onUpdateGroup]);

  return {
    createGroup,
    ungroupShapes,
    moveGroup,
    resizeGroup,
    updateGroupBounds,
    getSelectedGroup,
    canCreateGroup,
    canUngroupShapes,
    selectGroup,
    toggleGroupLock,
  };
};