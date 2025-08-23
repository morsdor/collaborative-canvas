import { Router } from 'express';
import { websocketService } from '../services/websocketService.js';
import { yjsService } from '../services/yjsService.js';

const router = Router();

router.get('/health', (req, res) => {
  const wsStats = websocketService.getStats();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    websocket: wsStats,
    rooms: yjsService.getAllRooms().length,
  });
});

router.get('/stats', (req, res) => {
  const wsStats = websocketService.getStats();
  const rooms = yjsService.getAllRooms().map(room => yjsService.getRoomStats(room));
  
  res.json({
    websocket: wsStats,
    rooms,
    totalRooms: rooms.length,
    totalShapes: rooms.reduce((sum, room) => sum + (room?.shapeCount || 0), 0),
  });
});

export default router;