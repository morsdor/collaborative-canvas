import { Router, Request, Response } from 'express';
import { MockUser } from '../mock-data/types.js';
import { UserGenerator } from '../mock-data/generators/userGenerator.js';
import { yjsService } from '../services/yjsService.js';
import * as Y from 'yjs';

const router = Router();

// In-memory user management for testing
const testUsers: Map<string, MockUser> = new Map();
const roomUsers: Map<string, Set<string>> = new Map(); // roomName -> Set of userIds

// GET /api/users - List all test users
router.get('/', (req: Request, res: Response) => {
  try {
    const { roomName } = req.query;
    
    let users = Array.from(testUsers.values());
    
    if (roomName) {
      const roomUserIds = roomUsers.get(roomName as string) || new Set();
      users = users.filter(user => roomUserIds.has(user.id));
    }
    
    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/users - Create a new test user
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, avatar, color } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'User name is required and must be a string',
      });
    }
    
    const user: MockUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      avatar: avatar || undefined,
      color: color || UserGenerator.randomColor(),
      joinedAt: Date.now(),
      isActive: true,
    };
    
    testUsers.set(user.id, user);
    
    res.status(201).json({
      success: true,
      data: user,
      message: `User '${name}' created successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/users/:userId - Get a specific user
router.get('/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = testUsers.get(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    // Get rooms this user is in
    const userRooms = Array.from(roomUsers.entries())
      .filter(([, userIds]) => userIds.has(userId))
      .map(([roomName]) => roomName);
    
    res.json({
      success: true,
      data: {
        ...user,
        rooms: userRooms,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/users/:userId - Update a user
router.put('/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = testUsers.get(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    const { name, avatar, color, isActive } = req.body;
    
    const updatedUser: MockUser = {
      ...user,
      name: name !== undefined ? name : user.name,
      avatar: avatar !== undefined ? avatar : user.avatar,
      color: color !== undefined ? color : user.color,
      isActive: isActive !== undefined ? isActive : user.isActive,
    };
    
    testUsers.set(userId, updatedUser);
    
    res.json({
      success: true,
      data: updatedUser,
      message: `User '${updatedUser.name}' updated successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/users/:userId - Delete a user
router.delete('/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = testUsers.get(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    // Remove user from all rooms
    roomUsers.forEach((userIds) => {
      userIds.delete(userId);
    });
    
    testUsers.delete(userId);
    
    res.json({
      success: true,
      message: `User '${user.name}' deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/users/generate - Generate multiple test users
router.post('/generate', (req: Request, res: Response) => {
  try {
    const { count = 5, namePrefix = 'TestUser' } = req.body;
    
    if (count < 1 || count > 50) {
      return res.status(400).json({
        success: false,
        error: 'Count must be between 1 and 50',
      });
    }
    
    const generatedUsers: MockUser[] = [];
    
    for (let i = 0; i < count; i++) {
      const user = UserGenerator.generateUser(`${namePrefix} ${i + 1}`);
      testUsers.set(user.id, user);
      generatedUsers.push(user);
    }
    
    res.status(201).json({
      success: true,
      data: generatedUsers,
      count: generatedUsers.length,
      message: `Generated ${count} test users`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/users/:userId/join/:roomName - Add user to a room
router.post('/:userId/join/:roomName', async (req: Request, res: Response) => {
  try {
    const { userId, roomName } = req.params;
    const user = testUsers.get(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    // Add user to room
    if (!roomUsers.has(roomName)) {
      roomUsers.set(roomName, new Set());
    }
    roomUsers.get(roomName)!.add(userId);
    
    // Update user status in Yjs document
    try {
      const doc = await yjsService.getDocument(roomName);
      const metaMap = doc.getMap('meta');
      
      let usersMap = metaMap.get('users');
      if (!(usersMap instanceof Y.Map)) {
        usersMap = new Y.Map();
        metaMap.set('users', usersMap);
      }
      
      const userMap = new Y.Map();
      userMap.set('id', user.id);
      userMap.set('name', user.name);
      userMap.set('avatar', user.avatar || '');
      userMap.set('color', user.color);
      userMap.set('joinedAt', Date.now());
      userMap.set('isActive', true);
      
      (usersMap as Y.Map<any>).set(userId, userMap);
    } catch (error) {
      console.warn(`Failed to update Yjs document for user join: ${error}`);
    }
    
    res.json({
      success: true,
      message: `User '${user.name}' joined room '${roomName}'`,
      data: { userId, roomName, user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to join room',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/users/:userId/leave/:roomName - Remove user from a room
router.post('/:userId/leave/:roomName', async (req: Request, res: Response) => {
  try {
    const { userId, roomName } = req.params;
    const user = testUsers.get(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    // Remove user from room
    const roomUserSet = roomUsers.get(roomName);
    if (roomUserSet) {
      roomUserSet.delete(userId);
      if (roomUserSet.size === 0) {
        roomUsers.delete(roomName);
      }
    }
    
    // Update user status in Yjs document
    try {
      const doc = await yjsService.getDocument(roomName);
      const metaMap = doc.getMap('meta');
      const usersMap = metaMap.get('users');
      
      if (usersMap instanceof Y.Map) {
        usersMap.delete(userId);
      }
    } catch (error) {
      console.warn(`Failed to update Yjs document for user leave: ${error}`);
    }
    
    res.json({
      success: true,
      message: `User '${user.name}' left room '${roomName}'`,
      data: { userId, roomName, user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to leave room',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/users/rooms/:roomName - Get all users in a specific room
router.get('/rooms/:roomName', (req: Request, res: Response) => {
  try {
    const { roomName } = req.params;
    const roomUserIds = roomUsers.get(roomName) || new Set();
    
    const users = Array.from(roomUserIds)
      .map(userId => testUsers.get(userId))
      .filter((user): user is MockUser => user !== undefined);
    
    res.json({
      success: true,
      data: {
        roomName,
        users,
        userCount: users.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get room users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/users/rooms/:roomName - Remove all users from a room
router.delete('/rooms/:roomName', async (req: Request, res: Response) => {
  try {
    const { roomName } = req.params;
    const roomUserIds = roomUsers.get(roomName) || new Set();
    const userCount = roomUserIds.size;
    
    // Remove all users from room
    roomUsers.delete(roomName);
    
    // Clear users from Yjs document
    try {
      const doc = await yjsService.getDocument(roomName);
      const metaMap = doc.getMap('meta');
      const usersMap = metaMap.get('users');
      
      if (usersMap instanceof Y.Map) {
        usersMap.clear();
      }
    } catch (error) {
      console.warn(`Failed to clear users from Yjs document: ${error}`);
    }
    
    res.json({
      success: true,
      message: `Removed ${userCount} users from room '${roomName}'`,
      data: { roomName, removedCount: userCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear room users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/users/cleanup - Clean up inactive users
router.post('/cleanup', (req: Request, res: Response) => {
  try {
    const { maxAge = 3600000 } = req.body; // Default: 1 hour
    const now = Date.now();
    
    let removedCount = 0;
    const usersToRemove: string[] = [];
    
    testUsers.forEach((user, userId) => {
      if (!user.isActive || (now - user.joinedAt) > maxAge) {
        usersToRemove.push(userId);
      }
    });
    
    // Remove inactive users
    usersToRemove.forEach(userId => {
      testUsers.delete(userId);
      
      // Remove from all rooms
      roomUsers.forEach((userIds) => {
        userIds.delete(userId);
      });
      
      removedCount++;
    });
    
    // Clean up empty rooms
    const emptyRooms: string[] = [];
    roomUsers.forEach((userIds, roomName) => {
      if (userIds.size === 0) {
        emptyRooms.push(roomName);
      }
    });
    
    emptyRooms.forEach(roomName => {
      roomUsers.delete(roomName);
    });
    
    res.json({
      success: true,
      message: `Cleaned up ${removedCount} inactive users and ${emptyRooms.length} empty rooms`,
      data: {
        removedUsers: removedCount,
        removedRooms: emptyRooms.length,
        remainingUsers: testUsers.size,
        remainingRooms: roomUsers.size,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;