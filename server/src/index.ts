import express from 'express';
import { config, isDevelopment } from './config/index.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { websocketService } from './services/websocketService.js';
import { yjsService } from './services/yjsService.js';
import healthRoutes from './routes/health.js';

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Request logging in development
if (isDevelopment) {
  app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Collaborative Canvas Server',
    version: '1.0.0',
    status: 'running',
    websocket: {
      port: config.wsPort,
      url: `ws://localhost:${config.wsPort}`,
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start servers
async function startServer() {
  try {
    // Start WebSocket server
    websocketService.start();

    // Start HTTP server
    app.listen(config.port, () => {
      console.log(`🚀 HTTP server started on port ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`🔗 CORS origin: ${config.corsOrigin}`);
      
      if (isDevelopment) {
        console.log(`📊 Health check: http://localhost:${config.port}/api/health`);
        console.log(`📈 Stats: http://localhost:${config.port}/api/stats`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  websocketService.stop();
  await yjsService.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  websocketService.stop();
  await yjsService.cleanup();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();