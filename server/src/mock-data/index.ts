// Main export file for mock data system

export * from './types.js';
export * from './generators/shapeGenerator.js';
export * from './generators/userGenerator.js';
export * from './generators/sessionGenerator.js';
export * from './scenarios/index.js';
export * from './bots/userBot.js';
export * from './bots/botManager.js';

// Convenience factory functions
import { SessionGenerator } from './generators/sessionGenerator.js';
import { ScenarioGenerator } from './scenarios/index.js';
import { BotManager } from './bots/botManager.js';
import { MockDataConfig, MockCanvasSize } from './types.js';

export class MockDataFactory {
  static createTestSession(name: string, config: Partial<MockDataConfig> = {}) {
    const {
      canvasSize = 'simple',
      userCount = 3,
    } = config;

    return SessionGenerator.generateCustomSession(name, {
      canvasSize,
      userCount,
    });
  }

  static createStressTestSession(name: string = 'Stress Test') {
    return SessionGenerator.generateCustomSession(name, {
      canvasSize: 'stress',
      userCount: 10,
      maxUsers: 20,
    });
  }

  static getTestScenarios() {
    return ScenarioGenerator.getAllScenarios();
  }

  static async runQuickCollaborationTest(roomName = 'quick-test') {
    const botManager = new BotManager();
    await botManager.startQuickTest(roomName);
    return botManager;
  }

  static async runStressTest(roomName = 'stress-test') {
    const botManager = new BotManager();
    await botManager.startStressTest(roomName);
    return botManager;
  }

  static generateTestData(canvasSize: MockCanvasSize = 'simple') {
    return {
      sessions: SessionGenerator.generateTestSessions(),
      scenarios: ScenarioGenerator.getAllScenarios(),
      sampleSession: SessionGenerator.generateSession('Sample Session', canvasSize),
    };
  }
}

// Export singleton instances
export { botManager } from './bots/botManager.js';