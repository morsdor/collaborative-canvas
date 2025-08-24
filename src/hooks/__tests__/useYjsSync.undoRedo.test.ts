import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useYjsSync } from '../useYjsSync';
import { YjsDocument, destroyYjsDocument } from '@/lib/yjs';
import collaborationReducer from '@/store/slices/collaborationSlice';
import { Shape, ShapeType } from '@/types';

// Mock WebSocket for testing
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  readyState = WebSocket.CONNECTING;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView) {
    // Simulate message broadcasting to other instances
    MockWebSocket.instances.forEach(instance => {
      if (instance !== this && instance.readyState === WebSocket.OPEN) {
        setTimeout(() => {
          if (instance.onmessage) {
            instance.onmessage(new MessageEvent('message', { data }));
          }
        }, 5);
      }
    });
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
    const index = MockWebSocket.instances.indexOf(this);
    if (index > -1) {
      MockWebSocket.instances.splice(index, 1);
    }
  }

  static cleanup() {
    MockWebSocket.instances.forEach(instance => instance.close());
    MockWebSocket.instances = [];
  }
}

// Mock y-websocket
jest.mock('y-websocket', () => ({
  WebsocketProvider: jest.fn().mockImplementation((wsUrl, roomName, doc, options) => {
    const mockWs = new MockWebSocket(wsUrl);
    
    return {
      ws: mockWs,
      doc,
      roomname: roomName,
      on: jest.fn(),
      off: jest.fn(),
      destroy: jest.fn(() => mockWs.close()),
    };
  }),
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      collaboration: collaborationReducer,
    },
  });
};

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(Provider, { store }, children);
  };
};

describe('useYjsSync Undo/Redo Integration Tests', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    MockWebSocket.cleanup();
    destroyYjsDocument();
  });

  afterEach(() => {
    MockWebSocket.cleanup();
    destroyYjsDocument();
  });

  describe('Single user undo/redo', () => {
    it('should track undo/redo state correctly', async () => {
      const { result } = renderHook(
        () => useYjsSync({
          sessionId: 'undo-test-room',
          wsUrl: 'ws://localhost:3001',
          userId: 'user-1',
          userName: 'Test User',
        }),
        { wrapper: createWrapper(store) }
      );

      // Wait for connection
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Initially should not be able to undo/redo
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);

      // Add a shape
      const testShape: Shape = {
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

      act(() => {
        result.current.addShape(testShape);
      });

      // Should be able to undo now
      await waitFor(() => {
        expect(result.current.canUndo).toBe(true);
      });
      expect(result.current.canRedo).toBe(false);

      // Undo the shape creation
      act(() => {
        result.current.undo();
      });

      // Should be able to redo now
      await waitFor(() => {
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(true);
      });

      // Verify shape was removed
      const shapes = result.current.getAllShapes();
      expect(shapes).toHaveLength(0);

      // Redo the shape creation
      act(() => {
        result.current.redo();
      });

      // Should be able to undo again
      await waitFor(() => {
        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(false);
      });

      // Verify shape was restored
      const restoredShapes = result.current.getAllShapes();
      expect(restoredShapes).toHaveLength(1);
      expect(restoredShapes[0]).toEqual(testShape);
    });

    it('should handle multiple operations in undo stack', async () => {
      const { result } = renderHook(
        () => useYjsSync({
          sessionId: 'multi-undo-test',
          wsUrl: 'ws://localhost:3001',
          userId: 'user-1',
          userName: 'Test User',
        }),
        { wrapper: createWrapper(store) }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Add multiple shapes
      const shapes: Shape[] = [
        {
          id: 'shape-1',
          type: 'rectangle' as ShapeType,
          position: { x: 0, y: 0 },
          dimensions: { width: 100, height: 100 },
          style: { fill: '#ff0000', stroke: '#000000', strokeWidth: 1, opacity: 1 },
        },
        {
          id: 'shape-2',
          type: 'circle' as ShapeType,
          position: { x: 200, y: 200 },
          dimensions: { width: 50, height: 50 },
          style: { fill: '#00ff00', stroke: '#000000', strokeWidth: 1, opacity: 1 },
        },
        {
          id: 'shape-3',
          type: 'text' as ShapeType,
          position: { x: 300, y: 300 },
          dimensions: { width: 100, height: 30 },
          style: { fill: '#0000ff', stroke: '#000000', strokeWidth: 1, opacity: 1 },
          content: 'Test text',
        },
      ];

      // Add shapes one by one
      for (const shape of shapes) {
        act(() => {
          result.current.addShape(shape);
        });
      }

      await waitFor(() => {
        expect(result.current.getAllShapes()).toHaveLength(3);
      });

      // Undo twice
      act(() => {
        result.current.undo(); // Remove shape-3
      });

      await waitFor(() => {
        expect(result.current.getAllShapes()).toHaveLength(2);
      });

      act(() => {
        result.current.undo(); // Remove shape-2
      });

      await waitFor(() => {
        expect(result.current.getAllShapes()).toHaveLength(1);
      });

      // Should still be able to undo and redo
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);

      // Redo once
      act(() => {
        result.current.redo(); // Restore shape-2
      });

      await waitFor(() => {
        expect(result.current.getAllShapes()).toHaveLength(2);
      });

      // Verify correct shapes are present
      const currentShapes = result.current.getAllShapes();
      expect(currentShapes.find(s => s.id === 'shape-1')).toBeDefined();
      expect(currentShapes.find(s => s.id === 'shape-2')).toBeDefined();
      expect(currentShapes.find(s => s.id === 'shape-3')).toBeUndefined();
    });

    it('should handle shape updates in undo/redo', async () => {
      const { result } = renderHook(
        () => useYjsSync({
          sessionId: 'update-undo-test',
          wsUrl: 'ws://localhost:3001',
          userId: 'user-1',
          userName: 'Test User',
        }),
        { wrapper: createWrapper(store) }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Add a shape
      const initialShape: Shape = {
        id: 'update-shape',
        type: 'rectangle' as ShapeType,
        position: { x: 100, y: 100 },
        dimensions: { width: 100, height: 100 },
        style: { fill: '#ff0000', stroke: '#000000', strokeWidth: 1, opacity: 1 },
      };

      act(() => {
        result.current.addShape(initialShape);
      });

      await waitFor(() => {
        expect(result.current.getAllShapes()).toHaveLength(1);
      });

      // Update the shape position
      act(() => {
        result.current.updateShape('update-shape', {
          position: { x: 200, y: 200 },
        });
      });

      await waitFor(() => {
        const shapes = result.current.getAllShapes();
        expect(shapes[0].position).toEqual({ x: 200, y: 200 });
      });

      // Update the shape color
      act(() => {
        result.current.updateShape('update-shape', {
          style: {
            ...initialShape.style,
            fill: '#00ff00',
          },
        });
      });

      await waitFor(() => {
        const shapes = result.current.getAllShapes();
        expect(shapes[0].style.fill).toBe('#00ff00');
      });

      // Undo color change
      act(() => {
        result.current.undo();
      });

      await waitFor(() => {
        const shapes = result.current.getAllShapes();
        expect(shapes[0].style.fill).toBe('#ff0000');
        expect(shapes[0].position).toEqual({ x: 200, y: 200 }); // Position should remain
      });

      // Undo position change
      act(() => {
        result.current.undo();
      });

      await waitFor(() => {
        const shapes = result.current.getAllShapes();
        expect(shapes[0].position).toEqual({ x: 100, y: 100 });
      });
    });
  });

  describe('Multi-user collaborative undo/redo', () => {
    it('should not undo other users changes', async () => {
      // Create two clients
      const { result: client1 } = renderHook(
        () => useYjsSync({
          sessionId: 'collab-undo-test',
          wsUrl: 'ws://localhost:3001',
          userId: 'user-1',
          userName: 'User 1',
        }),
        { wrapper: createWrapper(store) }
      );

      const { result: client2 } = renderHook(
        () => useYjsSync({
          sessionId: 'collab-undo-test',
          wsUrl: 'ws://localhost:3001',
          userId: 'user-2',
          userName: 'User 2',
        }),
        { wrapper: createWrapper(store) }
      );

      // Wait for connections
      await waitFor(() => {
        expect(client1.current.isConnected).toBe(true);
        expect(client2.current.isConnected).toBe(true);
      });

      // Client 1 adds a shape
      const shape1: Shape = {
        id: 'client1-shape',
        type: 'rectangle' as ShapeType,
        position: { x: 100, y: 100 },
        dimensions: { width: 100, height: 100 },
        style: { fill: '#ff0000', stroke: '#000000', strokeWidth: 1, opacity: 1 },
      };

      act(() => {
        client1.current.addShape(shape1);
      });

      // Wait for synchronization
      await waitFor(() => {
        expect(client2.current.getAllShapes()).toHaveLength(1);
      });

      // Client 2 adds a shape
      const shape2: Shape = {
        id: 'client2-shape',
        type: 'circle' as ShapeType,
        position: { x: 200, y: 200 },
        dimensions: { width: 50, height: 50 },
        style: { fill: '#00ff00', stroke: '#000000', strokeWidth: 1, opacity: 1 },
      };

      act(() => {
        client2.current.addShape(shape2);
      });

      // Wait for synchronization
      await waitFor(() => {
        expect(client1.current.getAllShapes()).toHaveLength(2);
        expect(client2.current.getAllShapes()).toHaveLength(2);
      });

      // Client 1 should only be able to undo their own changes
      expect(client1.current.canUndo).toBe(true);
      expect(client2.current.canUndo).toBe(true);

      // Client 1 undoes their shape
      act(() => {
        client1.current.undo();
      });

      // Wait for synchronization
      await waitFor(() => {
        const client1Shapes = client1.current.getAllShapes();
        const client2Shapes = client2.current.getAllShapes();
        
        // Client 1's shape should be removed, but client 2's shape should remain
        expect(client1Shapes).toHaveLength(1);
        expect(client2Shapes).toHaveLength(1);
        expect(client1Shapes[0].id).toBe('client2-shape');
        expect(client2Shapes[0].id).toBe('client2-shape');
      });

      // Client 1 should not be able to undo anymore (no more of their changes)
      expect(client1.current.canUndo).toBe(false);
      
      // Client 2 should still be able to undo their changes
      expect(client2.current.canUndo).toBe(true);

      // Client 2 undoes their shape
      act(() => {
        client2.current.undo();
      });

      // Wait for synchronization
      await waitFor(() => {
        expect(client1.current.getAllShapes()).toHaveLength(0);
        expect(client2.current.getAllShapes()).toHaveLength(0);
      });
    });
  });
});