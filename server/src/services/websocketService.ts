import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import { yjsService } from './yjsService.js';
import { config } from '../config/index.js';

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private connectionCount = 0;

  start() {
    this.wss = new WebSocketServer({ 
      port: config.wsPort,
      perMessageDeflate: {
        zlibDeflateOptions: {
          threshold: 1024,
        },
      },
    });

    this.wss.on('connection', (ws, req) => {
      this.connectionCount++;
      const connId = this.connectionCount;
      
      console.log(`🔌 WebSocket connection ${connId} established from ${req.socket.remoteAddress}`);

      // Set up Yjs WebSocket connection
      setupWSConnection(ws, req, {
        docName: this.extractRoomName(req.url),
        gc: true, // Enable garbage collection
      });

      ws.on('close', () => {
        console.log(`🔌 WebSocket connection ${connId} closed`);
      });

      ws.on('error', (error) => {
        console.error(`❌ WebSocket connection ${connId} error:`, error);
      });
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });

    console.log(`🚀 WebSocket server started on port ${config.wsPort}`);
  }

  private extractRoomName(url?: string): string {
    if (!url) return 'default-room';
    
    // Extract room name from URL path like /ws/room-name
    const match = url.match(/\/ws\/(.+)/);
    return match ? match[1] : 'default-room';
  }

  stop() {
    if (this.wss) {
      this.wss.close(() => {
        console.log('🛑 WebSocket server stopped');
      });
      this.wss = null;
    }
  }

  getConnectionCount(): number {
    return this.wss?.clients.size || 0;
  }

  getStats() {
    return {
      isRunning: !!this.wss,
      port: config.wsPort,
      connectionCount: this.getConnectionCount(),
      rooms: yjsService.getAllRooms().map(room => yjsService.getRoomStats(room)),
    };
  }
}

export const websocketService = new WebSocketService();