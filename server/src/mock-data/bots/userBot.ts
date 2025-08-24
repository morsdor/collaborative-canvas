import * as Y from 'yjs';
import { WebSocket } from 'ws';
import { MockUser, MockUserBehavior, MockAction, MockShape } from '../types.js';
import { ShapeGenerator } from '../generators/shapeGenerator.js';

export class UserBot {
  private ws: WebSocket | null = null;
  private doc: Y.Doc;
  private isRunning = false;
  private actionTimer: NodeJS.Timeout | null = null;
  private currentShapes: string[] = [];

  constructor(
    private user: MockUser,
    private behavior: MockUserBehavior,
    private wsUrl: string,
    private roomName: string
  ) {
    this.doc = new Y.Doc();
    this.setupDocumentObservers();
  }

  private setupDocumentObservers() {
    const shapesMap = this.doc.getMap('shapes');
    
    shapesMap.observe(() => {
      // Update our local shape list when shapes change
      this.currentShapes = Array.from(shapesMap.keys());
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.wsUrl}/ws/${this.roomName}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log(`🤖 Bot ${this.user.name} connected to ${this.roomName}`);
          this.setupYjsConnection();
          resolve();
        });

        this.ws.on('error', (error) => {
          console.error(`❌ Bot ${this.user.name} connection error:`, error);
          reject(error);
        });

        this.ws.on('close', () => {
          console.log(`🤖 Bot ${this.user.name} disconnected`);
          this.isRunning = false;
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private setupYjsConnection() {
    if (!this.ws) return;

    // Set up Yjs WebSocket provider manually
    this.ws.on('message', (data) => {
      try {
        const update = new Uint8Array(data as ArrayBuffer);
        Y.applyUpdate(this.doc, update);
      } catch (error) {
        console.error(`Bot ${this.user.name} failed to apply update:`, error);
      }
    });

    // Send updates to server
    this.doc.on('update', (update: Uint8Array) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(update);
      }
    });
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`🚀 Bot ${this.user.name} started with behavior pattern`);
    this.scheduleNextAction();
  }

  stop() {
    this.isRunning = false;
    
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.doc.destroy();
    console.log(`🛑 Bot ${this.user.name} stopped`);
  }

  private scheduleNextAction() {
    if (!this.isRunning) return;

    const { minDelay, maxDelay, burstMode } = this.behavior.timing;
    let delay = minDelay + Math.random() * (maxDelay - minDelay);

    // In burst mode, occasionally do rapid actions
    if (burstMode && Math.random() < 0.3) {
      delay = Math.min(delay, 500);
    }

    this.actionTimer = setTimeout(() => {
      this.executeRandomAction();
      this.scheduleNextAction();
    }, delay);
  }

  private executeRandomAction() {
    if (!this.isRunning) return;

    const action = this.selectRandomAction();
    if (!action) return;

    try {
      switch (action.type) {
        case 'create_shape':
          this.createShape();
          break;
        case 'move_shape':
          this.moveShape();
          break;
        case 'resize_shape':
          this.resizeShape();
          break;
        case 'change_style':
          this.changeShapeStyle();
          break;
        case 'delete_shape':
          this.deleteShape();
          break;
        case 'create_group':
          this.createGroup();
          break;
        case 'move_cursor':
          this.moveCursor();
          break;
        case 'disconnect':
          this.simulateDisconnect();
          break;
        case 'reconnect':
          this.simulateReconnect();
          break;
      }
    } catch (error) {
      console.error(`Bot ${this.user.name} action error:`, error);
    }
  }

  private selectRandomAction(): MockAction | null {
    const totalProbability = this.behavior.actions.reduce(
      (sum, action) => sum + action.probability, 
      0
    );
    
    let random = Math.random() * totalProbability;
    
    for (const action of this.behavior.actions) {
      random -= action.probability;
      if (random <= 0) {
        return action;
      }
    }
    
    return this.behavior.actions[0] || null;
  }

  private createShape() {
    const shapesMap = this.doc.getMap('shapes');
    const newShape = ShapeGenerator.generateShape();
    
    const shapeYMap = new Y.Map();
    shapeYMap.set('type', newShape.type);
    shapeYMap.set('position', newShape.position);
    shapeYMap.set('dimensions', newShape.dimensions);
    shapeYMap.set('style', newShape.style);
    
    if (newShape.content) {
      shapeYMap.set('content', newShape.content);
    }

    shapesMap.set(newShape.id, shapeYMap);
    console.log(`🤖 ${this.user.name} created ${newShape.type} shape`);
  }

  private moveShape() {
    if (this.currentShapes.length === 0) return;

    const shapesMap = this.doc.getMap('shapes');
    const randomShapeId = this.currentShapes[Math.floor(Math.random() * this.currentShapes.length)];
    const shapeYMap = shapesMap.get(randomShapeId) as Y.Map<any>;
    
    if (shapeYMap) {
      const currentPosition = shapeYMap.get('position') || { x: 0, y: 0 };
      const newPosition = {
        x: currentPosition.x + (Math.random() - 0.5) * 200,
        y: currentPosition.y + (Math.random() - 0.5) * 200,
      };
      
      shapeYMap.set('position', newPosition);
      console.log(`🤖 ${this.user.name} moved shape ${randomShapeId}`);
    }
  }

  private resizeShape() {
    if (this.currentShapes.length === 0) return;

    const shapesMap = this.doc.getMap('shapes');
    const randomShapeId = this.currentShapes[Math.floor(Math.random() * this.currentShapes.length)];
    const shapeYMap = shapesMap.get(randomShapeId) as Y.Map<any>;
    
    if (shapeYMap) {
      const currentDimensions = shapeYMap.get('dimensions') || { width: 100, height: 100 };
      const scaleFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      
      const newDimensions = {
        width: Math.max(20, currentDimensions.width * scaleFactor),
        height: Math.max(20, currentDimensions.height * scaleFactor),
      };
      
      shapeYMap.set('dimensions', newDimensions);
      console.log(`🤖 ${this.user.name} resized shape ${randomShapeId}`);
    }
  }

  private changeShapeStyle() {
    if (this.currentShapes.length === 0) return;

    const shapesMap = this.doc.getMap('shapes');
    const randomShapeId = this.currentShapes[Math.floor(Math.random() * this.currentShapes.length)];
    const shapeYMap = shapesMap.get(randomShapeId) as Y.Map<any>;
    
    if (shapeYMap) {
      const newStyle = ShapeGenerator.randomStyle();
      shapeYMap.set('style', newStyle);
      console.log(`🤖 ${this.user.name} changed style of shape ${randomShapeId}`);
    }
  }

  private deleteShape() {
    if (this.currentShapes.length <= 1) return; // Keep at least one shape

    const shapesMap = this.doc.getMap('shapes');
    const randomShapeId = this.currentShapes[Math.floor(Math.random() * this.currentShapes.length)];
    
    shapesMap.delete(randomShapeId);
    console.log(`🤖 ${this.user.name} deleted shape ${randomShapeId}`);
  }

  private createGroup() {
    if (this.currentShapes.length < 2) return;

    // For now, just log the group creation intent
    // Full group implementation would require group data structure
    console.log(`🤖 ${this.user.name} created a group`);
  }

  private moveCursor() {
    // Simulate cursor movement (this would be sent as presence data)
    const x = Math.random() * 1000;
    const y = Math.random() * 1000;
    console.log(`🤖 ${this.user.name} moved cursor to (${x.toFixed(0)}, ${y.toFixed(0)})`);
  }

  private simulateDisconnect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      console.log(`🤖 ${this.user.name} simulated disconnect`);
    }
  }

  private async simulateReconnect() {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      try {
        await this.connect();
        console.log(`🤖 ${this.user.name} simulated reconnect`);
      } catch (error) {
        console.error(`🤖 ${this.user.name} failed to reconnect:`, error);
      }
    }
  }

  getStats() {
    return {
      userId: this.user.id,
      userName: this.user.name,
      isRunning: this.isRunning,
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      shapesKnown: this.currentShapes.length,
    };
  }
}