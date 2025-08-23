import { Router, Request, Response } from 'express';
import { websocketService } from '../services/websocketService.js';
import { yjsService } from '../services/yjsService.js';
import * as Y from 'yjs';

const router = Router();

// WebSocket event simulation for testing client behavior
interface SimulationEvent {
  type: 'user_join' | 'user_leave' | 'shape_create' | 'shape_update' | 'shape_delete' | 'network_delay' | 'connection_drop';
  roomName: string;
  userId?: string;
  data?: any;
  delay?: number;
}

// POST /api/simulation/events - Simulate WebSocket events
router.post('/events', async (req: Request, res: Response) => {
  try {
    const events: SimulationEvent[] = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const event of events) {
      const result = await simulateEvent(event);
      results.push(result);
    }

    res.json({
      success: true,
      message: `Simulated ${events.length} event(s)`,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to simulate events',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/simulation/user-join - Simulate user joining a room
router.post('/user-join', async (req: Request, res: Response) => {
  try {
    const { roomName, userId, userName, delay = 0 } = req.body;

    if (!roomName || !userId) {
      return res.status(400).json({
        success: false,
        error: 'roomName and userId are required',
      });
    }

    setTimeout(async () => {
      await simulateUserJoin(roomName, userId, userName);
    }, delay);

    res.json({
      success: true,
      message: `User join simulation scheduled for room '${roomName}'`,
      data: { roomName, userId, userName, delay },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to simulate user join',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/simulation/user-leave - Simulate user leaving a room
router.post('/user-leave', async (req: Request, res: Response) => {
  try {
    const { roomName, userId, delay = 0 } = req.body;

    if (!roomName || !userId) {
      return res.status(400).json({
        success: false,
        error: 'roomName and userId are required',
      });
    }

    setTimeout(async () => {
      await simulateUserLeave(roomName, userId);
    }, delay);

    res.json({
      success: true,
      message: `User leave simulation scheduled for room '${roomName}'`,
      data: { roomName, userId, delay },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to simulate user leave',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/simulation/shape-operations - Simulate shape operations
router.post('/shape-operations', async (req: Request, res: Response) => {
  try {
    const { roomName, operations, delay = 0 } = req.body;

    if (!roomName || !operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        error: 'roomName and operations array are required',
      });
    }

    setTimeout(async () => {
      for (const operation of operations) {
        await simulateShapeOperation(roomName, operation);
      }
    }, delay);

    res.json({
      success: true,
      message: `Shape operations simulation scheduled for room '${roomName}'`,
      data: { roomName, operationCount: operations.length, delay },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to simulate shape operations',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/simulation/network-conditions - Simulate network conditions
router.post('/network-conditions', (req: Request, res: Response) => {
  try {
    const { roomName, conditions } = req.body;
    const { latency = 0, packetLoss = 0, jitter = 0 } = conditions || {};

    if (!roomName) {
      return res.status(400).json({
        success: false,
        error: 'roomName is required',
      });
    }

    // Store network conditions for the room (in a real implementation, this would affect message delivery)
    simulateNetworkConditions(roomName, { latency, packetLoss, jitter });

    res.json({
      success: true,
      message: `Network conditions applied to room '${roomName}'`,
      data: { roomName, conditions: { latency, packetLoss, jitter } },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to simulate network conditions',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/simulation/rooms/:roomName/state - Get current room state for testing
router.get('/rooms/:roomName/state', async (req: Request, res: Response) => {
  try {
    const { roomName } = req.params;
    const doc = await yjsService.getDocument(roomName);
    
    const shapesMap = doc.getMap('shapes');
    const metaMap = doc.getMap('meta');
    
    const shapes: any[] = [];
    shapesMap.forEach((shapeData, shapeId) => {
      if (shapeData instanceof Y.Map) {
        const shape: any = { id: shapeId };
        shapeData.forEach((value, key) => {
          shape[key] = value;
        });
        shapes.push(shape);
      }
    });

    const metadata: any = {};
    metaMap.forEach((value, key) => {
      metadata[key] = value;
    });

    res.json({
      success: true,
      data: {
        roomName,
        shapes,
        metadata,
        shapeCount: shapes.length,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get room state',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Helper functions for event simulation
async function simulateEvent(event: SimulationEvent): Promise<any> {
  const { type, roomName, userId, data, delay = 0 } = event;

  return new Promise((resolve) => {
    setTimeout(async () => {
      let result;
      
      switch (type) {
        case 'user_join':
          result = await simulateUserJoin(roomName, userId!, data?.userName);
          break;
        case 'user_leave':
          result = await simulateUserLeave(roomName, userId!);
          break;
        case 'shape_create':
          result = await simulateShapeOperation(roomName, { type: 'create', ...data });
          break;
        case 'shape_update':
          result = await simulateShapeOperation(roomName, { type: 'update', ...data });
          break;
        case 'shape_delete':
          result = await simulateShapeOperation(roomName, { type: 'delete', ...data });
          break;
        case 'network_delay':
          result = simulateNetworkConditions(roomName, { latency: data?.latency || 100 });
          break;
        case 'connection_drop':
          result = simulateConnectionDrop(roomName, userId!);
          break;
        default:
          result = { error: `Unknown event type: ${type}` };
      }
      
      resolve({ type, roomName, userId, result });
    }, delay);
  });
}

async function simulateUserJoin(roomName: string, userId: string, userName?: string): Promise<any> {
  try {
    const doc = await yjsService.getDocument(roomName);
    const metaMap = doc.getMap('meta');
    
    // Add user to room metadata
    const usersMap = metaMap.get('users') || new Y.Map();
    if (!(usersMap instanceof Y.Map)) {
      const newUsersMap = new Y.Map();
      metaMap.set('users', newUsersMap);
    }
    
    const userMap = new Y.Map();
    userMap.set('id', userId);
    userMap.set('name', userName || `User ${userId}`);
    userMap.set('joinedAt', Date.now());
    userMap.set('isActive', true);
    
    (metaMap.get('users') as Y.Map<any>).set(userId, userMap);
    
    return { success: true, userId, userName, roomName };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function simulateUserLeave(roomName: string, userId: string): Promise<any> {
  try {
    const doc = await yjsService.getDocument(roomName);
    const metaMap = doc.getMap('meta');
    const usersMap = metaMap.get('users');
    
    if (usersMap instanceof Y.Map) {
      usersMap.delete(userId);
    }
    
    return { success: true, userId, roomName };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function simulateShapeOperation(roomName: string, operation: any): Promise<any> {
  try {
    const doc = await yjsService.getDocument(roomName);
    const shapesMap = doc.getMap('shapes');
    
    switch (operation.type) {
      case 'create':
        const shapeId = operation.shapeId || `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const shapeData = new Y.Map();
        
        shapeData.set('type', operation.shapeType || 'rectangle');
        shapeData.set('position', operation.position || { x: Math.random() * 500, y: Math.random() * 500 });
        shapeData.set('dimensions', operation.dimensions || { width: 100, height: 100 });
        shapeData.set('style', operation.style || { fill: '#3b82f6', stroke: '#1e40af', strokeWidth: 2, opacity: 1 });
        
        shapesMap.set(shapeId, shapeData);
        return { success: true, operation: 'create', shapeId };
        
      case 'update':
        if (!operation.shapeId) {
          return { success: false, error: 'shapeId required for update operation' };
        }
        
        const existingShape = shapesMap.get(operation.shapeId);
        if (existingShape instanceof Y.Map) {
          Object.entries(operation.updates || {}).forEach(([key, value]) => {
            existingShape.set(key, value);
          });
          return { success: true, operation: 'update', shapeId: operation.shapeId };
        }
        return { success: false, error: 'Shape not found' };
        
      case 'delete':
        if (!operation.shapeId) {
          return { success: false, error: 'shapeId required for delete operation' };
        }
        
        shapesMap.delete(operation.shapeId);
        return { success: true, operation: 'delete', shapeId: operation.shapeId };
        
      default:
        return { success: false, error: `Unknown operation type: ${operation.type}` };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function simulateNetworkConditions(roomName: string, conditions: any): any {
  // In a real implementation, this would affect message delivery timing and reliability
  console.log(`🌐 Simulating network conditions for room ${roomName}:`, conditions);
  return { success: true, roomName, conditions };
}

function simulateConnectionDrop(roomName: string, userId: string): any {
  // In a real implementation, this would forcibly disconnect a specific user
  console.log(`🔌 Simulating connection drop for user ${userId} in room ${roomName}`);
  return { success: true, roomName, userId };
}

export default router;