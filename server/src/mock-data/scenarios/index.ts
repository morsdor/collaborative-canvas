import { MockScenario, MockUserBehavior, MockAction } from '../types.js';
import { UserGenerator } from '../generators/userGenerator.js';
import { ShapeGenerator } from '../generators/shapeGenerator.js';

export class ScenarioGenerator {
  static createBasicCollaborationScenario(): MockScenario {
    const users = UserGenerator.generateUsers(3);
    
    const behaviors: MockUserBehavior[] = users.map(user => ({
      userId: user.id,
      timing: { minDelay: 1000, maxDelay: 3000 },
      actions: [
        { type: 'create_shape', probability: 0.3 },
        { type: 'move_shape', probability: 0.4 },
        { type: 'change_style', probability: 0.2 },
        { type: 'move_cursor', probability: 0.1 },
      ],
    }));

    return {
      name: 'Basic Collaboration',
      description: 'Three users collaborating on a simple canvas with basic shape operations',
      duration: 60000, // 1 minute
      users,
      initialShapes: ShapeGenerator.generateShapes(3),
      behaviors,
    };
  }

  static createConcurrentEditingScenario(): MockScenario {
    const users = UserGenerator.generateUsers(4);
    
    const behaviors: MockUserBehavior[] = users.map((user, index) => ({
      userId: user.id,
      timing: { 
        minDelay: 200, 
        maxDelay: 800,
        burstMode: index < 2 // First two users are more active
      },
      actions: [
        { type: 'create_shape', probability: 0.25 },
        { type: 'move_shape', probability: 0.35 },
        { type: 'resize_shape', probability: 0.2 },
        { type: 'change_style', probability: 0.15 },
        { type: 'move_cursor', probability: 0.05 },
      ],
    }));

    return {
      name: 'Concurrent Editing',
      description: 'Multiple users making rapid concurrent edits to test conflict resolution',
      duration: 120000, // 2 minutes
      users,
      initialShapes: ShapeGenerator.generateShapes(5),
      behaviors,
    };
  }

  static createNetworkStressScenario(): MockScenario {
    const users = UserGenerator.generateUsers(6);
    
    const behaviors: MockUserBehavior[] = users.map(user => ({
      userId: user.id,
      timing: { minDelay: 100, maxDelay: 500, burstMode: true },
      actions: [
        { type: 'create_shape', probability: 0.2 },
        { type: 'move_shape', probability: 0.3 },
        { type: 'resize_shape', probability: 0.15 },
        { type: 'change_style', probability: 0.15 },
        { type: 'delete_shape', probability: 0.1 },
        { type: 'disconnect', probability: 0.05 },
        { type: 'reconnect', probability: 0.05 },
      ],
    }));

    return {
      name: 'Network Stress Test',
      description: 'High-frequency operations with network interruptions',
      duration: 180000, // 3 minutes
      users,
      initialShapes: ShapeGenerator.generateShapes(10),
      behaviors,
      networkConditions: {
        latency: 100,
        packetLoss: 0.02,
        disconnectionRate: 0.1,
      },
    };
  }

  static createGroupOperationsScenario(): MockScenario {
    const users = UserGenerator.generateUsers(3);
    
    const behaviors: MockUserBehavior[] = users.map(user => ({
      userId: user.id,
      timing: { minDelay: 1500, maxDelay: 4000 },
      actions: [
        { type: 'create_shape', probability: 0.2 },
        { type: 'move_shape', probability: 0.25 },
        { type: 'create_group', probability: 0.3 },
        { type: 'resize_shape', probability: 0.15 },
        { type: 'change_style', probability: 0.1 },
      ],
    }));

    return {
      name: 'Group Operations',
      description: 'Testing group creation, manipulation, and ungrouping operations',
      duration: 90000, // 1.5 minutes
      users,
      initialShapes: ShapeGenerator.generateGrid(3, 3),
      behaviors,
    };
  }

  static createLargeCanvasScenario(): MockScenario {
    const users = UserGenerator.generateUsers(8);
    
    const behaviors: MockUserBehavior[] = users.map(user => ({
      userId: user.id,
      timing: { minDelay: 500, maxDelay: 2000 },
      actions: [
        { type: 'create_shape', probability: 0.3 },
        { type: 'move_shape', probability: 0.4 },
        { type: 'resize_shape', probability: 0.15 },
        { type: 'change_style', probability: 0.1 },
        { type: 'delete_shape', probability: 0.05 },
      ],
    }));

    return {
      name: 'Large Canvas Collaboration',
      description: 'Many users working on a canvas with many existing shapes',
      duration: 300000, // 5 minutes
      users,
      initialShapes: ShapeGenerator.generateStressTestShapes(500),
      behaviors,
    };
  }

  static createRealisticWorkflowScenario(): MockScenario {
    const users = UserGenerator.generateMixedUsers(4);
    
    const behaviors: MockUserBehavior[] = users.map((user, index) => {
      // Different behavior patterns for different user types
      const isActiveUser = index === 0;
      const isModerateUser = index < 3;
      
      if (isActiveUser) {
        return {
          userId: user.id,
          timing: { minDelay: 800, maxDelay: 2000 },
          actions: [
            { type: 'create_shape', probability: 0.4 },
            { type: 'move_shape', probability: 0.3 },
            { type: 'change_style', probability: 0.2 },
            { type: 'create_group', probability: 0.1 },
          ],
        };
      } else if (isModerateUser) {
        return {
          userId: user.id,
          timing: { minDelay: 2000, maxDelay: 5000 },
          actions: [
            { type: 'create_shape', probability: 0.2 },
            { type: 'move_shape', probability: 0.4 },
            { type: 'change_style', probability: 0.3 },
            { type: 'move_cursor', probability: 0.1 },
          ],
        };
      } else {
        return {
          userId: user.id,
          timing: { minDelay: 5000, maxDelay: 15000 },
          actions: [
            { type: 'move_cursor', probability: 0.6 },
            { type: 'move_shape', probability: 0.3 },
            { type: 'change_style', probability: 0.1 },
          ],
        };
      }
    });

    return {
      name: 'Realistic Workflow',
      description: 'Simulates realistic user behavior patterns in a design session',
      duration: 240000, // 4 minutes
      users,
      initialShapes: ShapeGenerator.generateShapes(2),
      behaviors,
      networkConditions: {
        latency: 50,
        packetLoss: 0.001,
        disconnectionRate: 0.02,
      },
    };
  }

  static getAllScenarios(): MockScenario[] {
    return [
      this.createBasicCollaborationScenario(),
      this.createConcurrentEditingScenario(),
      this.createNetworkStressScenario(),
      this.createGroupOperationsScenario(),
      this.createLargeCanvasScenario(),
      this.createRealisticWorkflowScenario(),
    ];
  }

  static getScenarioByName(name: string): MockScenario | null {
    const scenarios = this.getAllScenarios();
    return scenarios.find(scenario => scenario.name === name) || null;
  }
}