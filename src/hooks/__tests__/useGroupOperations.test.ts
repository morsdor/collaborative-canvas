import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useGroupOperations } from '../useGroupOperations';
import { Shape, Group } from '@/types';
import uiSlice from '@/store/slices/uiSlice';

// Mock the GroupService
jest.mock('@/services/groupService');
jest.mock('@/utils', () => ({
  generateId: jest.fn(() => 'test-id'),
}));

const mockStore = configureStore({
  reducer: {
    ui: uiSlice,
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(Provider, { store: mockStore }, children);
};

describe('useGroupOperations', () => {
  const mockShapes: Shape[] = [
    {
      id: 'shape-1',
      type: 'rectangle',
      position: { x: 0, y: 0 },
      dimensions: { width: 100, height: 100 },
      style: { fill: '#000', stroke: '#000', strokeWidth: 1, opacity: 1 },
    },
    {
      id: 'shape-2',
      type: 'circle',
      position: { x: 200, y: 200 },
      dimensions: { width: 50, height: 50 },
      style: { fill: '#fff', stroke: '#fff', strokeWidth: 1, opacity: 1 },
    },
    {
      id: 'shape-3',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      dimensions: { width: 80, height: 80 },
      style: { fill: '#f00', stroke: '#f00', strokeWidth: 1, opacity: 1 },
    },
  ];

  const mockGroups: Group[] = [
    {
      id: 'group-1',
      shapeIds: ['shape-1', 'shape-2'],
      bounds: { x: 0, y: 0, width: 250, height: 250 },
      locked: false,
    },
  ];

  const mockProps = {
    shapes: mockShapes,
    groups: mockGroups,
    onAddGroup: jest.fn(),
    onUpdateGroup: jest.fn(),
    onDeleteGroup: jest.fn(),
    onUpdateShape: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    mockStore.dispatch({ type: 'ui/clearSelection' });
  });

  describe('createGroup', () => {
    it('should create a group from selected shapes', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      // Select multiple shapes
      act(() => {
        mockStore.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape-1', 'shape-2'] });
      });

      // Mock GroupService methods
      const { GroupService } = require('@/services/groupService');
      GroupService.canGroupShapes.mockReturnValue(true);
      GroupService.createGroup.mockReturnValue({
        id: 'new-group',
        shapeIds: ['shape-1', 'shape-2'],
        bounds: { x: 0, y: 0, width: 250, height: 250 },
        locked: false,
      });

      let createdGroup: Group | null = null;
      act(() => {
        createdGroup = result.current.createGroup();
      });

      expect(createdGroup).toBeTruthy();
      expect(mockProps.onAddGroup).toHaveBeenCalledWith(expect.objectContaining({
        id: 'new-group',
        shapeIds: ['shape-1', 'shape-2'],
      }));
      expect(mockProps.onUpdateShape).toHaveBeenCalledTimes(2);
    });

    it('should not create group with less than 2 shapes', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      // Select only one shape
      act(() => {
        mockStore.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape-1'] });
      });

      let createdGroup: Group | null = null;
      act(() => {
        createdGroup = result.current.createGroup();
      });

      expect(createdGroup).toBeNull();
      expect(mockProps.onAddGroup).not.toHaveBeenCalled();
    });

    it('should not create group if shapes are already grouped', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      // Select shapes that are already in a group
      act(() => {
        mockStore.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape-1', 'shape-2'] });
      });

      const { GroupService } = require('@/services/groupService');
      GroupService.canGroupShapes.mockReturnValue(false);

      let createdGroup: Group | null = null;
      act(() => {
        createdGroup = result.current.createGroup();
      });

      expect(createdGroup).toBeNull();
      expect(mockProps.onAddGroup).not.toHaveBeenCalled();
    });
  });

  describe('ungroupShapes', () => {
    it('should ungroup selected shapes', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      // Select shapes that are in a group
      act(() => {
        mockStore.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape-1', 'shape-2'] });
      });

      const { GroupService } = require('@/services/groupService');
      GroupService.isShapeInGroup.mockImplementation((shapeId: string) => {
        if (shapeId === 'shape-1' || shapeId === 'shape-2') {
          return mockGroups[0];
        }
        return null;
      });

      act(() => {
        result.current.ungroupShapes();
      });

      expect(mockProps.onUpdateShape).toHaveBeenCalledWith('shape-1', { groupId: undefined });
      expect(mockProps.onUpdateShape).toHaveBeenCalledWith('shape-2', { groupId: undefined });
      expect(mockProps.onDeleteGroup).toHaveBeenCalledWith('group-1');
    });

    it('should do nothing if no shapes are selected', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        result.current.ungroupShapes();
      });

      expect(mockProps.onUpdateShape).not.toHaveBeenCalled();
      expect(mockProps.onDeleteGroup).not.toHaveBeenCalled();
    });
  });

  describe('moveGroup', () => {
    it('should move all shapes in a group', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      const { GroupService } = require('@/services/groupService');
      GroupService.moveGroup.mockReturnValue({
        updatedShapes: [
          { ...mockShapes[0], position: { x: 10, y: 10 } },
          { ...mockShapes[1], position: { x: 210, y: 210 } },
        ],
        updatedGroup: {
          ...mockGroups[0],
          bounds: { x: 10, y: 10, width: 250, height: 250 },
        },
      });

      act(() => {
        result.current.moveGroup('group-1', 10, 10);
      });

      expect(mockProps.onUpdateShape).toHaveBeenCalledTimes(2);
      expect(mockProps.onUpdateGroup).toHaveBeenCalledWith('group-1', {
        bounds: { x: 10, y: 10, width: 250, height: 250 },
      });
    });

    it('should do nothing if group does not exist', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        result.current.moveGroup('non-existent-group', 10, 10);
      });

      expect(mockProps.onUpdateShape).not.toHaveBeenCalled();
      expect(mockProps.onUpdateGroup).not.toHaveBeenCalled();
    });
  });

  describe('resizeGroup', () => {
    it('should resize all shapes in a group', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      const newBounds = { x: 0, y: 0, width: 300, height: 300 };
      const { GroupService } = require('@/services/groupService');
      GroupService.resizeGroup.mockReturnValue({
        updatedShapes: [
          { ...mockShapes[0], dimensions: { width: 120, height: 120 } },
          { ...mockShapes[1], dimensions: { width: 60, height: 60 } },
        ],
        updatedGroup: {
          ...mockGroups[0],
          bounds: newBounds,
        },
      });

      act(() => {
        result.current.resizeGroup('group-1', newBounds);
      });

      expect(mockProps.onUpdateShape).toHaveBeenCalledTimes(2);
      expect(mockProps.onUpdateGroup).toHaveBeenCalledWith('group-1', {
        bounds: newBounds,
      });
    });
  });

  describe('canCreateGroup', () => {
    it('should return true when 2+ shapes are selected and can be grouped', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        mockStore.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape-1', 'shape-3'] });
      });

      const { GroupService } = require('@/services/groupService');
      GroupService.canGroupShapes.mockReturnValue(true);

      expect(result.current.canCreateGroup()).toBe(true);
    });

    it('should return false when less than 2 shapes are selected', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        mockStore.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape-1'] });
      });

      expect(result.current.canCreateGroup()).toBe(false);
    });

    it('should return false when shapes cannot be grouped', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        mockStore.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape-1', 'shape-2'] });
      });

      const { GroupService } = require('@/services/groupService');
      GroupService.canGroupShapes.mockReturnValue(false);

      expect(result.current.canCreateGroup()).toBe(false);
    });
  });

  describe('canUngroupShapes', () => {
    it('should return true when selected shapes are in groups', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        mockStore.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape-1'] });
      });

      const { GroupService } = require('@/services/groupService');
      GroupService.isShapeInGroup.mockReturnValue(mockGroups[0]);

      expect(result.current.canUngroupShapes()).toBe(true);
    });

    it('should return false when no shapes are selected', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      expect(result.current.canUngroupShapes()).toBe(false);
    });

    it('should return false when selected shapes are not in groups', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        mockStore.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape-3'] });
      });

      const { GroupService } = require('@/services/groupService');
      GroupService.isShapeInGroup.mockReturnValue(null);

      expect(result.current.canUngroupShapes()).toBe(false);
    });
  });

  describe('getSelectedGroup', () => {
    it('should return group when all selected shapes belong to same group', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        mockStore.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape-1', 'shape-2'] });
      });

      const { GroupService } = require('@/services/groupService');
      GroupService.isShapeInGroup.mockReturnValue(mockGroups[0]);

      const selectedGroup = result.current.getSelectedGroup();
      expect(selectedGroup).toEqual(mockGroups[0]);
    });

    it('should return null when no shapes are selected', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      const selectedGroup = result.current.getSelectedGroup();
      expect(selectedGroup).toBeNull();
    });

    it('should return null when selected shapes belong to different groups', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        mockStore.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape-1', 'shape-3'] });
      });

      const { GroupService } = require('@/services/groupService');
      GroupService.isShapeInGroup.mockImplementation((shapeId: string) => {
        if (shapeId === 'shape-1') return mockGroups[0];
        return null;
      });

      const selectedGroup = result.current.getSelectedGroup();
      expect(selectedGroup).toBeNull();
    });
  });

  describe('selectGroup', () => {
    it('should select all shapes in a group', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        result.current.selectGroup('group-1');
      });

      const state = mockStore.getState();
      expect(state.ui.selectedShapeIds).toEqual(['shape-1', 'shape-2']);
    });

    it('should do nothing if group does not exist', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        result.current.selectGroup('non-existent-group');
      });

      const state = mockStore.getState();
      expect(state.ui.selectedShapeIds).toEqual([]);
    });
  });

  describe('toggleGroupLock', () => {
    it('should toggle the lock state of a group', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        result.current.toggleGroupLock('group-1');
      });

      expect(mockProps.onUpdateGroup).toHaveBeenCalledWith('group-1', {
        locked: true,
      });
    });

    it('should do nothing if group does not exist', async () => {
      const { result } = renderHook(() => useGroupOperations(mockProps), { wrapper });

      act(() => {
        result.current.toggleGroupLock('non-existent-group');
      });

      expect(mockProps.onUpdateGroup).not.toHaveBeenCalled();
    });
  });
});