import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Point, Rectangle } from '@/types';

export interface ViewportState {
  zoom: number;
  panOffset: Point;
  canvasSize: { width: number; height: number };
  visibleBounds: Rectangle;
}

const initialState: ViewportState = {
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  canvasSize: { width: 1920, height: 1080 },
  visibleBounds: { x: 0, y: 0, width: 1920, height: 1080 },
};

const viewportSlice = createSlice({
  name: 'viewport',
  initialState,
  reducers: {
    setZoom: (state, action: PayloadAction<number>) => {
      const newZoom = Math.max(0.1, Math.min(5, action.payload));
      state.zoom = newZoom;
      // Update visible bounds when zoom changes
      state.visibleBounds = {
        x: state.panOffset.x,
        y: state.panOffset.y,
        width: state.canvasSize.width / newZoom,
        height: state.canvasSize.height / newZoom,
      };
    },
    setPanOffset: (state, action: PayloadAction<Point>) => {
      state.panOffset = action.payload;
      // Update visible bounds when pan changes
      state.visibleBounds = {
        x: action.payload.x,
        y: action.payload.y,
        width: state.canvasSize.width / state.zoom,
        height: state.canvasSize.height / state.zoom,
      };
    },
    setCanvasSize: (state, action: PayloadAction<{ width: number; height: number }>) => {
      state.canvasSize = action.payload;
      // Update visible bounds when canvas size changes
      state.visibleBounds = {
        x: state.panOffset.x,
        y: state.panOffset.y,
        width: action.payload.width / state.zoom,
        height: action.payload.height / state.zoom,
      };
    },
    zoomToFit: (state, action: PayloadAction<Rectangle>) => {
      const { x, y, width, height } = action.payload;
      const padding = 50; // Add some padding around the content
      
      const zoomX = (state.canvasSize.width - padding * 2) / width;
      const zoomY = (state.canvasSize.height - padding * 2) / height;
      const newZoom = Math.min(zoomX, zoomY, 1); // Don't zoom in beyond 100%
      
      state.zoom = newZoom;
      state.panOffset = {
        x: x - (state.canvasSize.width / newZoom - width) / 2,
        y: y - (state.canvasSize.height / newZoom - height) / 2,
      };
      
      state.visibleBounds = {
        x: state.panOffset.x,
        y: state.panOffset.y,
        width: state.canvasSize.width / newZoom,
        height: state.canvasSize.height / newZoom,
      };
    },
    zoomIn: (state, action: PayloadAction<Point | undefined>) => {
      const zoomFactor = 1.2;
      const center = action.payload || {
        x: state.canvasSize.width / 2,
        y: state.canvasSize.height / 2,
      };
      
      const newZoom = Math.min(state.zoom * zoomFactor, 5);
      
      // Zoom towards the center point
      const worldCenter = {
        x: (center.x / state.zoom) + state.panOffset.x,
        y: (center.y / state.zoom) + state.panOffset.y,
      };
      
      state.zoom = newZoom;
      state.panOffset = {
        x: worldCenter.x - (center.x / newZoom),
        y: worldCenter.y - (center.y / newZoom),
      };
      
      state.visibleBounds = {
        x: state.panOffset.x,
        y: state.panOffset.y,
        width: state.canvasSize.width / newZoom,
        height: state.canvasSize.height / newZoom,
      };
    },
    zoomOut: (state, action: PayloadAction<Point | undefined>) => {
      const zoomFactor = 1.2;
      const center = action.payload || {
        x: state.canvasSize.width / 2,
        y: state.canvasSize.height / 2,
      };
      
      const newZoom = Math.max(state.zoom / zoomFactor, 0.1);
      
      // Zoom towards the center point
      const worldCenter = {
        x: (center.x / state.zoom) + state.panOffset.x,
        y: (center.y / state.zoom) + state.panOffset.y,
      };
      
      state.zoom = newZoom;
      state.panOffset = {
        x: worldCenter.x - (center.x / newZoom),
        y: worldCenter.y - (center.y / newZoom),
      };
      
      state.visibleBounds = {
        x: state.panOffset.x,
        y: state.panOffset.y,
        width: state.canvasSize.width / newZoom,
        height: state.canvasSize.height / newZoom,
      };
    },
    resetViewport: (state) => {
      state.zoom = 1;
      state.panOffset = { x: 0, y: 0 };
      state.visibleBounds = {
        x: 0,
        y: 0,
        width: state.canvasSize.width,
        height: state.canvasSize.height,
      };
    },
  },
});

export const {
  setZoom,
  setPanOffset,
  setCanvasSize,
  zoomToFit,
  zoomIn,
  zoomOut,
  resetViewport,
} = viewportSlice.actions;

export default viewportSlice.reducer;