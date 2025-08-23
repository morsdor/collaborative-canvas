// Mock data types for testing collaborative canvas

export interface MockPoint {
  x: number;
  y: number;
}

export interface MockSize {
  width: number;
  height: number;
}

export interface MockShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export type MockShapeType = 'rectangle' | 'circle' | 'text' | 'line';

export interface MockShape {
  id: string;
  type: MockShapeType;
  position: MockPoint;
  dimensions: MockSize;
  style: MockShapeStyle;
  content?: string;
  groupId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MockUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  joinedAt: number;
  isActive: boolean;
}

export interface MockSession {
  id: string;
  name: string;
  createdAt: number;
  users: MockUser[];
  shapes: MockShape[];
  maxUsers: number;
}

export interface MockUserBehavior {
  userId: string;
  actions: MockAction[];
  timing: {
    minDelay: number;
    maxDelay: number;
    burstMode?: boolean;
  };
}

export type MockActionType = 
  | 'create_shape'
  | 'move_shape'
  | 'resize_shape'
  | 'delete_shape'
  | 'change_style'
  | 'create_group'
  | 'move_cursor'
  | 'disconnect'
  | 'reconnect';

export interface MockAction {
  type: MockActionType;
  targetShapeId?: string;
  data?: any;
  probability: number; // 0-1, likelihood of this action being chosen
}

export interface MockScenario {
  name: string;
  description: string;
  duration: number; // milliseconds
  users: MockUser[];
  initialShapes: MockShape[];
  behaviors: MockUserBehavior[];
  networkConditions?: {
    latency: number;
    packetLoss: number;
    disconnectionRate: number;
  };
}

export type MockCanvasSize = 'empty' | 'simple' | 'complex' | 'stress';

export interface MockDataConfig {
  canvasSize: MockCanvasSize;
  userCount: number;
  sessionDuration: number;
  behaviorIntensity: 'low' | 'medium' | 'high';
  networkConditions: 'perfect' | 'realistic' | 'poor';
}