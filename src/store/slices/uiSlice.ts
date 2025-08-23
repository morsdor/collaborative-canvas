import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Tool, ViewportState, PanelState, Point } from '@/types';

interface UIState {
  currentTool: Tool;
  selectedShapeIds: string[];
  viewport: ViewportState;
  panels: PanelState;
}

const initialState: UIState = {
  currentTool: 'select',
  selectedShapeIds: [],
  viewport: {
    zoom: 1,
    panOffset: { x: 0, y: 0 },
  },
  panels: {
    colorPicker: {
      open: false,
      position: { x: 0, y: 0 },
    },
    properties: {
      open: false,
    },
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCurrentTool: (state, action: PayloadAction<Tool>) => {
      state.currentTool = action.payload;
    },
    setSelectedShapeIds: (state, action: PayloadAction<string[]>) => {
      state.selectedShapeIds = action.payload;
    },
    addToSelection: (state, action: PayloadAction<string>) => {
      if (!state.selectedShapeIds.includes(action.payload)) {
        state.selectedShapeIds.push(action.payload);
      }
    },
    removeFromSelection: (state, action: PayloadAction<string>) => {
      state.selectedShapeIds = state.selectedShapeIds.filter(
        (id) => id !== action.payload
      );
    },
    clearSelection: (state) => {
      state.selectedShapeIds = [];
    },
    setViewport: (state, action: PayloadAction<Partial<ViewportState>>) => {
      state.viewport = { ...state.viewport, ...action.payload };
    },
    setPanOffset: (state, action: PayloadAction<Point>) => {
      state.viewport.panOffset = action.payload;
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.viewport.zoom = action.payload;
    },
    toggleColorPicker: (state, action: PayloadAction<Point | undefined>) => {
      state.panels.colorPicker.open = !state.panels.colorPicker.open;
      if (action.payload) {
        state.panels.colorPicker.position = action.payload;
      }
    },
    togglePropertiesPanel: (state) => {
      state.panels.properties.open = !state.panels.properties.open;
    },
  },
});

export const {
  setCurrentTool,
  setSelectedShapeIds,
  addToSelection,
  removeFromSelection,
  clearSelection,
  setViewport,
  setPanOffset,
  setZoom,
  toggleColorPicker,
  togglePropertiesPanel,
} = uiSlice.actions;

export default uiSlice.reducer;