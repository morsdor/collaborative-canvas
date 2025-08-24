import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useShapeCreation } from '../useShapeCreation';
import uiReducer from '@/store/slices/uiSlice';
import viewportReducer from '@/store/slices/viewportSlice';
import collaborationReducer from '@/store/slices/collaborationSlice';
import { Point, ShapeType } from '@/types';

// Mock the useYjsSync hook
jest.mock('../useYjsSync', () => ({
  useYjsSync: jest.fn(() => ({
    addShape: jest.fn(),
    isConnected: true,
  })),
}));

// Mock the ShapeCreationService
jest.mock('@/services/shapeCreationService', () => ({
  ShapeCreationService: {
    validateShapeCreation: jest.fn(() => true),
    createShapeAtPosition: jest.fn((type: ShapeType, position: Point) => ({
      id: 'test-shape-id',
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

const createTestStore = (initialState = {}) => {
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
        connectionStatus: 'connected',
      },
      ...initialState,
    },
  });
};

const renderHookWithProvider = (hook: any, store: any) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(Provider, { store }, children);
  };
  return renderHook(hook, { wrapper });
};

describe('useShapeCreation', () => {
  const mockOptions = {
    sessionId: 'test-session',
    onShapeCreated: jest.fn(),
    onCreationError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    const store = createTestStore();
    const { result } = renderHookWithProvider(
      () => useShapeCreation(mockOptions),
      store
    );

    expect(result.current.isCreatingShape).toBe(false);
    expect(result.current.previewShape).toBe(null);
    expect(typeof result.current.createShapeAtPosition).toBe('function');
    expect(typeof result.current.startShapeCreation).toBe('function');
    expect(typeof result.current.cancelShapeCreation).toBe('function');
  });

  it('should create shape at position when current tool is rectangle', async () => {
    const store = createTestStore();
    const { result } = renderHookWithProvider(
      () => useShapeCreation(mockOptions),
      store
    );

    const position: Point = { x: 100, y: 200 };

    await act(async () => {
      const shape = await result.current.createShapeAtPosition(position);
      expect(shape).toBeDefined();
      expect(shape?.type).toBe('rectangle');
      expect(shape?.position).toEqual(position);
    });

    expect(mockOptions.onShapeCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'rectangle',
        position,
      })
    );
  });

  it('should create shape with custom type override', async () => {
    const store = createTestStore();
    const { result } = renderHookWithProvider(
      () => useShapeCreation(mockOptions),
      store
    );

    const position: Point = { x: 50, y: 75 };

    await act(async () => {
      const shape = await result.current.createShapeAtPosition(position, 'circle');
      expect(shape?.type).toBe('circle');
    });
  });

  it('should handle creation error when tool is select', async () => {
    const store = createTestStore({
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
    });

    const { result } = renderHookWithProvider(
      () => useShapeCreation(mockOptions),
      store
    );

    const position: Point = { x: 100, y: 200 };

    await act(async () => {
      const shape = await result.current.createShapeAtPosition(position);
      expect(shape).toBe(null);
    });

    expect(mockOptions.onCreationError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot create shape: invalid tool 'select'",
      })
    );
  });

  it('should set isCreatingShape to true during creation', async () => {
    const store = createTestStore();
    const { result } = renderHookWithProvider(
      () => useShapeCreation(mockOptions),
      store
    );

    const position: Point = { x: 100, y: 200 };

    // Start creation
    const creationPromise = act(async () => {
      return result.current.createShapeAtPosition(position);
    });

    // Check that isCreatingShape is true during creation
    expect(result.current.isCreatingShape).toBe(true);

    // Wait for completion
    await creationPromise;

    // Check that isCreatingShape is false after creation
    expect(result.current.isCreatingShape).toBe(false);
  });

  it('should start shape creation by setting current tool', () => {
    const store = createTestStore();
    const { result } = renderHookWithProvider(
      () => useShapeCreation(mockOptions),
      store
    );

    act(() => {
      result.current.startShapeCreation('circle');
    });

    const state = store.getState();
    expect(state.ui.currentTool).toBe('circle');
  });

  it('should cancel shape creation and return to select tool', () => {
    const store = createTestStore({
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
    });

    const { result } = renderHookWithProvider(
      () => useShapeCreation(mockOptions),
      store
    );

    act(() => {
      result.current.cancelShapeCreation();
    });

    const state = store.getState();
    expect(state.ui.currentTool).toBe('select');
    expect(result.current.previewShape).toBe(null);
    expect(result.current.isCreatingShape).toBe(false);
  });

  it('should handle validation errors', async () => {
    // Mock validation to fail
    const { ShapeCreationService } = require('@/services/shapeCreationService');
    ShapeCreationService.validateShapeCreation.mockReturnValue(false);

    const store = createTestStore();
    const { result } = renderHookWithProvider(
      () => useShapeCreation(mockOptions),
      store
    );

    const position: Point = { x: 100, y: 200 };

    await act(async () => {
      const shape = await result.current.createShapeAtPosition(position);
      expect(shape).toBe(null);
    });

    expect(mockOptions.onCreationError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid shape creation parameters',
      })
    );
  });

  it('should warn when not connected to collaboration server', async () => {
    // Mock useYjsSync to return disconnected state
    const { useYjsSync } = require('../useYjsSync');
    useYjsSync.mockReturnValue({
      addShape: jest.fn(),
      isConnected: false,
    });

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const store = createTestStore();
    const { result } = renderHookWithProvider(
      () => useShapeCreation(mockOptions),
      store
    );

    const position: Point = { x: 100, y: 200 };

    await act(async () => {
      await result.current.createShapeAtPosition(position);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Not connected to collaboration server, shape created locally only'
    );

    consoleSpy.mockRestore();
  });
});