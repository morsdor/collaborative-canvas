# Collaborative Canvas Server

Backend server for the Collaborative Canvas application, providing real-time collaboration through Yjs and WebSocket connections.

## Features

- **Real-time Collaboration**: WebSocket server with Yjs integration
- **Persistence Options**: In-memory or LevelDB persistence for document state
- **CORS Support**: Configurable CORS for frontend integration
- **Health Monitoring**: Health check and statistics endpoints
- **Environment Configuration**: Flexible configuration through environment variables

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

The server will start on:
- HTTP API: `http://localhost:3001`
- WebSocket: `ws://localhost:1234`

## Configuration

Environment variables (see `.env.example`):

- `PORT`: HTTP server port (default: 3001)
- `WS_PORT`: WebSocket server port (default: 1234)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: Allowed CORS origin (default: http://localhost:3000)
- `PERSISTENCE_TYPE`: Storage type (memory/leveldb)
- `DB_PATH`: LevelDB database path (when using leveldb)

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and basic statistics.

### Statistics
```
GET /api/stats
```
Returns detailed statistics about rooms, connections, and shapes.

### Root
```
GET /
```
Returns server information and WebSocket connection details.

## WebSocket Connection

Connect to the WebSocket server for real-time collaboration:

```javascript
// Frontend connection example
const wsUrl = 'ws://localhost:1234';
const roomName = 'my-room';
const provider = new WebsocketProvider(wsUrl, roomName, yjsDoc);
```

## Architecture

- **Express.js**: HTTP server for API endpoints
- **WebSocket Server**: Real-time communication using `ws` library
- **Yjs Integration**: Document synchronization with `y-websocket`
- **Persistence Layer**: Optional LevelDB storage with `y-leveldb`

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Test configuration
npm run test-config
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables
3. Start the server:
```bash
npm start
```

## Monitoring

The server provides several monitoring endpoints:

- `/api/health` - Basic health check
- `/api/stats` - Detailed statistics including:
  - Active WebSocket connections
  - Room information
  - Shape counts per room
  - Server status

## Error Handling

The server includes comprehensive error handling:
- Graceful shutdown on SIGTERM/SIGINT
- Uncaught exception handling
- WebSocket connection error recovery
- Persistence layer error fallbacks