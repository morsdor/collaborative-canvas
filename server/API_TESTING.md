# Collaborative Canvas Backend API - Testing Guide

This document provides comprehensive information about the backend API endpoints for mock data and testing functionality.

## Base URL
```
http://localhost:3001/api
```

## Authentication
No authentication required for testing endpoints.

---

## Mock Data Management

### Sessions

#### GET /api/mock/sessions
List all test sessions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "session-123",
      "name": "Test Session",
      "createdAt": 1640995200000,
      "users": [...],
      "shapes": [...],
      "maxUsers": 10
    }
  ],
  "count": 1
}
```

#### POST /api/mock/sessions
Create a new test session.

**Request Body:**
```json
{
  "name": "My Test Session",
  "config": {
    "canvasSize": "simple",
    "userCount": 5,
    "sessionDuration": 300000,
    "behaviorIntensity": "medium",
    "networkConditions": "realistic"
  }
}
```

### Scenarios

#### GET /api/mock/scenarios
List all available test scenarios.

#### POST /api/mock/scenarios/:scenarioName/start
Start a test scenario.

**Request Body:**
```json
{
  "roomName": "test-room-1"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/mock/scenarios/Basic%20Collaboration/start \
  -H "Content-Type: application/json" \
  -d '{"roomName": "my-test-room"}'
```

#### POST /api/mock/scenarios/:scenarioName/stop
Stop a running test scenario.

**Request Body:**
```json
{
  "roomName": "test-room-1"
}
```

### Bots

#### GET /api/mock/bots
Get bot status and statistics.

**Query Parameters:**
- `roomName` (optional): Filter bots by room

#### POST /api/mock/bots/stop-all
Stop all running bots.

---

## WebSocket Event Simulation

### Event Simulation

#### POST /api/simulation/events
Simulate WebSocket events.

**Request Body:**
```json
[
  {
    "type": "user_join",
    "roomName": "test-room",
    "userId": "user-123",
    "data": { "userName": "Test User" },
    "delay": 1000
  },
  {
    "type": "shape_create",
    "roomName": "test-room",
    "data": {
      "shapeType": "rectangle",
      "position": { "x": 100, "y": 100 },
      "dimensions": { "width": 200, "height": 150 }
    }
  }
]
```

**Event Types:**
- `user_join` - Simulate user joining
- `user_leave` - Simulate user leaving
- `shape_create` - Create a shape
- `shape_update` - Update a shape
- `shape_delete` - Delete a shape
- `network_delay` - Simulate network latency
- `connection_drop` - Simulate connection loss

#### POST /api/simulation/user-join
Simulate a user joining a room.

**Request Body:**
```json
{
  "roomName": "test-room",
  "userId": "user-123",
  "userName": "Test User",
  "delay": 0
}
```

#### POST /api/simulation/user-leave
Simulate a user leaving a room.

#### POST /api/simulation/shape-operations
Simulate shape operations.

**Request Body:**
```json
{
  "roomName": "test-room",
  "operations": [
    {
      "type": "create",
      "shapeType": "rectangle",
      "position": { "x": 100, "y": 100 },
      "dimensions": { "width": 200, "height": 150 }
    },
    {
      "type": "update",
      "shapeId": "shape-123",
      "updates": {
        "position": { "x": 150, "y": 150 }
      }
    }
  ],
  "delay": 0
}
```

#### POST /api/simulation/network-conditions
Simulate network conditions.

**Request Body:**
```json
{
  "roomName": "test-room",
  "conditions": {
    "latency": 100,
    "packetLoss": 0.05,
    "jitter": 20
  }
}
```

#### GET /api/simulation/rooms/:roomName/state
Get current room state for testing.

---

## Performance Metrics

### Metrics Collection

#### GET /api/metrics/performance
Get performance metrics.

**Query Parameters:**
- `roomName` (optional): Filter by room
- `limit` (optional): Limit number of results (default: 100)

#### GET /api/metrics/system
Get system-level metrics.

#### GET /api/metrics/rooms/:roomName
Get detailed metrics for a specific room.

#### POST /api/metrics/collect
Manually trigger metrics collection.

**Request Body:**
```json
{
  "roomName": "test-room"
}
```

#### POST /api/metrics/latency
Record latency measurement.

**Request Body:**
```json
{
  "roomName": "test-room",
  "latency": 45.5,
  "userId": "user-123"
}
```

#### POST /api/metrics/message-rate
Record message rate.

**Request Body:**
```json
{
  "roomName": "test-room",
  "messageCount": 5
}
```

#### GET /api/metrics/summary
Get overall performance summary.

---

## User Management

### User Operations

#### GET /api/users
List all test users.

**Query Parameters:**
- `roomName` (optional): Filter users by room

#### POST /api/users
Create a new test user.

**Request Body:**
```json
{
  "name": "Test User",
  "avatar": "https://example.com/avatar.jpg",
  "color": "#3b82f6"
}
```

#### GET /api/users/:userId
Get a specific user.

#### PUT /api/users/:userId
Update a user.

#### DELETE /api/users/:userId
Delete a user.

#### POST /api/users/generate
Generate multiple test users.

**Request Body:**
```json
{
  "count": 10,
  "namePrefix": "TestUser"
}
```

### Room Management

#### POST /api/users/:userId/join/:roomName
Add user to a room.

#### POST /api/users/:userId/leave/:roomName
Remove user from a room.

#### GET /api/users/rooms/:roomName
Get all users in a specific room.

#### DELETE /api/users/rooms/:roomName
Remove all users from a room.

#### POST /api/users/cleanup
Clean up inactive users.

**Request Body:**
```json
{
  "maxAge": 3600000
}
```

---

## Test Orchestration

### Orchestration Management

#### GET /api/orchestration/tests
List all test orchestrations.

#### POST /api/orchestration/tests
Create a new test orchestration.

**Request Body:**
```json
{
  "name": "Complex Multi-User Test",
  "config": {
    "roomName": "orchestration-test",
    "duration": 300000,
    "phases": [
      {
        "name": "Setup",
        "delay": 0,
        "duration": 10000,
        "actions": [
          {
            "type": "start_scenario",
            "params": { "scenarioName": "Basic Collaboration" }
          }
        ]
      }
    ],
    "metrics": {
      "collectInterval": 5000,
      "trackLatency": true,
      "trackMemory": true,
      "trackMessageRate": true
    }
  }
}
```

#### POST /api/orchestration/tests/:testId/start
Start a test orchestration.

#### POST /api/orchestration/tests/:testId/stop
Stop a running test orchestration.

#### GET /api/orchestration/tests/:testId
Get test orchestration details.

### Quick Tests

#### POST /api/orchestration/quick-tests
Run predefined quick tests.

**Request Body:**
```json
{
  "testType": "basic",
  "roomName": "quick-test-room",
  "duration": 60000
}
```

**Test Types:**
- `basic` - Basic collaboration test
- `stress` - Stress test with many users
- `network` - Network condition simulation
- `concurrent` - Concurrent editing test

---

## Example Testing Workflows

### 1. Basic Collaboration Test

```bash
# 1. Start a basic collaboration scenario
curl -X POST http://localhost:3001/api/mock/scenarios/Basic%20Collaboration/start \
  -H "Content-Type: application/json" \
  -d '{"roomName": "basic-test"}'

# 2. Check bot status
curl http://localhost:3001/api/mock/bots?roomName=basic-test

# 3. Monitor metrics
curl http://localhost:3001/api/metrics/rooms/basic-test

# 4. Stop the scenario
curl -X POST http://localhost:3001/api/mock/scenarios/Basic%20Collaboration/stop \
  -H "Content-Type: application/json" \
  -d '{"roomName": "basic-test"}'
```

### 2. Stress Test

```bash
# Run a quick stress test
curl -X POST http://localhost:3001/api/orchestration/quick-tests \
  -H "Content-Type: application/json" \
  -d '{"testType": "stress", "duration": 120000}'
```

### 3. Network Simulation

```bash
# 1. Start collaboration
curl -X POST http://localhost:3001/api/mock/scenarios/Basic%20Collaboration/start \
  -H "Content-Type: application/json" \
  -d '{"roomName": "network-test"}'

# 2. Simulate network issues
curl -X POST http://localhost:3001/api/simulation/network-conditions \
  -H "Content-Type: application/json" \
  -d '{"roomName": "network-test", "conditions": {"latency": 200, "packetLoss": 0.1}}'

# 3. Check performance impact
curl http://localhost:3001/api/metrics/rooms/network-test
```

### 4. User Management Test

```bash
# 1. Generate test users
curl -X POST http://localhost:3001/api/users/generate \
  -H "Content-Type: application/json" \
  -d '{"count": 5, "namePrefix": "TestUser"}'

# 2. Add users to room
curl -X POST http://localhost:3001/api/users/user-123/join/test-room

# 3. Check room users
curl http://localhost:3001/api/users/rooms/test-room
```

---

## Health Check

#### GET /api/health
Basic health check.

#### GET /api/stats
Detailed server statistics.

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description",
  "details": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## WebSocket Connection

Connect to WebSocket for real-time collaboration:
```
ws://localhost:1234/ws/{roomName}
```

Example with JavaScript:
```javascript
const ws = new WebSocket('ws://localhost:1234/ws/test-room');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', event.data);
```