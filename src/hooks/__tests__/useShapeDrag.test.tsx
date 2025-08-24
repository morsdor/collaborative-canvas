import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useShapeDrag } from '../useShapeDrag';
import uiSlice from '@/store/slices/uiSlice';
import { Shape, Point } from '@/types';

// Mock shapes for testing
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
    },
  });
};

function createWrapper(store: ReturnType<typeof createTestStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe('useShapeDrag', () => {
  let mockOnShapeUpdate: jest.Mock;
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    mockOnShapeUpdate = jest.fn();
    store = createTestStore();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(
      () => useShapeDrag({
        onShapeUpdate: mockOnShapeUpdate,
        shapes: mockShapes,
      }),
      { wrapper: createWrapper(store) }
    );

    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggedShapeIds).toEqual([]);
  });

  it('should start drag operation correctly', () => {
    const { result } = renderHook(
      () => useShapeDrag({
        onShapeUpdate: mockOnShapeUpdate,
        shapes: mockShapes,
      }),
      { wrapper: createWrapper(store) }
    );

    const startPosition: Point = { x: 100, y: 100 };
    const shapeIds = ['shape1'];

    act(() => {
      result.current.startDrag(shapeIds, startPosition);
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.draggedShapeIds).toEqual(shapeIds);
  });

  it('should update drag position and call onShapeUpdate', () => {
    const { result } = renderHook(
      () => useShapeDrag({
        onShapeUpdate: mockOnShapeUpdate,
        shapes: mockShapes,
      }),
      { wrapper: createWrapper(store) }
    );

    const startPosition: Point = { x: 100, y: 100 };
    const shapeIds = ['shape1'];

    // Start drag
    act(() => {
      result.current.startDrag(shapeIds, startPosition);
    });

    // Update drag position
    const newPosition: Point = { x: 150, y: 150 };
    act(() => {
      result.current.updateDrag(newPosition);
    });

    expect(mockOnShapeUpdate).toHaveBeenCalledWith('shape1', {
      position: { x: 150, y: 150 }, // Original position (100,100) + offset (50,50)
    });
  });

  it('should snap to grid when enabled', () => {
    const { result } = renderHook(
      () => useShapeDrag({
        onShapeUpdate: mockOnShapeUpdate,
        shapes: mockShapes,
        snapToGrid: true,
        gridSize: 20,
      }),
      { wrapper: createWrapper(store) }
    );

    const startPosition: Point = { x: 100, y: 100 };
    const shapeIds = ['shape1'];

    // Start drag
    act(() => {
      result.current.startDrag(shapeIds, startPosition);
    });

    // Update drag position to a non-grid-aligned position
    const newPosition: Point = { x: 137, y: 143 };
    act(() => {
      result.current.updateDrag(newPosition);
    });

    // Should snap to nearest grid position
    expect(mockOnShapeUpdate).toHaveBeenCalledWith('shape1', {
      position: { x: 140, y: 140 }, // Snapped to 20px grid
    });
  });

  it('should handle multiple shapes during drag', () => {
    const { result } = renderHook(
      () => useShapeDrag({
        onShapeUpdate: mockOnShapeUpdate,
        shapes: mockShapes,
      }),
      { wrapper: createWrapper(store) }
    );

    const startPosition: Point = { x: 100, y: 100 };
    const shapeIds = ['shape1', 'shape2'];

    // Start drag
    act(() => {
      result.current.startDrag(shapeIds, startPosition);
    });

    // Update drag position
    const newPosition: Point = { x: 150, y: 150 };
    act(() => {
      result.current.updateDrag(newPosition);
    });

    expect(mockOnShapeUpdate).toHaveBeenCalledTimes(2);
    expect(mockOnShapeUpdate).toHaveBeenCalledWith('shape1', {
      position: { x: 150, y: 150 },
    });
    expect(mockOnShapeUpdate).toHaveBeenCalledWith('shape2', {
      position: { x: 250, y: 250 }, // Original position (200,200) + offset (50,50)
    });
  });

  it('should end drag operation correctly', () => {
    const { result } = renderHook(
      () => useShapeDrag({
        onShapeUpdate: mockOnShapeUpdate,
        shapes: mockShapes,
      }),
      { wrapper: createWrapper(store) }
    );

    const startPosition: Point = { x: 100, y: 100 };
    const shapeIds = ['shape1'];

    // Start drag
    act(() => {
      result.current.startDrag(shapeIds, startPosition);
    });

    expect(result.current.isDragging).toBe(true);

    // End drag
    act(() => {
      result.current.endDrag();
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggedShapeIds).toEqual([]);
  });

  it('should calculate drag offset correctly', () => {
    const { result } = renderHook(
      () => useShapeDrag({
        onShapeUpdate: mockOnShapeUpdate,
        shapes: mockShapes,
      }),
      { wrapper: createWrapper(store) }
    );

    const startPosition: Point = { x: 100, y: 100 };
    const shapeIds = ['shape1'];

    // Start drag
    act(() => {
      result.current.startDrag(shapeIds, startPosition);
    });

    // Update drag position
    const newPosition: Point = { x: 150, y: 175 };
    act(() => {
      result.current.updateDrag(newPosition);
    });

    const offset = result.current.getDragOffset();
    expect(offset).toEqual({ x: 50, y: 75 });
  });

  it('should not update when not dragging', () => {
    const { result } = renderHook(
      () => useShapeDrag({
        onShapeUpdate: mockOnShapeUpdate,
        shapes: mockShapes,
      }),
      { wrapper: createWrapper(store) }
    );

    // Try to update without starting drag
    const newPosition: Point = { x: 150, y: 150 };
    act(() => {
      result.current.updateDrag(newPosition);
    });

    expect(mockOnShapeUpdate).not.toHaveBeenCalled();
  });
});