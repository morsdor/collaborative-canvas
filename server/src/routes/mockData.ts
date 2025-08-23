import { Router, Request, Response } from 'express';
import { MockDataFactory, botManager } from '../mock-data/index.js';
import { MockDataConfig, MockCanvasSize } from '../mock-data/types.js';
import { yjsService } from '../services/yjsService.js';
import { websocketService } from '../services/websocketService.js';

const router = Router();

// Performance monitoring data
interface PerformanceMetrics {
  timestamp: number;
  roomName: string;
  userCount: number;
  shapeCount: number;
  messageRate: number;
  latency: number;
  memoryUsage: number;
}

const performanceHistory: PerformanceMetrics[] = [];
const MAX_HISTORY_SIZE = 1000;

// Helper function to collect performance metrics
function collectMetrics(roomName: string): PerformanceMetrics {
  const roomStats = yjsService.getRoomStats(roomName);
  const wsStats = websocketService.getStats();
  
  return {
    timestamp: Date.now(),
    roomName,
    userCount: wsStats.connectionCount,
    shapeCount: roomStats?.shapeCount || 0,
    messageRate: 0, // TODO: Implement message rate tracking
    latency: 0, // TODO: Implement latency tracking
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
  };
}

// GET /api/mock/sessions - List all test sessions
router.get('/sessions', (req: Request, res: Response) => {
  try {
    const sessions = MockDataFactory.generateTestData().sessions;
    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate test sessions',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/mock/sessions - Create a new test session
router.post('/sessions', (req: Request, res: Response) => {
  try {
    const { name, config } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Session name is required and must be a string',
      });
    }

    const sessionConfig: Partial<MockDataConfig> = {
      canvasSize: config?.canvasSize || 'simple',
      userCount: config?.userCount || 3,
      sessionDuration: config?.sessionDuration || 300000, // 5 minutes
      behaviorIntensity: config?.behaviorIntensity || 'medium',
      networkConditions: config?.networkConditions || 'realistic',
    };

    const session = MockDataFactory.createTestSession(name, sessionConfig);
    
    res.status(201).json({
      success: true,
      data: session,
      message: `Test session '${name}' created successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create test session',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/mock/scenarios - List all available test scenarios
router.get('/scenarios', (req: Request, res: Response) => {
  try {
    const scenarios = MockDataFactory.getTestScenarios();
    res.json({
      success: true,
      data: scenarios,
      count: scenarios.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get test scenarios',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/mock/scenarios/:scenarioName/start - Start a test scenario
router.post('/scenarios/:scenarioName/start', async (req: Request, res: Response) => {
  try {
    const { scenarioName } = req.params;
    const { roomName } = req.body;
    
    const actualRoomName = roomName || `test-${scenarioName.toLowerCase().replace(/\s+/g, '-')}`;
    
    await botManager.startScenario(scenarioName, actualRoomName);
    
    res.json({
      success: true,
      message: `Scenario '${scenarioName}' started in room '${actualRoomName}'`,
      data: {
        scenarioName,
        roomName: actualRoomName,
        botCount: botManager.getBotCount(actualRoomName),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start scenario',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/mock/scenarios/:scenarioName/stop - Stop a test scenario
router.post('/scenarios/:scenarioName/stop', (req: Request, res: Response) => {
  try {
    const { roomName } = req.body;
    
    if (!roomName) {
      return res.status(400).json({
        success: false,
        error: 'Room name is required to stop a scenario',
      });
    }
    
    botManager.stopScenario(roomName);
    
    res.json({
      success: true,
      message: `Scenario stopped in room '${roomName}'`,
      data: { roomName },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop scenario',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/mock/bots - Get bot status and statistics
router.get('/bots', (req: Request, res: Response) => {
  try {
    const { roomName } = req.query;
    const stats = botManager.getOverallStats();
    const botDetails = botManager.getBotStats(roomName as string);
    
    res.json({
      success: true,
      data: {
        ...stats,
        botDetails,
        runningScenarios: botManager.getRunningScenarios(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get bot statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/mock/bots/stop-all - Stop all running bots
router.post('/bots/stop-all', (req: Request, res: Response) => {
  try {
    botManager.stopAllScenarios();
    
    res.json({
      success: true,
      message: 'All bots stopped successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop all bots',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;