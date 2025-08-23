import { UserBot } from './userBot.js';
import { MockScenario } from '../types.js';
import { ScenarioGenerator } from '../scenarios/index.js';

export class BotManager {
  private bots: Map<string, UserBot> = new Map();
  private scenarios: Map<string, MockScenario> = new Map();
  private runningScenarios: Set<string> = new Set();

  constructor(private wsUrl: string = 'ws://localhost:1234') {
    // Load all available scenarios
    const allScenarios = ScenarioGenerator.getAllScenarios();
    allScenarios.forEach(scenario => {
      this.scenarios.set(scenario.name, scenario);
    });
  }

  async startScenario(scenarioName: string, roomName?: string): Promise<void> {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Scenario '${scenarioName}' not found`);
    }

    const actualRoomName = roomName || `test-${scenarioName.toLowerCase().replace(/\s+/g, '-')}`;
    
    if (this.runningScenarios.has(actualRoomName)) {
      throw new Error(`Scenario already running in room '${actualRoomName}'`);
    }

    console.log(`🎬 Starting scenario '${scenarioName}' in room '${actualRoomName}'`);
    console.log(`📝 ${scenario.description}`);
    console.log(`👥 Users: ${scenario.users.length}, Duration: ${scenario.duration}ms`);

    // Create bots for each user
    const botPromises = scenario.users.map(async (user, index) => {
      const behavior = scenario.behaviors[index] || scenario.behaviors[0];
      const bot = new UserBot(user, behavior, this.wsUrl, actualRoomName);
      
      const botKey = `${actualRoomName}-${user.id}`;
      this.bots.set(botKey, bot);
      
      try {
        await bot.connect();
        
        // Start the bot after a small delay to stagger connections
        setTimeout(() => {
          bot.start();
        }, index * 500);
        
      } catch (error) {
        console.error(`Failed to start bot ${user.name}:`, error);
        this.bots.delete(botKey);
      }
    });

    await Promise.all(botPromises);
    this.runningScenarios.add(actualRoomName);

    // Schedule scenario end
    setTimeout(() => {
      this.stopScenario(actualRoomName);
    }, scenario.duration);

    console.log(`✅ Scenario '${scenarioName}' started with ${this.getBotCount(actualRoomName)} bots`);
  }

  stopScenario(roomName: string): void {
    console.log(`🛑 Stopping scenario in room '${roomName}'`);
    
    const botsToStop = Array.from(this.bots.entries())
      .filter(([key]) => key.startsWith(`${roomName}-`));
    
    botsToStop.forEach(([key, bot]) => {
      bot.stop();
      this.bots.delete(key);
    });

    this.runningScenarios.delete(roomName);
    console.log(`✅ Stopped ${botsToStop.length} bots in room '${roomName}'`);
  }

  stopAllScenarios(): void {
    console.log('🛑 Stopping all running scenarios...');
    
    Array.from(this.runningScenarios).forEach(roomName => {
      this.stopScenario(roomName);
    });
    
    console.log('✅ All scenarios stopped');
  }

  getBotCount(roomName?: string): number {
    if (roomName) {
      return Array.from(this.bots.keys())
        .filter(key => key.startsWith(`${roomName}-`))
        .length;
    }
    return this.bots.size;
  }

  getRunningScenarios(): string[] {
    return Array.from(this.runningScenarios);
  }

  getAvailableScenarios(): string[] {
    return Array.from(this.scenarios.keys());
  }

  getScenarioInfo(scenarioName: string): MockScenario | null {
    return this.scenarios.get(scenarioName) || null;
  }

  getBotStats(roomName?: string) {
    const relevantBots = Array.from(this.bots.entries())
      .filter(([key]) => !roomName || key.startsWith(`${roomName}-`));
    
    return relevantBots.map(([key, bot]) => ({
      key,
      ...bot.getStats(),
    }));
  }

  getOverallStats() {
    return {
      totalBots: this.bots.size,
      runningScenarios: this.runningScenarios.size,
      availableScenarios: this.scenarios.size,
      scenarioNames: this.getRunningScenarios(),
      botStats: this.getBotStats(),
    };
  }

  async startQuickTest(roomName = 'quick-test'): Promise<void> {
    // Start a quick basic collaboration scenario for testing
    await this.startScenario('Basic Collaboration', roomName);
  }

  async startStressTest(roomName = 'stress-test'): Promise<void> {
    // Start a stress test scenario
    await this.startScenario('Network Stress Test', roomName);
  }

  // Cleanup method for graceful shutdown
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up BotManager...');
    this.stopAllScenarios();
    
    // Wait a bit for connections to close gracefully
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ BotManager cleanup completed');
  }
}

// Singleton instance
export const botManager = new BotManager();