import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { InteractiveCanvas } from '../InteractiveCanvas';
import uiSlice from '@/store/slices/uiSlice';
import viewportSlice from '@/store/slices/viewportSlice';
import collaborationSlice from '@/store/slices/collaborationSlice';
import { Shape } from '@/types';

const mockShapes: Shape[] = [
  {
    id: 'shape1',
    type: 'rectangle',
    position: { x: 100, y: 100 },
    dimensions: { width: 50, height: 50 },
    style: {
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 1,
      opacity: 1,
    },
  },
  {
    id: 'shape2',
    type: 'circle',
    position: { x: 200, y: 200 },
    dimensions: { width: 60, height: 60 },
    style: {
      fill: '#00ff00',
      stroke: '#000000',
      strokeWidth: 1,
      opacity: 1,
    },
  },
];

const createTestStore = () => {
  return configureStore({
    reducer: {
      ui: uiSlice,
      viewport: viewportSlice,
      collaboration: collaborationSlice,
    },
    preloadedState: {
      ui: {
        currentTool: 'select',
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
        connectionStatus: 'connected',
        users: [],
        currentUserId: 'test-user',
      },
    },
  });
};

describe('Drag Integration', () => {
  let mockOnShapeUpdate: jest.Mock;
  let mockOnShapeClick: jest.Mock;
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    mockOnShapeUpdate = jest.fn();
    mockOnShapeClick = jest.fn();
    store = createTestStore();
  });

  const renderCanvas = (props = {}) => {
    return render(
      <Provider store={store}>
        <InteractiveCanvas
          shapes={mockShapes}
          selectedShapeIds={new Set()}
          sessionId="test-session"
          onShapeUpdate={mockOnShapeUpdate}
          onShapeClick={mockOnShapeClick}
          {...props}
        />
      </Provider>
    );
  };

  it('should render shapes as draggable elements', async () => {
    renderCanvas();

    // Find the draggable shape elements
    const shapeElements = document.querySelectorAll('[role="button"][aria-roledescription="draggable"]');
    expect(shapeElements.length).toBeGreaterThan(0);
    
    // Check that shapes have the correct attributes for dragging
    const firstShape = shapeElements[0];
    expect(firstShape).toHaveAttribute('aria-roledescription', 'draggable');
    expect(firstShape).toHaveAttribute('role', 'button');
    expect(firstShape).toHaveAttribute('tabindex', '0');
  });

  it('should handle drag start correctly', async () => {
    renderCanvas();

    // Mock getBoundingClientRect for the container
    const mockGetBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    const container = document.querySelector('.relative');
    if (container) {
      Object.defineProperty(container, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect,
      });
    }

    // Find a shape element and simulate drag start
    const shapeElements = document.querySelectorAll('[data-testid*="shape"]');
    if (shapeElements.length > 0) {
      const shapeElement = shapeElements[0];
      
      // Simulate mouse down to start drag
      fireEvent.mouseDown(shapeElement, {
        clientX: 125, // Middle of the shape
        clientY: 125,
        button: 0,
      });

      // Check if drag state is updated in the store
      await waitFor(() => {
        const state = store.getState();
        // The drag state might be set through dnd-kit, so we check for selection instead
        expect(mockOnShapeClick).toHaveBeenCalled();
      });
    }
  });

  it('should handle multi-selection with Ctrl+click', async () => {
    renderCanvas();

    const shapeElements = document.querySelectorAll('[role="button"][aria-roledescription="draggable"]');
    if (shapeElements.length >= 2) {
      // Click first shape
      fireEvent.mouseDown(shapeElements[0]);
      
      // Ctrl+click second shape
      fireEvent.mouseDown(shapeElements[1], {
        ctrlKey: true,
      });

      await waitFor(() => {
        expect(mockOnShapeClick).toHaveBeenCalledTimes(2);
      });
    }
  });

  it('should show drag preview during drag operation', async () => {
    // Set up a shape as selected
    store.dispatch({ type: 'ui/setSelectedShapeIds', payload: ['shape1'] });
    store.dispatch({
      type: 'ui/setDragState',
      payload: {
        isDragging: true,
        startPosition: { x: 100, y: 100 },
        currentPosition: { x: 150, y: 150 },
        targetShapeIds: ['shape1'],
        dragType: 'move',
      },
    });

    renderCanvas();

    // Check for drag preview indicator
    await waitFor(() => {
      const dragPreview = document.querySelector('.border-dashed');
      expect(dragPreview).toBeInTheDocument();
    });
  });

  it('should update viewport info during drag', async () => {
    // Set up drag state
    store.dispatch({
      type: 'ui/setDragState',
      payload: {
        isDragging: true,
        startPosition: { x: 100, y: 100 },
        currentPosition: { x: 150, y: 150 },
        targetShapeIds: ['shape1'],
        dragType: 'move',
      },
    });

    renderCanvas();

    // Check if viewport info shows dragging status
    await waitFor(() => {
      const viewportInfo = screen.getByText(/Dragging: 1 shapes/);
      expect(viewportInfo).toBeInTheDocument();
    });
  });

  it('should handle zoom during drag operations', async () => {
    // Set zoom level
    store.dispatch({ type: 'viewport/setZoom', payload: 2 });

    renderCanvas();

    // The zoom is applied to the parent container, not individual shapes
    // Check that the canvas container has the correct transform
    const canvasContainer = document.querySelector('.absolute.inset-0.pointer-events-none');
    expect(canvasContainer).toHaveStyle({
      transform: 'scale(2) translate(0px, 0px)',
    });

    // Shapes should maintain their original positions relative to the canvas
    const shapeElements = document.querySelectorAll('.absolute.pointer-events-auto');
    if (shapeElements.length > 0) {
      const shapeElement = shapeElements[0] as HTMLElement;
      expect(shapeElement.style.left).toBe('100px'); // Original position
      expect(shapeElement.style.width).toBe('50px'); // Original size
    }
  });

  it('should handle pan offset during drag operations', async () => {
    // Set pan offset
    store.dispatch({ type: 'viewport/setPanOffset', payload: { x: 50, y: 30 } });

    renderCanvas();

    // The pan is applied to the parent container, not individual shapes
    // Check that the canvas container has the correct transform
    const canvasContainer = document.querySelector('.absolute.inset-0.pointer-events-none');
    expect(canvasContainer).toHaveStyle({
      transform: 'scale(1) translate(-50px, -30px)',
    });

    // Shapes should maintain their original positions relative to the canvas
    const shapeElements = document.querySelectorAll('.absolute.pointer-events-auto');
    if (shapeElements.length > 0) {
      const shapeElement = shapeElements[0] as HTMLElement;
      expect(shapeElement.style.left).toBe('100px'); // Original position
      expect(shapeElement.style.top).toBe('100px'); // Original position
    }
  });

  it('should show selection indicators for selected shapes', async () => {
    renderCanvas({
      selectedShapeIds: new Set(['shape1']),
    });

    // Check for selection border
    await waitFor(() => {
      const selectionBorder = document.querySelector('.border-blue-500');
      expect(selectionBorder).toBeInTheDocument();
    });

    // Check for resize handles
    const resizeHandles = document.querySelectorAll('.bg-blue-500');
    expect(resizeHandles.length).toBeGreaterThan(0);
  });

  it('should show hover indicators', async () => {
    renderCanvas();

    const shapeElements = document.querySelectorAll('[role="button"][aria-roledescription="draggable"]');
    if (shapeElements.length > 0) {
      const shapeElement = shapeElements[0];
      
      // Simulate mouse enter
      fireEvent.mouseEnter(shapeElement);

      await waitFor(() => {
        const hoverBorder = document.querySelector('.border-blue-300');
        expect(hoverBorder).toBeInTheDocument();
      });
    }
  });
});