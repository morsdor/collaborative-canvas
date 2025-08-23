import { Router, Request, Response } from 'express';
import { botManager, MockDataFactory } from '../mock-data/index.js';
import { MockDataConfig } from '../mock-data/types.js';
import { yjsService } from '../services/yjsService.js';
import { websocketService } from '../services/websocketService.js';

const router = Router();

// Test orchestration for complex multi-user scenarios
interface TestOrchestration {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  config: TestOrchestrationConfig;
  results?: TestResults;
}

interface TestOrchestrationConfig {
  roomName: string;
  duration: number; // milliseconds
  phases: TestPhase[];
  metrics: {
    collectInterval: number;
    trackLatency: boolean;
    trackMemory: boolean;
    trackMessageRate: boolean;
  };
}

interface TestPhase {
  name: string;
  delay: number; // delay before starting this phase
  duration: number; // how long this phase runs
  actions: TestAction[];
}

interface TestAction {
  type: 'user_join' | 'user_leave' | 'start_scenario' | 'stop_scenario' | 'simulate_network' | 'create_shapes' | 'stress_test';
  params: any;
}

interface TestResults {
  phases: PhaseResult[];
  metrics: {
    avgLatency: number;
    maxLatency: number;
    avgMemoryUsage: number;
    maxMemoryUsage: number;
    totalMessages: number;
    avgMessageRate: number;
    errors: string[];
  };
  summary: {
    totalUsers: number;
    totalShapes: number;
    successRate: number;
    duration: number;
  };
}

interface PhaseResult {
  name: string;
  status: 'completed' | 'failed';
  duration: number;
  actions: ActionResult[];
  metrics: any;
}

interface ActionResult {
  type: string;
  status: 'completed' | 'failed';
  duration: number;
  error?: string;
}

// In-memory orchestration storage
const orchestrations: Map<string, TestOrchestration> = new Map();
const runningOrchestrations: Set<string> = new Set();

// GET /api/orchestration/tests - List all test orchestrations
router.get('/tests', (req: Request, res: Response) => {
  try {
    const tests = Array.from(orchestrations.values());
    
    res.json({
      success: true,
      data: tests,
      count: tests.length,
      running: runningOrchestrations.size,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get test orchestrations',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/orchestration/tests - Create a new test orchestration
router.post('/tests', (req: Request, res: Response) => {
  try {
    const { name, config } = req.body;
    
    if (!name || !config) {
      return res.status(400).json({
        success: false,
        error: 'Test name and config are required',
      });
    }
    
    const orchestration: TestOrchestration = {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      status: 'pending',
      config: {
        roomName: config.roomName || `test-room-${Date.now()}`,
        duration: config.duration || 300000, // 5 minutes default
        phases: config.phases || [],
        metrics: {
          collectInterval: config.metrics?.collectInterval || 5000,
          trackLatency: config.metrics?.trackLatency !== false,
          trackMemory: config.metrics?.trackMemory !== false,
          trackMessageRate: config.metrics?.trackMessageRate !== false,
        },
      },
    };
    
    orchestrations.set(orchestration.id, orchestration);
    
    res.status(201).json({
      success: true,
      data: orchestration,
      message: `Test orchestration '${name}' created successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create test orchestration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/orchestration/tests/:testId/start - Start a test orchestration
router.post('/tests/:testId/start', async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const orchestration = orchestrations.get(testId);
    
    if (!orchestration) {
      return res.status(404).json({
        success: false,
        error: 'Test orchestration not found',
      });
    }
    
    if (runningOrchestrations.has(testId)) {
      return res.status(400).json({
        success: false,
        error: 'Test orchestration is already running',
      });
    }
    
    // Start the orchestration
    orchestration.status = 'running';
    orchestration.startTime = Date.now();
    runningOrchestrations.add(testId);
    
    // Run the orchestration asynchronously
    runOrchestration(orchestration).catch(error => {
      console.error(`Orchestration ${testId} failed:`, error);
      orchestration.status = 'failed';
      orchestration.endTime = Date.now();
      runningOrchestrations.delete(testId);
    });
    
    res.json({
      success: true,
      message: `Test orchestration '${orchestration.name}' started`,
      data: {
        testId,
        roomName: orchestration.config.roomName,
        estimatedDuration: orchestration.config.duration,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start test orchestration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/orchestration/tests/:testId/stop - Stop a running test orchestration
router.post('/tests/:testId/stop', (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const orchestration = orchestrations.get(testId);
    
    if (!orchestration) {
      return res.status(404).json({
        success: false,
        error: 'Test orchestration not found',
      });
    }
    
    if (!runningOrchestrations.has(testId)) {
      return res.status(400).json({
        success: false,
        error: 'Test orchestration is not running',
      });
    }
    
    // Stop the orchestration
    orchestration.status = 'completed';
    orchestration.endTime = Date.now();
    runningOrchestrations.delete(testId);
    
    // Stop any running scenarios in the test room
    botManager.stopScenario(orchestration.config.roomName);
    
    res.json({
      success: true,
      message: `Test orchestration '${orchestration.name}' stopped`,
      data: orchestration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop test orchestration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/orchestration/tests/:testId - Get test orchestration details
router.get('/tests/:testId', (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const orchestration = orchestrations.get(testId);
    
    if (!orchestration) {
      return res.status(404).json({
        success: false,
        error: 'Test orchestration not found',
      });
    }
    
    // Add current room state if test is running
    let roomState = null;
    if (orchestration.status === 'running') {
      const roomStats = yjsService.getRoomStats(orchestration.config.roomName);
      const botStats = botManager.getBotStats(orchestration.config.roomName);
      
      roomState = {
        roomStats,
        botStats,
        isRunning: runningOrchestrations.has(testId),
      };
    }
    
    res.json({
      success: true,
      data: {
        ...orchestration,
        roomState,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get test orchestration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/orchestration/quick-tests - Run predefined quick tests
router.post('/quick-tests', async (req: Request, res: Response) => {
  try {
    const { testType = 'basic', roomName, duration = 60000 } = req.body;
    
    let config: TestOrchestrationConfig;
    
    switch (testType) {
      case 'basic':
        config = createBasicCollaborationTest(roomName, duration);
        break;
      case 'stress':
        config = createStressTest(roomName, duration);
        break;
      case 'network':
        config = createNetworkTest(roomName, duration);
        break;
      case 'concurrent':
        config = createConcurrentEditTest(roomName, duration);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown test type: ${testType}`,
        });
    }
    
    const orchestration: TestOrchestration = {
      id: `quick-${testType}-${Date.now()}`,
      name: `Quick ${testType} test`,
      status: 'pending',
      config,
    };
    
    orchestrations.set(orchestration.id, orchestration);
    
    // Start immediately
    orchestration.status = 'running';
    orchestration.startTime = Date.now();
    runningOrchestrations.add(orchestration.id);
    
    runOrchestration(orchestration).catch(error => {
      console.error(`Quick test ${orchestration.id} failed:`, error);
      orchestration.status = 'failed';
      orchestration.endTime = Date.now();
      runningOrchestrations.delete(orchestration.id);
    });
    
    res.json({
      success: true,
      message: `Quick ${testType} test started`,
      data: orchestration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start quick test',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Helper function to run an orchestration
async function runOrchestration(orchestration: TestOrchestration): Promise<void> {
  const { config } = orchestration;
  const results: TestResults = {
    phases: [],
    metrics: {
      avgLatency: 0,
      maxLatency: 0,
      avgMemoryUsage: 0,
      maxMemoryUsage: 0,
      totalMessages: 0,
      avgMessageRate: 0,
      errors: [],
    },
    summary: {
      totalUsers: 0,
      totalShapes: 0,
      successRate: 0,
      duration: 0,
    },
  };
  
  try {
    console.log(`🎬 Starting orchestration: ${orchestration.name}`);
    
    // Run each phase
    for (const phase of config.phases) {
      console.log(`📋 Starting phase: ${phase.name}`);
      
      // Wait for phase delay
      if (phase.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, phase.delay));
      }
      
      const phaseResult: PhaseResult = {
        name: phase.name,
        status: 'completed',
        duration: 0,
        actions: [],
        metrics: {},
      };
      
      const phaseStartTime = Date.now();
      
      // Execute phase actions
      for (const action of phase.actions) {
        const actionResult = await executeAction(action, config.roomName);
        phaseResult.actions.push(actionResult);
        
        if (actionResult.status === 'failed') {
          results.metrics.errors.push(`Phase ${phase.name}: ${actionResult.error}`);
        }
      }
      
      // Wait for phase duration
      if (phase.duration > 0) {
        await new Promise(resolve => setTimeout(resolve, phase.duration));
      }
      
      phaseResult.duration = Date.now() - phaseStartTime;
      results.phases.push(phaseResult);
    }
    
    // Collect final metrics
    const roomStats = yjsService.getRoomStats(config.roomName);
    const wsStats = websocketService.getStats();
    
    results.summary = {
      totalUsers: wsStats.connectionCount,
      totalShapes: roomStats?.shapeCount || 0,
      successRate: calculateSuccessRate(results),
      duration: Date.now() - (orchestration.startTime || 0),
    };
    
    orchestration.results = results;
    orchestration.status = 'completed';
    orchestration.endTime = Date.now();
    
    console.log(`✅ Orchestration completed: ${orchestration.name}`);
  } catch (error) {
    console.error(`❌ Orchestration failed: ${orchestration.name}`, error);
    results.metrics.errors.push(`Orchestration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    orchestration.results = results;
    orchestration.status = 'failed';
    orchestration.endTime = Date.now();
  } finally {
    runningOrchestrations.delete(orchestration.id);
    
    // Cleanup: stop any running scenarios
    botManager.stopScenario(config.roomName);
  }
}

// Helper function to execute a single action
async function executeAction(action: TestAction, roomName: string): Promise<ActionResult> {
  const startTime = Date.now();
  
  try {
    switch (action.type) {
      case 'start_scenario':
        await botManager.startScenario(action.params.scenarioName, roomName);
        break;
        
      case 'stop_scenario':
        botManager.stopScenario(roomName);
        break;
        
      case 'stress_test':
        await MockDataFactory.runStressTest(roomName);
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
    
    return {
      type: action.type,
      status: 'completed',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      type: action.type,
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper function to calculate success rate
function calculateSuccessRate(results: TestResults): number {
  const totalActions = results.phases.reduce((sum, phase) => sum + phase.actions.length, 0);
  const successfulActions = results.phases.reduce(
    (sum, phase) => sum + phase.actions.filter(action => action.status === 'completed').length,
    0
  );
  
  return totalActions > 0 ? (successfulActions / totalActions) * 100 : 0;
}

// Predefined test configurations
function createBasicCollaborationTest(roomName?: string, duration = 60000): TestOrchestrationConfig {
  return {
    roomName: roomName || `basic-test-${Date.now()}`,
    duration,
    phases: [
      {
        name: 'Setup',
        delay: 0,
        duration: 5000,
        actions: [
          {
            type: 'start_scenario',
            params: { scenarioName: 'Basic Collaboration' },
          },
        ],
      },
      {
        name: 'Collaboration',
        delay: 5000,
        duration: duration - 10000,
        actions: [],
      },
      {
        name: 'Cleanup',
        delay: 0,
        duration: 5000,
        actions: [
          {
            type: 'stop_scenario',
            params: {},
          },
        ],
      },
    ],
    metrics: {
      collectInterval: 5000,
      trackLatency: true,
      trackMemory: true,
      trackMessageRate: true,
    },
  };
}

function createStressTest(roomName?: string, duration = 120000): TestOrchestrationConfig {
  return {
    roomName: roomName || `stress-test-${Date.now()}`,
    duration,
    phases: [
      {
        name: 'Ramp Up',
        delay: 0,
        duration: 30000,
        actions: [
          {
            type: 'start_scenario',
            params: { scenarioName: 'Network Stress Test' },
          },
        ],
      },
      {
        name: 'Peak Load',
        delay: 0,
        duration: duration - 60000,
        actions: [
          {
            type: 'stress_test',
            params: {},
          },
        ],
      },
      {
        name: 'Ramp Down',
        delay: 0,
        duration: 30000,
        actions: [
          {
            type: 'stop_scenario',
            params: {},
          },
        ],
      },
    ],
    metrics: {
      collectInterval: 2000,
      trackLatency: true,
      trackMemory: true,
      trackMessageRate: true,
    },
  };
}

function createNetworkTest(roomName?: string, duration = 90000): TestOrchestrationConfig {
  return {
    roomName: roomName || `network-test-${Date.now()}`,
    duration,
    phases: [
      {
        name: 'Normal Conditions',
        delay: 0,
        duration: 30000,
        actions: [
          {
            type: 'start_scenario',
            params: { scenarioName: 'Basic Collaboration' },
          },
        ],
      },
      {
        name: 'Network Issues',
        delay: 0,
        duration: 30000,
        actions: [
          {
            type: 'simulate_network',
            params: { latency: 200, packetLoss: 0.05 },
          },
        ],
      },
      {
        name: 'Recovery',
        delay: 0,
        duration: 30000,
        actions: [
          {
            type: 'simulate_network',
            params: { latency: 0, packetLoss: 0 },
          },
          {
            type: 'stop_scenario',
            params: {},
          },
        ],
      },
    ],
    metrics: {
      collectInterval: 3000,
      trackLatency: true,
      trackMemory: true,
      trackMessageRate: true,
    },
  };
}

function createConcurrentEditTest(roomName?: string, duration = 60000): TestOrchestrationConfig {
  return {
    roomName: roomName || `concurrent-test-${Date.now()}`,
    duration,
    phases: [
      {
        name: 'Sequential Edits',
        delay: 0,
        duration: 20000,
        actions: [
          {
            type: 'start_scenario',
            params: { scenarioName: 'Basic Collaboration' },
          },
        ],
      },
      {
        name: 'Concurrent Edits',
        delay: 0,
        duration: 20000,
        actions: [
          {
            type: 'start_scenario',
            params: { scenarioName: 'Concurrent Editing Chaos' },
          },
        ],
      },
      {
        name: 'Conflict Resolution',
        delay: 0,
        duration: 20000,
        actions: [
          {
            type: 'stop_scenario',
            params: {},
          },
        ],
      },
    ],
    metrics: {
      collectInterval: 2000,
      trackLatency: true,
      trackMemory: true,
      trackMessageRate: true,
    },
  };
}

export default router;