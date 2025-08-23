import { MockSession, MockCanvasSize } from '../types.js';
import { ShapeGenerator } from './shapeGenerator.js';
import { UserGenerator } from './userGenerator.js';

export class SessionGenerator {
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateSession(
    name: string,
    canvasSize: MockCanvasSize = 'simple',
    userCount = 3
  ): MockSession {
    const session: MockSession = {
      id: this.generateSessionId(),
      name,
      createdAt: Date.now(),
      users: UserGenerator.generateUsers(userCount),
      shapes: this.generateShapesForCanvasSize(canvasSize),
      maxUsers: Math.max(userCount, 10),
    };

    return session;
  }

  private static generateShapesForCanvasSize(canvasSize: MockCanvasSize) {
    switch (canvasSize) {
      case 'empty':
        return [];
      
      case 'simple':
        return ShapeGenerator.generateShapes(5);
      
      case 'complex':
        return [
          ...ShapeGenerator.generateGrid(3, 4),
          ...ShapeGenerator.generateShapeCluster({ x: 800, y: 400 }, 8),
          ...ShapeGenerator.generateConnectedShapes(6),
        ];
      
      case 'stress':
        return ShapeGenerator.generateStressTestShapes(1000);
      
      default:
        return ShapeGenerator.generateShapes(5);
    }
  }

  static generateTestSessions(): MockSession[] {
    return [
      this.generateSession('Empty Canvas Test', 'empty', 2),
      this.generateSession('Simple Collaboration', 'simple', 3),
      this.generateSession('Complex Design Session', 'complex', 5),
      this.generateSession('Stress Test Session', 'stress', 10),
      this.generateSession('Team Brainstorm', 'simple', 4),
      this.generateSession('Large Team Meeting', 'complex', 8),
    ];
  }

  static generateCustomSession(
    name: string,
    options: {
      canvasSize?: MockCanvasSize;
      userCount?: number;
      maxUsers?: number;
      initialShapes?: number;
    } = {}
  ): MockSession {
    const {
      canvasSize = 'simple',
      userCount = 3,
      maxUsers = 10,
      initialShapes
    } = options;

    const session = this.generateSession(name, canvasSize, userCount);
    session.maxUsers = maxUsers;

    // Override shapes if specific count requested
    if (initialShapes !== undefined) {
      session.shapes = ShapeGenerator.generateShapes(initialShapes);
    }

    return session;
  }

  static generateSessionsForTesting(count: number): MockSession[] {
    const sessions: MockSession[] = [];
    const canvasSizes: MockCanvasSize[] = ['empty', 'simple', 'complex', 'stress'];
    
    for (let i = 0; i < count; i++) {
      const canvasSize = canvasSizes[i % canvasSizes.length];
      const userCount = Math.floor(Math.random() * 8) + 2; // 2-10 users
      
      sessions.push(
        this.generateSession(
          `Test Session ${i + 1}`,
          canvasSize,
          userCount
        )
      );
    }
    
    return sessions;
  }

  static generateRealisticSession(name: string): MockSession {
    // Generate a session that mimics real-world usage patterns
    const userCount = Math.floor(Math.random() * 6) + 2; // 2-8 users
    const session = this.generateSession(name, 'simple', userCount);
    
    // Add some realistic timing variations
    session.users = UserGenerator.simulateUserJoinLeave(session.users, 3600000); // 1 hour session
    
    // Mix of shape types that's more realistic
    session.shapes = [
      ...ShapeGenerator.generateShapes(3), // Some random shapes
      ...ShapeGenerator.generateGrid(2, 3), // Some organized content
      ShapeGenerator.generateShape('text', { x: 100, y: 50 }), // Title
    ];
    
    return session;
  }
}