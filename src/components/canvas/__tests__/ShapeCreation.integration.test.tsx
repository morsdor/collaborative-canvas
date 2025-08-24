import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CanvasContainer } from '../CanvasContainer';
import uiReducer, { setCurrentTool } from '@/store/slices/uiSlice';
import viewportReducer from '@/store/slices/viewportSlice';
import collaborationReducer from '@/store/slices/collaborationSlice';

// Mock the Yjs integration
jest.mock('@/hooks/useYjsSync', () => ({
  useYjsSync: jest.fn(() => ({
    getAllShapes: jest.fn(() => []),
    addShape: jest.fn(),
    isConnected: true,
  })),
}));

// Mock the shape creation service
jest.mock('@/services/shapeCreationService', () => ({
  ShapeCreationService: {
    validateShapeCreation: jest.fn(() => true),
    createShapeAtPosition: jest.fn((type, position) => ({
      id: `test-${type}-${Date.now()}`,
      type,
      position,
      dimensions: { width: 100, height: 80 },
      style: {
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2,
        opacity: 1,
      },
    })),
  },
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      ui: uiReducer,
      viewport: viewportReducer,
      collaboration: collaborationReducer,
    },
    preloadedState: {
      ui: {
        currentTool: 'rectangle',
        selectedShapeIds: [],
        panels: {
          colorPicker: { open: false, position: { x: 0, y: 0 } },
          properties: { open: false },
        },
        dragState: null,
        isMultiSelecting: false,
        selectionRectangle: null,
      },
      viewport: {
        zoom: 1,
        panOffset: { x: 0, y: 0 },
        canvasSize: { width: 800, height: 600 },
        visibleBounds: { x: 0, y: 0, width: 800, height: 600 },
      },
      collaboration: {
        users: [],
        currentUserId: 'test-user',
        connectionStatus: 'connected' as const,
      },
    },
  });
};

describe('Shape Creation Integration', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    jest.clearAllMocks();
  });

  const renderCanvasWithStore = () => {
    return render(
      <Provider store={store}>
        <CanvasContainer sessionId="test-session" />
      </Provider>
    );
  };

  it('should render canvas container without errors', () => {
    renderCanvasWithStore();
    
    // Check that the canvas is rendered
    const canvas = screen.getByRole('generic'); // The canvas div
    expect(canvas).toBeInTheDocument();
  });

  it('should change cursor style when tool changes', () => {
    renderCanvasWithStore();
    
    // Change tool to rectangle
    store.dispatch(setCurrentTool('rectangle'));
    
    // The cursor style should be updated (this is handled by CSS)
    // We can verify the tool state changed
    expect(store.getState().ui.currentTool).toBe('rectangle');
  });

  it('should handle canvas click when rectangle tool is selected', async () => {
    const { container } = renderCanvasWithStore();
    
    // Set tool to rectangle
    store.dispatch(setCurrentTool('rectangle'));
    
    // Find the canvas element
    const canvasElement = container.querySelector('[class*="relative overflow-hidden"]');
    expect(canvasElement).toBeInTheDocument();
    
    if (canvasElement) {
      // Mock getBoundingClientRect
      jest.spyOn(canvasElement, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Simulate click on canvas
      fireEvent.mouseDown(canvasElement, {
        button: 0,
        clientX: 100,
        clientY: 200,
      });

      // Wait for any async operations
      await waitFor(() => {
        // Verify that shape creation was attempted
        const { ShapeCreationService } = require('@/services/shapeCreationService');
        expect(ShapeCreationService.createShapeAtPosition).toHaveBeenCalled();
      });
    }
  });

  it('should not create shape when select tool is active', async () => {
    const { container } = renderCanvasWithStore();
    
    // Set tool to select
    store.dispatch(setCurrentTool('select'));
    
    // Find the canvas element
    const canvasElement = container.querySelector('[class*="relative overflow-hidden"]');
    
    if (canvasElement) {
      // Mock getBoundingClientRect
      jest.spyOn(canvasElement, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Simulate click on canvas
      fireEvent.mouseDown(canvasElement, {
        button: 0,
        clientX: 100,
        clientY: 200,
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify that shape creation was NOT attempted
      const { ShapeCreationService } = require('@/services/shapeCreationService');
      expect(ShapeCreationService.createShapeAtPosition).not.toHaveBeenCalled();
    }
  });

  it('should handle different shape tools', () => {
    renderCanvasWithStore();
    
    // Test different tools
    const tools = ['rectangle', 'circle', 'text', 'line'] as const;
    
    tools.forEach(tool => {
      store.dispatch(setCurrentTool(tool));
      expect(store.getState().ui.currentTool).toBe(tool);
    });
  });
});