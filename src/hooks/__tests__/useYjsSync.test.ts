import { renderHook, act } from '@testing-library/react';
import { useYjsSync, useUserPresence } from '../useYjsSync';
import { Shape, UserPresence } from '@/types';

// Mock the Yjs document
const mockYjsDoc = {
  connect: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
  })),
  onShapesChange: jest.fn(() => jest.fn()), // Returns cleanup function
  onGroupsChange: jest.fn(() => jest.fn()), // Returns cleanup function
  onConnectionStateChange: jest.fn(() => jest.fn()), // Returns cleanup function
  onPresenceChange: jest.fn(() => jest.fn()), // Returns cleanup function
  onUndoRedoStackChange: jest.fn(() => jest.fn()), // Returns cleanup function
  setLocalUser: jest.fn(),
  addShapeWithUndo: jest.fn(),
  updateShapeWithUndo: jest.fn(),
  deleteShapeWithUndo: jest.fn(),
  addGroupWithUndo: jest.fn(),
  updateGroupWithUndo: jest.fn(),
  deleteGroupWithUndo: jest.fn(),
  getAllShapes: jest.fn(() => []),
  getAllGroups: jest.fn(() => []),
  broadcastCursor: jest.fn(),
  broadcastSelection: jest.fn(),
  setUserActive: jest.fn(),
  undo: jest.fn(() => true),
  redo: jest.fn(() => true),
  reconnect: jest.fn(),
};

jest.mock('@/lib/yjs', () => ({
  getYjsDocument: jest.fn(() => mockYjsDoc),
}));

// Mock Redux hooks
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) => {
    const mockState = {
      collaboration: {
        connectionStatus: 'disconnected',
        users: [],
        currentUserId: null,
      },
    };
    return selector(mockState);
  },
}));

describe('useYjsSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize Yjs connection', () => {
    renderHook(() => useYjsSync({ sessionId: 'test-session' }));

    expect(mockYjsDoc.connect).toHaveBeenCalledWith({
      wsUrl: 'ws://localhost:3001',
      roomName: 'test-session',
    });
  });

  it('should use custom WebSocket URL', () => {
    renderHook(() => useYjsSync({ 
      sessionId: 'test-session',
      wsUrl: 'ws://custom-server:3001'
    }));

    expect(mockYjsDoc.connect).toHaveBeenCalledWith({
      wsUrl: 'ws://custom-server:3001',
      roomName: 'test-session',
    });
  });

  it('should set up observers for shapes and groups', () => {
    const onShapesChange = jest.fn();
    const onGroupsChange = jest.fn();

    renderHook(() => useYjsSync({ 
      sessionId: 'test-session',
      onShapesChange,
      onGroupsChange,
    }));

    expect(mockYjsDoc.onShapesChange).toHaveBeenCalled();
    expect(mockYjsDoc.onGroupsChange).toHaveBeenCalled();
  });

  it('should provide shape management functions', () => {
    const { result } = renderHook(() => useYjsSync({ sessionId: 'test-session' }));

    const mockShape: Shape = {
      id: 'shape-1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      dimensions: { width: 200, height: 150 },
      style: {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
        opacity: 1,
      },
    };

    act(() => {
      result.current.addShape(mockShape);
    });

    expect(mockYjsDoc.addShapeWithUndo).toHaveBeenCalledWith(mockShape);

    act(() => {
      result.current.updateShape('shape-1', { position: { x: 150, y: 150 } });
    });

    expect(mockYjsDoc.updateShapeWithUndo).toHaveBeenCalledWith('shape-1', { 
      position: { x: 150, y: 150 } 
    });

    act(() => {
      result.current.deleteShape('shape-1');
    });

    expect(mockYjsDoc.deleteShapeWithUndo).toHaveBeenCalledWith('shape-1');
  });

  it('should provide group management functions', () => {
    const { result } = renderHook(() => useYjsSync({ sessionId: 'test-session' }));

    const mockGroup = {
      id: 'group-1',
      shapeIds: ['shape-1', 'shape-2'],
      bounds: { x: 100, y: 100, width: 300, height: 200 },
      locked: false,
    };

    act(() => {
      result.current.addGroup(mockGroup);
    });

    expect(mockYjsDoc.addGroupWithUndo).toHaveBeenCalledWith(mockGroup);

    act(() => {
      result.current.updateGroup('group-1', { locked: true });
    });

    expect(mockYjsDoc.updateGroupWithUndo).toHaveBeenCalledWith('group-1', { locked: true });

    act(() => {
      result.current.deleteGroup('group-1');
    });

    expect(mockYjsDoc.deleteGroupWithUndo).toHaveBeenCalledWith('group-1');
  });

  it('should provide getter functions', () => {
    const { result } = renderHook(() => useYjsSync({ sessionId: 'test-session' }));

    act(() => {
      result.current.getAllShapes();
    });

    expect(mockYjsDoc.getAllShapes).toHaveBeenCalled();

    act(() => {
      result.current.getAllGroups();
    });

    expect(mockYjsDoc.getAllGroups).toHaveBeenCalled();
  });
});

describe('useUserPresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide presence update functions', () => {
    const { result } = renderHook(() => useUserPresence('test-session', 'user-1', 'John Doe'));

    act(() => {
      result.current.updateCursor({ x: 100, y: 200 });
    });

    expect(mockDispatch).toHaveBeenCalled();

    act(() => {
      result.current.updateSelection(['shape-1', 'shape-2']);
    });

    expect(mockDispatch).toHaveBeenCalled();

    act(() => {
      result.current.setActive(false);
    });

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should return current users and user ID', () => {
    const { result } = renderHook(() => useUserPresence('test-session', 'user-1', 'John Doe'));

    expect(result.current.users).toEqual([]);
    expect(result.current.currentUserId).toBeNull();
  });
});