// Core shape types
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rectangle extends Point, Size {}

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface TextStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  color: string;
}

export type ShapeType = 'rectangle' | 'circle' | 'text' | 'line';

export interface Shape {
  id: string;
  type: ShapeType;
  position: Point;
  dimensions: Size;
  style: ShapeStyle;
  content?: string; // for text shapes
  textStyle?: TextStyle; // for text formatting
  groupId?: string;
}

// Group types
export interface Group {
  id: string;
  shapeIds: string[];
  bounds: Rectangle;
  locked: boolean;
}

// Interaction types
export type DragType = 'move' | 'resize' | 'rotate';

export interface DragState {
  isDragging: boolean;
  startPosition: Point;
  currentPosition: Point;
  targetShapeIds: string[];
  dragType: DragType;
}

export interface SelectionState {
  selectedIds: Set<string>;
  selectionBounds: Rectangle | null;
  isMultiSelect: boolean;
}

// Collaboration types
export interface UserPresence {
  userId: string;
  name: string;
  avatar?: string;
  cursor: Point;
  selection: string[];
  isActive: boolean;
}

// Tool types
export type Tool = 'select' | 'rectangle' | 'circle' | 'text' | 'line';

// UI State types
export interface ViewportState {
  zoom: number;
  panOffset: Point;
}

export interface PanelState {
  colorPicker: {
    open: boolean;
    position: Point;
  };
  properties: {
    open: boolean;
  };
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'offline';
