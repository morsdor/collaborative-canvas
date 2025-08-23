import { Router, Request, Response } from 'express';
import { websocketService } from '../services/websocketService.js';
import { yjsService } from '../services/yjsService.js';
import { botManager } from '../mock-data/index.js';
import * as os from 'os';

const router = Router();

// Performance metrics storage
interface PerformanceMetrics {
  timestamp: number;
  roomName: string;
  userCount: number;
  shapeCount: number;
  messageRate: number;
  latency: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface SystemMetrics {
  timestamp: number;
  totalMemory: number;
  freeMemory: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  uptime: number;
  loadAverage: number[];
}

const performanceHistory: PerformanceMetrics[] = [];
const systemHistory: SystemMetrics[] = [];
const MAX_HISTORY_SIZE = 1000;

// Message rate tracking
const messageRates: Map<string, { count: number; lastReset: number }> = new Map();

// Latency tracking
const latencyMeasurements: Map<string, number[]> = new Map();

// Helper function to collect system metrics
function collectSystemMetrics(): SystemMetrics {
  const memUsage = process.memoryUsage();
  const loadAvg = process.platform === 'win32' ? [0, 0, 0] : os.loadavg();
  
  return {
    timestamp: Date.now(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    external: memUsage.external,
    arrayBuffers: memUsage.arrayBuffers,
    uptime: process.uptime(),
    loadAverage: loadAvg,
  };
}

// Helper function to collect room performance metrics
function collectRoomMetrics(roomName: string): PerformanceMetrics {
  const roomStats = yjsService.getRoomStats(roomName);
  const wsStats = websocketService.getStats();
  
  // Calculate message rate
  const messageRateData = messageRates.get(roomName) || { count: 0, lastReset: Date.now() };
  const timeDiff = Date.now() - messageRateData.lastReset;
  const messageRate = timeDiff > 0 ? (messageRateData.count / timeDiff) * 1000 : 0; // messages per second
  
  // Calculate average latency
  const latencies = latencyMeasurements.get(roomName) || [];
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  
  return {
    timestamp: Date.now(),
    roomName,
    userCount: wsStats.connectionCount,
    shapeCount: roomStats?.shapeCount || 0,
    messageRate,
    latency: avgLatency,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
    cpuUsage: 0, // TODO: Implement CPU usage tracking
  };
}

// GET /api/metrics/performance - Get performance metrics for all rooms
router.get('/performance', (req: Request, res: Response) => {
  try {
    const { roomName, limit = 100 } = req.query;
    
    let metrics = performanceHistory;
    
    if (roomName) {
      metrics = metrics.filter(m => m.roomName === roomName);
    }
    
    // Limit results
    const limitNum = parseInt(limit as string, 10);
    if (limitNum > 0) {
      metrics = metrics.slice(-limitNum);
    }
    
    res.json({
      success: true,
      data: metrics,
      count: metrics.length,
      totalRecords: performanceHistory.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/metrics/system - Get system-level metrics
router.get('/system', (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;
    
    let metrics = systemHistory;
    
    // Limit results
    const limitNum = parseInt(limit as string, 10);
    if (limitNum > 0) {
      metrics = metrics.slice(-limitNum);
    }
    
    // Add current metrics
    const currentMetrics = collectSystemMetrics();
    
    res.json({
      success: true,
      data: {
        current: currentMetrics,
        history: metrics,
      },
      count: metrics.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/metrics/rooms/:roomName - Get detailed metrics for a specific room
router.get('/rooms/:roomName', (req: Request, res: Response) => {
  try {
    const { roomName } = req.params;
    
    // Collect current metrics
    const currentMetrics = collectRoomMetrics(roomName);
    
    // Get historical data
    const roomHistory = performanceHistory.filter(m => m.roomName === roomName);
    
    // Get bot statistics if available
    const botStats = botManager.getBotStats(roomName);
    
    // Get room state
    const roomStats = yjsService.getRoomStats(roomName);
    
    res.json({
      success: true,
      data: {
        roomName,
        current: currentMetrics,
        history: roomHistory.slice(-50), // Last 50 measurements
        bots: botStats,
        roomState: roomStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get room metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/metrics/collect - Manually trigger metrics collection
router.post('/collect', (req: Request, res: Response) => {
  try {
    const { roomName } = req.body;
    
    if (roomName) {
      // Collect metrics for specific room
      const metrics = collectRoomMetrics(roomName);
      performanceHistory.push(metrics);
      
      // Trim history if needed
      if (performanceHistory.length > MAX_HISTORY_SIZE) {
        performanceHistory.shift();
      }
      
      res.json({
        success: true,
        message: `Metrics collected for room '${roomName}'`,
        data: metrics,
      });
    } else {
      // Collect metrics for all rooms
      const rooms = yjsService.getAllRooms();
      const allMetrics = rooms.map(room => collectRoomMetrics(room));
      
      performanceHistory.push(...allMetrics);
      
      // Collect system metrics
      const systemMetrics = collectSystemMetrics();
      systemHistory.push(systemMetrics);
      
      // Trim histories if needed
      if (performanceHistory.length > MAX_HISTORY_SIZE) {
        performanceHistory.splice(0, performanceHistory.length - MAX_HISTORY_SIZE);
      }
      if (systemHistory.length > MAX_HISTORY_SIZE) {
        systemHistory.splice(0, systemHistory.length - MAX_HISTORY_SIZE);
      }
      
      res.json({
        success: true,
        message: `Metrics collected for ${rooms.length} rooms`,
        data: {
          roomMetrics: allMetrics,
          systemMetrics,
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to collect metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/metrics/latency - Record latency measurement
router.post('/latency', (req: Request, res: Response) => {
  try {
    const { roomName, latency, userId } = req.body;
    
    if (!roomName || typeof latency !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'roomName and latency (number) are required',
      });
    }
    
    // Store latency measurement
    const latencies = latencyMeasurements.get(roomName) || [];
    latencies.push(latency);
    
    // Keep only last 100 measurements
    if (latencies.length > 100) {
      latencies.shift();
    }
    
    latencyMeasurements.set(roomName, latencies);
    
    res.json({
      success: true,
      message: 'Latency measurement recorded',
      data: { roomName, latency, userId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to record latency',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/metrics/message-rate - Record message rate
router.post('/message-rate', (req: Request, res: Response) => {
  try {
    const { roomName, messageCount = 1 } = req.body;
    
    if (!roomName) {
      return res.status(400).json({
        success: false,
        error: 'roomName is required',
      });
    }
    
    // Update message rate counter
    const rateData = messageRates.get(roomName) || { count: 0, lastReset: Date.now() };
    rateData.count += messageCount;
    
    // Reset counter every minute
    if (Date.now() - rateData.lastReset > 60000) {
      rateData.count = messageCount;
      rateData.lastReset = Date.now();
    }
    
    messageRates.set(roomName, rateData);
    
    res.json({
      success: true,
      message: 'Message rate updated',
      data: { roomName, messageCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update message rate',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/metrics/summary - Get overall performance summary
router.get('/summary', (req: Request, res: Response) => {
  try {
    const rooms = yjsService.getAllRooms();
    const wsStats = websocketService.getStats();
    const botStats = botManager.getOverallStats();
    const systemMetrics = collectSystemMetrics();
    
    // Calculate aggregate metrics
    const totalShapes = rooms.reduce((sum, room) => {
      const stats = yjsService.getRoomStats(room);
      return sum + (stats?.shapeCount || 0);
    }, 0);
    
    const avgLatency = Array.from(latencyMeasurements.values())
      .flat()
      .reduce((sum, latency, _, arr) => sum + latency / arr.length, 0);
    
    const totalMessageRate = Array.from(messageRates.values())
      .reduce((sum, rate) => {
        const timeDiff = Date.now() - rate.lastReset;
        return sum + (timeDiff > 0 ? (rate.count / timeDiff) * 1000 : 0);
      }, 0);
    
    res.json({
      success: true,
      data: {
        timestamp: Date.now(),
        rooms: {
          total: rooms.length,
          active: rooms.filter(room => {
            const stats = yjsService.getRoomStats(room);
            return stats && stats.shapeCount > 0;
          }).length,
        },
        connections: {
          total: wsStats.connectionCount,
          bots: botStats.totalBots,
          real: wsStats.connectionCount - botStats.totalBots,
        },
        shapes: {
          total: totalShapes,
        },
        performance: {
          avgLatency: Math.round(avgLatency),
          totalMessageRate: Math.round(totalMessageRate),
          memoryUsage: Math.round(systemMetrics.heapUsed / 1024 / 1024),
          uptime: Math.round(systemMetrics.uptime),
        },
        bots: {
          total: botStats.totalBots,
          runningScenarios: botStats.runningScenarios,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get performance summary',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start automatic metrics collection
let metricsInterval: NodeJS.Timeout | null = null;

function startMetricsCollection() {
  if (metricsInterval) return;
  
  metricsInterval = setInterval(() => {
    try {
      // Collect system metrics
      const systemMetrics = collectSystemMetrics();
      systemHistory.push(systemMetrics);
      
      // Collect room metrics
      const rooms = yjsService.getAllRooms();
      rooms.forEach(roomName => {
        const metrics = collectRoomMetrics(roomName);
        performanceHistory.push(metrics);
      });
      
      // Trim histories
      if (systemHistory.length > MAX_HISTORY_SIZE) {
        systemHistory.shift();
      }
      if (performanceHistory.length > MAX_HISTORY_SIZE) {
        performanceHistory.splice(0, performanceHistory.length - MAX_HISTORY_SIZE);
      }
    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }, 30000); // Collect every 30 seconds
  
  console.log('📊 Automatic metrics collection started');
}

function stopMetricsCollection() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    console.log('📊 Automatic metrics collection stopped');
  }
}

// Start metrics collection when module loads
startMetricsCollection();

// Export cleanup function
export { stopMetricsCollection };

export default router;