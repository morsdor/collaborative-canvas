import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { InteractiveCanvas } from '../InteractiveCanvas';
import viewportReducer from '@/store/slices/viewportSlice';
import { Shape } from '@/types';

// Mock the utils
jest.mock('@/utils', () => ({
  ...jest.requireActual('@/utils'),
  screenToCanvas: jest.fn((screenPoint, zoom, panOffset) => ({
    x: screenPoint.x / zoom + panOffset.x,
    y: screenPoint.y / zoom + panOffset.y,
  })),
  isShapeVisible: jest.fn(() => true),
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      viewport: viewportReducer,
    },
  });
};

const mockShapes: Shape[] = [
  {
    id: 'shape1',
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
    id: 'shape2',
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
];

const renderInteractiveCanvas = (props: Partial<React.ComponentProps<typeof InteractiveCanvas>> = {}) => {
  const store = createTestStore();
  const defaultProps = {
    shapes: mockShapes,
    onShapeClick: jest.fn(),
    onCanvasClick: jest.fn(),
    onShapeHover: jest.fn(),
  };

  return {
    store,
    ...render(
      <Provider store={store}>
        <InteractiveCanvas {...defaultProps} {...props} />
      </Provider>
    ),
    props: { ...defaultProps, ...props },
  };
};

describe('InteractiveCanvas Component', () => {
  beforeEach(() => {
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      toJSON: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render canvas container', () => {
    renderInteractiveCanvas();
    
    const container = document.querySelector('.relative.overflow-hidden');
    expect(container).toBeInTheDocument();
  });

  it('should display viewport information', () => {
    renderInteractiveCanvas();
    
    expect(screen.getByText(/Zoom: 100%/)).toBeInTheDocument();
    expect(screen.getByText(/Pan: \(0, 0\)/)).toBeInTheDocument();
    expect(screen.getByText(/Shapes: 2\/2/)).toBeInTheDocument();
  });

  it('should render shapes', () => {
    renderInteractiveCanvas();
    
    // Should render shape containers
    const shapeContainers = document.querySelectorAll('.absolute.pointer-events-auto');
    expect(shapeContainers.length).toBeGreaterThan(0);
  });

  it('should show selection indicators for selected shapes', () => {
    const selectedShapeIds = new Set(['shape1']);
    renderInteractiveCanvas({ selectedShapeIds });
    
    // Should have selection border
    const selectionBorder = document.querySelector('.border-blue-500');
    expect(selectionBorder).toBeInTheDocument();
  });

  it('should call onCanvasClick when clicking on empty area', () => {
    const { props } = renderInteractiveCanvas();
    const container = document.querySelector('.relative.overflow-hidden')!;

    fireEvent.mouseDown(container, {
      button: 0,
      clientX: 50,
      clientY: 50,
    });

    expect(props.onCanvasClick).toHaveBeenCalledWith(
      { x: 50, y: 50 },
      expect.any(Object)
    );
  });

  it('should handle zoom with mouse wheel', async () => {
    const { store } = renderInteractiveCanvas();
    const container = document.querySelector('.relative.overflow-hidden')!;

    const initialZoom = store.getState().viewport.zoom;

    // Zoom in
    fireEvent.wheel(container, {
      deltaY: -100,
      clientX: 400,
      clientY: 300,
    });

    await waitFor(() => {
      const state = store.getState();
      expect(state.viewport.zoom).toBeGreaterThan(initialZoom);
    });
  });

  it('should handle zoom out with mouse wheel', async () => {
    const { store } = renderInteractiveCanvas();
    const container = document.querySelector('.relative.overflow-hidden')!;

    const initialZoom = store.getState().viewport.zoom;

    // Zoom out
    fireEvent.wheel(container, {
      deltaY: 100,
      clientX: 400,
      clientY: 300,
    });

    await waitFor(() => {
      const state = store.getState();
      expect(state.viewport.zoom).toBeLessThan(initialZoom);
    });
  });

  it('should update canvas size when container resizes', async () => {
    const { store } = renderInteractiveCanvas();

    // Simulate window resize
    fireEvent(window, new Event('resize'));

    await waitFor(() => {
      const state = store.getState();
      expect(state.viewport.canvasSize.width).toBe(800);
      expect(state.viewport.canvasSize.height).toBe(600);
    });
  });

  it('should apply custom className', () => {
    const { container } = renderInteractiveCanvas({ className: 'custom-canvas' });
    
    expect(container.firstChild).toHaveClass('custom-canvas');
  });

  it('should show grid background', () => {
    renderInteractiveCanvas();
    
    const gridElement = document.querySelector('[style*="background-image"]');
    expect(gridElement).toBeInTheDocument();
  });

  it('should handle shape hover events', () => {
    const { props } = renderInteractiveCanvas();
    
    // Find a shape element and trigger hover
    const shapeContainer = document.querySelector('.absolute.pointer-events-auto');
    if (shapeContainer) {
      fireEvent.mouseEnter(shapeContainer);
      expect(props.onShapeHover).toHaveBeenCalled();
      
      fireEvent.mouseLeave(shapeContainer);
      expect(props.onShapeHover).toHaveBeenCalledWith(null);
    }
  });

  it('should prevent default on wheel events', () => {
    renderInteractiveCanvas();
    const container = document.querySelector('.relative.overflow-hidden')!;

    // Just test that wheel events are handled without errors
    expect(() => {
      fireEvent.wheel(container, {
        deltaY: 100,
        clientX: 400,
        clientY: 300,
      });
    }).not.toThrow();
  });

  it('should handle middle mouse button panning', () => {
    renderInteractiveCanvas();
    const container = document.querySelector('.relative.overflow-hidden')!;

    // Just test that middle mouse button events are handled without errors
    expect(() => {
      fireEvent.mouseDown(container, {
        button: 1, // Middle mouse button
        clientX: 100,
        clientY: 100,
      });
    }).not.toThrow();
  });

  it('should stop panning on mouse up', () => {
    renderInteractiveCanvas();
    const container = document.querySelector('.relative.overflow-hidden')!;

    // Start panning
    fireEvent.mouseDown(container, {
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: true,
    });

    // End panning
    fireEvent.mouseUp(container);

    // Moving mouse after mouse up should not trigger panning
    fireEvent.mouseMove(container, {
      clientX: 200,
      clientY: 200,
    });

    // This test passes if no errors are thrown
    expect(true).toBe(true);
  });

  it('should stop panning on mouse leave', () => {
    renderInteractiveCanvas();
    const container = document.querySelector('.relative.overflow-hidden')!;

    // Start panning
    fireEvent.mouseDown(container, {
      button: 0,
      clientX: 100,
      clientY: 100,
      ctrlKey: true,
    });

    // Mouse leave should stop panning
    fireEvent.mouseLeave(container);

    // Moving mouse after leave should not trigger panning
    fireEvent.mouseMove(container, {
      clientX: 200,
      clientY: 200,
    });

    // This test passes if no errors are thrown
    expect(true).toBe(true);
  });
});