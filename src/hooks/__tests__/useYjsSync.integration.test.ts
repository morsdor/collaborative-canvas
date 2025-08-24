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

describe('useYjsSync Integration Tests', () => {
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

  describe('Multi-client synchronization', () => {
    it('should synchronize shape creation between multiple clients', async () => {
      const shapesChangedClient1 = jest.fn();
      const shapesChangedClient2 = jest.fn();

      // Create two clients
      const { result: client1 } = renderHook(
        () => useYjsSync({
          sessionId: 'test-room',
          wsUrl: 'ws://localhost:3001',
          onShapesChange: shapesChangedClient1,
        }),
        { wrapper: createWrapper(store) }
      );

      const { result: client2 } = renderHook(
        () => useYjsSync({
          sessionId: 'test-room',
          wsUrl: 'ws://localhost:3001',
          onShapesChange: shapesChangedClient2,
        }),
        { wrapper: createWrapper(store) }
      );

      // Wait for connections to establish
      await waitFor(() => {
        expect(client1.current.isConnected).toBe(true);
        expect(client2.current.isConnected).toBe(true);
      });

      // Client 1 creates a shape
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
        client1.current.addShape(testShape);
      });

      // Wait for synchronization
      await waitFor(() => {
        expect(shapesChangedClient2).toHaveBeenCalled();
      });

      // Verify both clients have the same shape
      const client1Shapes = client1.current.getAllShapes();
      const client2Shapes = client2.current.getAllShapes();

      expect(client1Shapes).toHaveLength(1);
      expect(client2Shapes).toHaveLength(1);
      expect(client1Shapes[0]).toEqual(testShape);
      expect(client2Shapes[0]).toEqual(testShape);
    });

    it('should handle concurrent shape modifications without conflicts', async () => {
      const shapesChangedClient1 = jest.fn();
      const shapesChangedClient2 = jest.fn();

      // Create two clients
      const { result: client1 } = renderHook(
        () => useYjsSync({
          sessionId: 'test-room-concurrent',
          wsUrl: 'ws://localhost:3001',
          onShapesChange: shapesChangedClient1,
        }),
        { wrapper: createWrapper(store) }
      );

      const { result: client2 } = renderHook(
        () => useYjsSync({
          sessionId: 'test-room-concurrent',
          wsUrl: 'ws://localhost:3001',
          onShapesChange: shapesChangedClient2,
        }),
        { wrapper: createWrapper(store) }
      );

      // Wait for connections
      await waitFor(() => {
        expect(client1.current.isConnected).toBe(true);
        expect(client2.current.isConnected).toBe(true);
      });

      // Create initial shape
      const initialShape: Shape = {
        id: 'concurrent-shape',
        type: 'rectangle' as ShapeType,
        position: { x: 0, y: 0 },
        dimensions: { width: 100, height: 100 },
        style: {
          fill: '#000000',
          stroke: '#000000',
          strokeWidth: 1,
          opacity: 1,
        },
      };

      act(() => {
        client1.current.addShape(initialShape);
      });

      await waitFor(() => {
        expect(client2.current.getAllShapes()).toHaveLength(1);
      });

      // Both clients modify different properties simultaneously
      act(() => {
        // Client 1 changes position
        client1.current.updateShape('concurrent-shape', {
          position: { x: 50, y: 50 },
        });

        // Client 2 changes color
        client2.current.updateShape('concurrent-shape', {
          style: {
            ...initialShape.style,
            fill: '#ff0000',
          },
        });
      });

      // Wait for synchronization
      await waitFor(() => {
        const client1Shapes = client1.current.getAllShapes();
        const client2Shapes = client2.current.getAllShapes();
        
        // Both changes should be preserved
        expect(client1Shapes[0].position).toEqual({ x: 50, y: 50 });
        expect(client1Shapes[0].style.fill).toBe('#ff0000');
        expect(client2Shapes[0].position).toEqual({ x: 50, y: 50 });
        expect(client2Shapes[0].style.fill).toBe('#ff0000');
      });
    });

    it('should handle connection errors and retry', async () => {
      const connectionErrorHandler = jest.fn();
      const reconnectHandler = jest.fn();

      const { result } = renderHook(
        () => useYjsSync({
          sessionId: 'test-room-error',
          wsUrl: 'ws://localhost:3001',
          onConnectionError: connectionErrorHandler,
          onReconnect: reconnectHandler,
        }),
        { wrapper: createWrapper(store) }
      );

      // Wait for initial connection
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate connection error
      act(() => {
        const mockError = new Error('Connection lost');
        // Trigger error through the mock WebSocket
        MockWebSocket.instances[0]?.onerror?.(new Event('error'));
      });

      // Verify error handling
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
      });

      // Test manual reconnect
      act(() => {
        result.current.reconnect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should maintain data consistency during network interruptions', async () => {
      const shapesChangedClient1 = jest.fn();
      const shapesChangedClient2 = jest.fn();

      // Create two clients
      const { result: client1 } = renderHook(
        () => useYjsSync({
          sessionId: 'test-room-interruption',
          wsUrl: 'ws://localhost:3001',
          onShapesChange: shapesChangedClient1,
        }),
        { wrapper: createWrapper(store) }
      );

      const { result: client2 } = renderHook(
        () => useYjsSync({
          sessionId: 'test-room-interruption',
          wsUrl: 'ws://localhost:3001',
          onShapesChange: shapesChangedClient2,
        }),
        { wrapper: createWrapper(store) }
      );

      // Wait for connections
      await waitFor(() => {
        expect(client1.current.isConnected).toBe(true);
        expect(client2.current.isConnected).toBe(true);
      });

      // Create some shapes
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
      ];

      act(() => {
        shapes.forEach(shape => client1.current.addShape(shape));
      });

      await waitFor(() => {
        expect(client2.current.getAllShapes()).toHaveLength(2);
      });

      // Simulate network interruption by closing client2's connection
      act(() => {
        MockWebSocket.instances.find(ws => ws.url.includes('test-room-interruption'))?.close();
      });

      // Client1 continues working while client2 is disconnected
      act(() => {
        client1.current.updateShape('shape-1', {
          position: { x: 100, y: 100 },
        });
        
        client1.current.addShape({
          id: 'shape-3',
          type: 'text' as ShapeType,
          position: { x: 300, y: 300 },
          dimensions: { width: 100, height: 30 },
          style: { fill: '#0000ff', stroke: '#000000', strokeWidth: 1, opacity: 1 },
          content: 'Test text',
        });
      });

      // Simulate reconnection
      act(() => {
        client2.current.reconnect();
      });

      // Wait for synchronization after reconnection
      await waitFor(() => {
        const client2Shapes = client2.current.getAllShapes();
        expect(client2Shapes).toHaveLength(3);
        
        const shape1 = client2Shapes.find(s => s.id === 'shape-1');
        expect(shape1?.position).toEqual({ x: 100, y: 100 });
        
        const shape3 = client2Shapes.find(s => s.id === 'shape-3');
        expect(shape3?.content).toBe('Test text');
      });
    });
  });

  describe('Performance and batching', () => {
    it('should handle rapid updates efficiently', async () => {
      const shapesChanged = jest.fn();

      const { result } = renderHook(
        () => useYjsSync({
          sessionId: 'test-room-performance',
          wsUrl: 'ws://localhost:3001',
          onShapesChange: shapesChanged,
        }),
        { wrapper: createWrapper(store) }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Create initial shape
      const shape: Shape = {
        id: 'rapid-update-shape',
        type: 'rectangle' as ShapeType,
        position: { x: 0, y: 0 },
        dimensions: { width: 100, height: 100 },
        style: { fill: '#000000', stroke: '#000000', strokeWidth: 1, opacity: 1 },
      };

      act(() => {
        result.current.addShape(shape);
      });

      // Perform rapid updates
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.updateShape('rapid-update-shape', {
            position: { x: i, y: i },
          });
        }
      });

      // Verify final state
      await waitFor(() => {
        const shapes = result.current.getAllShapes();
        const updatedShape = shapes.find(s => s.id === 'rapid-update-shape');
        expect(updatedShape?.position).toEqual({ x: 99, y: 99 });
      });

      // Should not have excessive callback calls due to batching
      expect(shapesChanged.mock.calls.length).toBeLessThan(50);
    });
  });
});