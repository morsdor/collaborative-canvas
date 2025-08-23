import { renderHook, act } from '@testing-library/react';
import { useCanvasState } from '../useCanvasState';
import { Shape, ShapeType } from '@/types';

// Mock the Yjs sync hook
const mockYjsSync = {
  isConnected: true,
  addShape: jest.fn(),
  updateShape: jest.fn(),
  deleteShape: jest.fn(),
  addGroup: jest.fn(),
  updateGroup: jest.fn(),
  deleteGroup: jest.fn(),
  getAllShapes: jest.fn(() => []),
  getAllGroups: jest.fn(() => []),
};

jest.mock('../useYjsSync', () => ({
  useYjsSync: jest.fn(() => mockYjsSync),
}));

// Mock Redux hooks
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) => {
    const mockState = {
      ui: {
        selectedShapeIds: [],
      },
    };
    return selector(mockState);
  },
}));

describe('useCanvasState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockShape: Shape = {
    id: 'shape-1',
    type: 'rectangle' as ShapeType,
    position: { x: 100, y: 100 },
    dimensions: { width: 200, height: 150 },
    style: {
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 2,
      opacity: 1,
    },
  };

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useCanvasState({ sessionId: 'test-session' }));

    expect(result.current.shapes).toEqual([]);
    expect(result.current.groups).toEqual([]);
    expect(result.current.selectedShapeIds).toEqual([]);
    expect(result.current.selectedShapes).toEqual([]);
    expect(result.current.isConnected).toBe(true);
  });

  it('should create a shape with generated ID', () => {
    const { result } = renderHook(() => useCanvasState({ sessionId: 'test-session' }));

    let createdId: string;
    act(() => {
      createdId = result.current.createShape({
        type: 'rectangle',
        position: { x: 100, y: 100 },
        dimensions: { width: 200, height: 150 },
        style: {
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 2,
          opacity: 1,
        },
      });
    });

    expect(createdId!).toMatch(/^shape-\d+-[a-z0-9]+$/);
    expect(mockYjsSync.addShape).toHaveBeenCalled();
  });

  it('should handle shape operations', () => {
    const { result } = renderHook(() => useCanvasState({ sessionId: 'test-session' }));

    act(() => {
      result.current.updateShape('shape-1', { 
        position: { x: 150, y: 150 } 
      });
    });

    expect(mockYjsSync.updateShape).toHaveBeenCalledWith('shape-1', {
      position: { x: 150, y: 150 }
    });

    act(() => {
      result.current.deleteShape('shape-1');
    });

    expect(mockYjsSync.deleteShape).toHaveBeenCalledWith('shape-1');
    expect(mockDispatch).toHaveBeenCalled(); // Should dispatch removeFromSelection
  });

  it('should handle group operations', () => {
    const { result } = renderHook(() => useCanvasState({ sessionId: 'test-session' }));

    act(() => {
      result.current.updateGroup('group-1', { locked: true });
    });

    expect(mockYjsSync.updateGroup).toHaveBeenCalledWith('group-1', { locked: true });

    act(() => {
      result.current.deleteGroup('group-1');
    });

    expect(mockYjsSync.deleteGroup).toHaveBeenCalledWith('group-1');
  });

  it('should provide utility functions', () => {
    const { result } = renderHook(() => useCanvasState({ sessionId: 'test-session' }));

    // These should not throw errors even with empty data
    expect(result.current.getShapeById('shape-1')).toBeUndefined();
    expect(result.current.getGroupById('group-1')).toBeUndefined();
    expect(result.current.getShapesInRectangle({ x: 0, y: 0, width: 100, height: 100 })).toEqual([]);
    expect(result.current.calculateSelectionBounds()).toBeNull();
  });

  it('should handle selection operations', () => {
    const { result } = renderHook(() => useCanvasState({ sessionId: 'test-session' }));

    act(() => {
      result.current.selectShape('shape-1');
    });

    expect(mockDispatch).toHaveBeenCalled();

    act(() => {
      result.current.selectShapes(['shape-1', 'shape-2']);
    });

    expect(mockDispatch).toHaveBeenCalled();

    act(() => {
      result.current.clearSelection();
    });

    expect(mockDispatch).toHaveBeenCalled();
  });
});