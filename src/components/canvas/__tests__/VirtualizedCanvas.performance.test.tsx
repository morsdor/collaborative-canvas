import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { VirtualizedCanvas } from '../VirtualizedCanvas';
import { Shape } from '@/types';
import viewportReducer from '@/store/slices/viewportSlice';
import uiReducer from '@/store/slices/uiSlice';
import collaborationReducer from '@/store/slices/collaborationSlice';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(window, 'performance', {
  value: {
    now: mockPerformanceNow,
  },
});

// Mock requestAnimationFrame
let animationFrameCallbacks: (() => void)[] = [];
const mockRequestAnimationFrame = jest.fn((callback: () => void) => {
  animationFrameCallbacks.push(callback);
  return animationFrameCallbacks.length;
});
const mockCancelAnimationFrame = jest.fn((id: number) => {
  animationFrameCallbacks = animationFrameCallbacks.filter((_, index) => index + 1 !== id);
});

Object.defineProperty(window, 'requestAnimationFrame', {
  value: mockRequestAnimationFrame,
});
Object.defineProperty(window, 'cancelAnimationFrame', {
  value: mockCancelAnimationFrame,
});

// Helper to trigger animation frames
const triggerAnimationFrame = () => {
  const callbacks = [...animationFrameCallbacks];
  animationFrameCallbacks = [];
  callbacks.forEach(callback => callback());
};

// Create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      viewport: viewportReducer,
      ui: uiReducer,
      collaboration: collaborationReducer,
    },
    preloadedState: {
      viewport: {
        zoom: 1,
        panOffset: { x: 0, y: 0 },
        canvasSize: { width: 1920, height: 1080 },
        visibleBounds: { x: 0, y: 0, width: 1920, height: 1080 },
      },
      ui: {
        currentTool: 'select' as const,
        selectedShapeIds: [],
        panels: {
          colorPicker: { open: false, position: { x: 0, y: 0 } },
          properties: { open: false },
        },
      },
      collaboration: {
        users: [],
        connectionStatus: 'connected' as const,
      },
    },
  });
};

// Generate test shapes
const generateShapes = (count: number): Shape[] => {
  const shapes: Shape[] = [];
  
  for (let i = 0; i < count; i++) {
    shapes.push({
      id: `shape-${i}`,
      type: i % 4 === 0 ? 'rectangle' : i % 4 === 1 ? 'circle' : i % 4 === 2 ? 'text' : 'line',
      position: {
        x: (i % 50) * 100,
        y: Math.floor(i / 50) * 100,
      },
      dimensions: {
        width: 80,
        height: 60,
      },
      style: {
        fill: `hsl(${(i * 137.5) % 360}, 70%, 50%)`,
        stroke: '#000000',
        strokeWidth: 2,
        opacity: 1,
      },
      content: i % 4 === 2 ? `Text ${i}` : undefined,
    });
  }
  
  return shapes;
};

describe('VirtualizedCanvas Performance Tests', () => {
  let store: ReturnType<typeof createTestStore>;
  let timeCounter = 0;

  beforeEach(() => {
    store = createTestStore();
    timeCounter = 0;
    mockPerformanceNow.mockImplementation(() => {
      timeCounter += 16.67; // Simulate 60fps
      return timeCounter;
    });
    animationFrameCallbacks = [];
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining animation frames
    animationFrameCallbacks = [];
  });

  describe('Shape Culling Performance', () => {
    it('should efficiently cull shapes outside viewport', async () => {
      const shapes = generateShapes(2000);
      
      render(
        <Provider store={store}>
          <VirtualizedCanvas
            shapes={shapes}
            enableSpatialIndexing={true}
            cullingPadding={100}
          />
        </Provider>
      );

      // Trigger initial render
      triggerAnimationFrame();

      // Check that performance metrics are displayed
      await waitFor(() => {
        expect(screen.getByText(/Visible:/)).toBeInTheDocument();
        expect(screen.getByText(/Culled:/)).toBeInTheDocument();
      });

      // With default viewport (1920x1080), only shapes in that area should be visible
      const visibleText = screen.getByText(/Visible: \d+\/2000/);
      const visibleMatch = visibleText.textContent?.match(/Visible: (\d+)\/2000/);
      const visibleCount = visibleMatch ? parseInt(visibleMatch[1]) : 0;

      // Should cull most shapes that are outside the viewport
      expect(visibleCount).toBeLessThan(500);
      expect(visibleCount).toBeGreaterThan(0);
    });

    it('should maintain good performance with spatial indexing enabled', async () => {
      const shapes = generateShapes(1500);
      
      render(
        <Provider store={store}>
          <VirtualizedCanvas
            shapes={shapes}
            enableSpatialIndexing={true}
          />
        </Provider>
      );

      // Simulate multiple render frames
      for (let i = 0; i < 10; i++) {
        triggerAnimationFrame();
        timeCounter += 16.67; // Maintain 60fps timing
      }

      await waitFor(() => {
        const fpsText = screen.getByText(/FPS:/);
        expect(fpsText).toBeInTheDocument();
        
        // Should maintain close to 60fps
        const fpsMatch = fpsText.textContent?.match(/FPS: ([\d.]+)/);
        const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
        expect(fps).toBeGreaterThan(45); // Allow some tolerance
      });
    });
  });

  describe('Level of Detail Rendering', () => {
    it('should apply different rendering modes based on zoom level', async () => {
      const shapes = generateShapes(1000);
      
      // Test with very low zoom (should use placeholder rendering)
      store.dispatch({ 
        type: 'viewport/setZoom', 
        payload: 0.1 
      });

      render(
        <Provider store={store}>
          <VirtualizedCanvas
            shapes={shapes}
            enableLevelOfDetail={true}
          />
        </Provider>
      );

      triggerAnimationFrame();

      await waitFor(() => {
        // Should show placeholder count
        expect(screen.getByText(/Placeholder:/)).toBeInTheDocument();
        
        const placeholderText = screen.getByText(/Placeholder: \d+/);
        const placeholderMatch = placeholderText.textContent?.match(/Placeholder: (\d+)/);
        const placeholderCount = placeholderMatch ? parseInt(placeholderMatch[1]) : 0;
        
        // At very low zoom, most visible shapes should be placeholders
        expect(placeholderCount).toBeGreaterThan(0);
      });
    });

    it('should switch to simplified rendering under performance pressure', async () => {
      const shapes = generateShapes(1200);
      
      // Simulate poor performance by making render time high
      mockPerformanceNow.mockImplementation(() => {
        timeCounter += 50; // Simulate 20fps (poor performance)
        return timeCounter;
      });

      render(
        <Provider store={store}>
          <VirtualizedCanvas
            shapes={shapes}
            enableLevelOfDetail={true}
          />
        </Provider>
      );

      // Trigger several frames to establish performance baseline
      for (let i = 0; i < 5; i++) {
        triggerAnimationFrame();
      }

      await waitFor(() => {
        const simplifiedText = screen.getByText(/Simplified:/);
        expect(simplifiedText).toBeInTheDocument();
        
        // Should show performance warning
        expect(screen.getByText('POOR')).toBeInTheDocument();
      });
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle 1000+ shapes while maintaining 60fps target', async () => {
      const shapes = generateShapes(1500);
      
      render(
        <Provider store={store}>
          <VirtualizedCanvas
            shapes={shapes}
            enableSpatialIndexing={true}
            enableLevelOfDetail={true}
          />
        </Provider>
      );

      // Simulate sustained rendering
      for (let i = 0; i < 20; i++) {
        triggerAnimationFrame();
        timeCounter += 16.67; // Maintain 60fps timing
      }

      await waitFor(() => {
        const fpsText = screen.getByText(/FPS:/);
        const renderText = screen.getByText(/Render:/);
        
        expect(fpsText).toBeInTheDocument();
        expect(renderText).toBeInTheDocument();
        
        // Check FPS is acceptable
        const fpsMatch = fpsText.textContent?.match(/FPS: ([\d.]+)/);
        const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
        expect(fps).toBeGreaterThan(45);
        
        // Check render time is reasonable
        const renderMatch = renderText.textContent?.match(/Render: ([\d.]+)ms/);
        const renderTime = renderMatch ? parseFloat(renderMatch[1]) : 0;
        expect(renderTime).toBeLessThan(20); // Should render within 20ms
      });
    });

    it('should efficiently handle mouse interactions with large datasets', async () => {
      const shapes = generateShapes(2000);
      const mockShapeClick = jest.fn();
      
      render(
        <Provider store={store}>
          <VirtualizedCanvas
            shapes={shapes}
            onShapeClick={mockShapeClick}
            enableSpatialIndexing={true}
          />
        </Provider>
      );

      triggerAnimationFrame();

      const canvas = screen.getByRole('img', { hidden: true }) || document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      // Simulate click on a shape that should be visible
      const clickStart = performance.now();
      fireEvent.mouseDown(canvas!, {
        clientX: 50, // Should hit shape at position (0, 0)
        clientY: 50,
        button: 0,
      });
      const clickEnd = performance.now();

      // Click handling should be fast even with many shapes
      expect(clickEnd - clickStart).toBeLessThan(10);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during continuous rendering', async () => {
      const shapes = generateShapes(800);
      
      const { unmount } = render(
        <Provider store={store}>
          <VirtualizedCanvas
            shapes={shapes}
            enableSpatialIndexing={true}
          />
        </Provider>
      );

      // Simulate many render cycles
      for (let i = 0; i < 100; i++) {
        triggerAnimationFrame();
      }

      // Should not accumulate animation frame callbacks
      expect(animationFrameCallbacks.length).toBeLessThanOrEqual(1);

      // Cleanup should work properly
      unmount();
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Viewport Changes', () => {
    it('should efficiently update visible shapes when viewport changes', async () => {
      const shapes = generateShapes(1000);
      
      render(
        <Provider store={store}>
          <VirtualizedCanvas
            shapes={shapes}
            enableSpatialIndexing={true}
          />
        </Provider>
      );

      triggerAnimationFrame();

      // Get initial visible count
      await waitFor(() => {
        expect(screen.getByText(/Visible:/)).toBeInTheDocument();
      });

      const initialVisibleText = screen.getByText(/Visible: \d+\/1000/);
      const initialMatch = initialVisibleText.textContent?.match(/Visible: (\d+)\/1000/);
      const initialVisible = initialMatch ? parseInt(initialMatch[1]) : 0;

      // Pan to a different area
      store.dispatch({
        type: 'viewport/setPanOffset',
        payload: { x: 1000, y: 1000 }
      });

      triggerAnimationFrame();

      await waitFor(() => {
        const newVisibleText = screen.getByText(/Visible: \d+\/1000/);
        const newMatch = newVisibleText.textContent?.match(/Visible: (\d+)\/1000/);
        const newVisible = newMatch ? parseInt(newMatch[1]) : 0;

        // Visible count should change as we pan to different shapes
        expect(newVisible).not.toBe(initialVisible);
      });
    });

    it('should handle zoom changes efficiently', async () => {
      const shapes = generateShapes(800);
      
      render(
        <Provider store={store}>
          <VirtualizedCanvas
            shapes={shapes}
            enableLevelOfDetail={true}
          />
        </Provider>
      );

      triggerAnimationFrame();

      // Zoom out significantly
      store.dispatch({
        type: 'viewport/setZoom',
        payload: 0.2
      });

      triggerAnimationFrame();

      await waitFor(() => {
        // At low zoom, should see more shapes but many as placeholders
        const visibleText = screen.getByText(/Visible:/);
        const placeholderText = screen.getByText(/Placeholder:/);
        
        expect(visibleText).toBeInTheDocument();
        expect(placeholderText).toBeInTheDocument();
        
        const placeholderMatch = placeholderText.textContent?.match(/Placeholder: (\d+)/);
        const placeholderCount = placeholderMatch ? parseInt(placeholderMatch[1]) : 0;
        
        // Should have placeholder shapes at low zoom
        expect(placeholderCount).toBeGreaterThan(0);
      });
    });
  });
});