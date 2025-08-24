import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CanvasContainer } from '../CanvasContainer';
import { Shape, Group } from '@/types';
import uiSlice from '@/store/slices/uiSlice';
import viewportSlice from '@/store/slices/viewportSlice';
import collaborationSlice from '@/store/slices/collaborationSlice';

// Mock the Yjs integration
jest.mock('@/hooks/useYjsSync', () => ({
  useYjsSync: jest.fn(() => ({
    updateShape: jest.fn(),
    addGroup: jest.fn(),
    updateGroup: jest.fn(),
    deleteGroup: jest.fn(),
  })),
}));

// Mock the GroupService
jest.mock('@/services/groupService');
jest.mock('@/utils', () => ({
  generateId: jest.fn(() => 'test-group-id'),
  getMultipleShapesBounds: jest.fn(() => ({
    x: 0,
    y: 0,
    width: 300,
    height: 200,
  })),
  isShapeVisible: jest.fn(() => true),
}));

const mockStore = configureStore({
  reducer: {
    ui: uiSlice,
    viewport: viewportSlice,
    collaboration: collaborationSlice,
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={mockStore}>{children}</Provider>
);

describe('Group Operations Integration', () => {
  const mockShapes: Shape[] = [
    {
      id: 'shape-1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      dimensions: { width: 100, height: 100 },
      style: { fill: '#ff0000', stroke: '#000000', strokeWidth: 2, opacity: 1 },
    },
    {
      id: 'shape-2',
      type: 'circle',
      position: { x: 250, y: 150 },
      dimensions: { width: 80, height: 80 },
      style: { fill: '#00ff00', stroke: '#000000', strokeWidth: 2, opacity: 1 },
    },
    {
      id: 'shape-3',
      type: 'rectangle',
      position: { x: 400, y: 200 },
      dimensions: { width: 120, height: 60 },
      style: { fill: '#0000ff', stroke: '#000000', strokeWidth: 2, opacity: 1 },
    },
  ];

  let mockOnShapesChange: jest.Mock;
  let mockOnGroupsChange: jest.Mock;
  let mockOnGroupCreated: jest.Mock;
  let mockOnGroupDeleted: jest.Mock;
  let mockOnGroupOperationsChange: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.dispatch({ type: 'ui/clearSelection' });

    mockOnShapesChange = jest.fn();
    mockOnGroupsChange = jest.fn();
    mockOnGroupCreated = jest.fn();
    mockOnGroupDeleted = jest.fn();
    mockOnGroupOperationsChange = jest.fn();

    // Mock GroupService methods
    const { GroupService } = require('@/services/groupService');
    GroupService.canGroupShapes = jest.fn();
    GroupService.createGroup = jest.fn();
    GroupService.isShapeInGroup = jest.fn();
    GroupService.moveGroup = jest.fn();
    GroupService.resizeGroup = jest.fn();
  });

  const renderCanvasContainer = (shapes = mockShapes, groups: Group[] = []) => {
    return render(
      <TestWrapper>
        <CanvasContainer
          sessionId="test-session"
          onShapesChange={mockOnShapesChange}
          onGroupsChange={mockOnGroupsChange}
          onGroupCreated={mockOnGroupCreated}
          onGroupDeleted={mockOnGroupDeleted}
          onGroupOperationsChange={mockOnGroupOperationsChange}
        />
      </TestWrapper>
    );
  };

  describe('Group Creation', () => {
    it('should create a group when multiple shapes are selected and group operation is triggered', async () => {
      const { GroupService } = require('@/services/groupService');
      GroupService.canGroupShapes.mockReturnValue(true);
      GroupService.createGroup.mockReturnValue({
        id: 'test-group-id',
        shapeIds: ['shape-1', 'shape-2'],
        bounds: { x: 100, y: 100, width: 230, height: 130 },
        locked: false,
      });

      renderCanvasContainer();

      // Simulate shapes being loaded
      await waitFor(() => {
        expect(mockOnGroupOperationsChange).toHaveBeenCalled();
      });

      // Select multiple shapes by dispatching actions directly
      mockStore.dispatch({ 
        type: 'ui/setSelectedShapeIds', 
        payload: ['shape-1', 'shape-2'] 
      });

      // Trigger group creation via keyboard shortcut
      fireEvent.keyDown(document, { key: 'g', ctrlKey: true });

      await waitFor(() => {
        expect(mockOnGroupCreated).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'test-group-id',
            shapeIds: ['shape-1', 'shape-2'],
          })
        );
      });
    });

    it('should not create group when less than 2 shapes are selected', async () => {
      renderCanvasContainer();

      // Select only one shape
      mockStore.dispatch({ 
        type: 'ui/setSelectedShapeIds', 
        payload: ['shape-1'] 
      });

      // Trigger group creation
      fireEvent.keyDown(document, { key: 'g', ctrlKey: true });

      await waitFor(() => {
        expect(mockOnGroupCreated).not.toHaveBeenCalled();
      });
    });

    it('should not create group when shapes are already grouped', async () => {
      const { GroupService } = require('@/services/groupService');
      GroupService.canGroupShapes.mockReturnValue(false);

      renderCanvasContainer();

      // Select multiple shapes
      mockStore.dispatch({ 
        type: 'ui/setSelectedShapeIds', 
        payload: ['shape-1', 'shape-2'] 
      });

      // Trigger group creation
      fireEvent.keyDown(document, { key: 'g', ctrlKey: true });

      await waitFor(() => {
        expect(mockOnGroupCreated).not.toHaveBeenCalled();
      });
    });
  });

  describe('Group Ungrouping', () => {
    it('should ungroup shapes when ungroup operation is triggered', async () => {
      const mockGroup: Group = {
        id: 'existing-group',
        shapeIds: ['shape-1', 'shape-2'],
        bounds: { x: 100, y: 100, width: 230, height: 130 },
        locked: false,
      };

      const { GroupService } = require('@/services/groupService');
      GroupService.isShapeInGroup.mockImplementation((shapeId: string) => {
        if (shapeId === 'shape-1' || shapeId === 'shape-2') {
          return mockGroup;
        }
        return null;
      });

      renderCanvasContainer(mockShapes, [mockGroup]);

      // Select shapes that are in a group
      mockStore.dispatch({ 
        type: 'ui/setSelectedShapeIds', 
        payload: ['shape-1', 'shape-2'] 
      });

      // Trigger ungroup via keyboard shortcut
      fireEvent.keyDown(document, { key: 'G', ctrlKey: true, shiftKey: true });

      await waitFor(() => {
        expect(mockOnGroupDeleted).toHaveBeenCalledWith('existing-group');
      });
    });

    it('should not ungroup when no shapes are selected', async () => {
      renderCanvasContainer();

      // Trigger ungroup without selection
      fireEvent.keyDown(document, { key: 'G', ctrlKey: true, shiftKey: true });

      await waitFor(() => {
        expect(mockOnGroupDeleted).not.toHaveBeenCalled();
      });
    });

    it('should not ungroup when selected shapes are not in groups', async () => {
      const { GroupService } = require('@/services/groupService');
      GroupService.isShapeInGroup.mockReturnValue(null);

      renderCanvasContainer();

      // Select shapes that are not in groups
      mockStore.dispatch({ 
        type: 'ui/setSelectedShapeIds', 
        payload: ['shape-3'] 
      });

      // Trigger ungroup
      fireEvent.keyDown(document, { key: 'G', ctrlKey: true, shiftKey: true });

      await waitFor(() => {
        expect(mockOnGroupDeleted).not.toHaveBeenCalled();
      });
    });
  });

  describe('Group Operations State Management', () => {
    it('should provide correct group operations state to parent', async () => {
      const { GroupService } = require('@/services/groupService');
      GroupService.canGroupShapes.mockReturnValue(true);
      GroupService.isShapeInGroup.mockReturnValue(null);

      renderCanvasContainer();

      // Select multiple shapes
      mockStore.dispatch({ 
        type: 'ui/setSelectedShapeIds', 
        payload: ['shape-1', 'shape-2'] 
      });

      await waitFor(() => {
        expect(mockOnGroupOperationsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            canCreateGroup: true,
            canUngroupShapes: false,
            selectedGroup: null,
          })
        );
      });
    });

    it('should update group operations state when selection changes', async () => {
      const mockGroup: Group = {
        id: 'existing-group',
        shapeIds: ['shape-1', 'shape-2'],
        bounds: { x: 100, y: 100, width: 230, height: 130 },
        locked: false,
      };

      const { GroupService } = require('@/services/groupService');
      GroupService.canGroupShapes.mockReturnValue(false);
      GroupService.isShapeInGroup.mockImplementation((shapeId: string) => {
        if (shapeId === 'shape-1' || shapeId === 'shape-2') {
          return mockGroup;
        }
        return null;
      });

      renderCanvasContainer(mockShapes, [mockGroup]);

      // Select shapes that are in a group
      mockStore.dispatch({ 
        type: 'ui/setSelectedShapeIds', 
        payload: ['shape-1', 'shape-2'] 
      });

      await waitFor(() => {
        expect(mockOnGroupOperationsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            canCreateGroup: false,
            canUngroupShapes: true,
          })
        );
      });
    });
  });

  describe('Yjs Synchronization', () => {
    it('should call Yjs methods when group operations are performed', async () => {
      const { useYjsSync } = require('@/hooks/useYjsSync');
      const mockYjsSync = {
        updateShape: jest.fn(),
        addGroup: jest.fn(),
        updateGroup: jest.fn(),
        deleteGroup: jest.fn(),
      };
      useYjsSync.mockReturnValue(mockYjsSync);

      const { GroupService } = require('@/services/groupService');
      GroupService.canGroupShapes.mockReturnValue(true);
      GroupService.createGroup.mockReturnValue({
        id: 'test-group-id',
        shapeIds: ['shape-1', 'shape-2'],
        bounds: { x: 100, y: 100, width: 230, height: 130 },
        locked: false,
      });

      renderCanvasContainer();

      // Select multiple shapes
      mockStore.dispatch({ 
        type: 'ui/setSelectedShapeIds', 
        payload: ['shape-1', 'shape-2'] 
      });

      // Trigger group creation
      fireEvent.keyDown(document, { key: 'g', ctrlKey: true });

      await waitFor(() => {
        expect(mockYjsSync.addGroup).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'test-group-id',
            shapeIds: ['shape-1', 'shape-2'],
          })
        );
        expect(mockYjsSync.updateShape).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle group creation failure gracefully', async () => {
      const { GroupService } = require('@/services/groupService');
      GroupService.canGroupShapes.mockReturnValue(true);
      GroupService.createGroup.mockReturnValue(null); // Simulate failure

      renderCanvasContainer();

      // Select multiple shapes
      mockStore.dispatch({ 
        type: 'ui/setSelectedShapeIds', 
        payload: ['shape-1', 'shape-2'] 
      });

      // Trigger group creation
      fireEvent.keyDown(document, { key: 'g', ctrlKey: true });

      await waitFor(() => {
        expect(mockOnGroupCreated).not.toHaveBeenCalled();
      });
    });

    it('should handle missing group data gracefully', async () => {
      renderCanvasContainer(mockShapes, []);

      // Try to ungroup non-existent group
      mockStore.dispatch({ 
        type: 'ui/setSelectedShapeIds', 
        payload: ['shape-1'] 
      });

      fireEvent.keyDown(document, { key: 'G', ctrlKey: true, shiftKey: true });

      // Should not throw errors
      await waitFor(() => {
        expect(mockOnGroupDeleted).not.toHaveBeenCalled();
      });
    });
  });
});