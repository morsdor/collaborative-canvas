import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Tool, PanelState, Point, DragState } from '@/types';

interface UIState {
  currentTool: Tool;
  selectedShapeIds: string[];
  panels: PanelState;
  dragState: DragState | null;
  isMultiSelecting: boolean;
  selectionRectangle: {
    start: Point;
    end: Point;
  } | null;
}

const initialState: UIState = {
  currentTool: 'select',
  selectedShapeIds: [],
  panels: {
    colorPicker: {
      open: false,
      position: { x: 0, y: 0 },
    },
    properties: {
      open: false,
    },
  },
  dragState: null,
  isMultiSelecting: false,
  selectionRectangle: null,
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
    setDragState: (state, action: PayloadAction<DragState | null>) => {
      state.dragState = action.payload;
    },
    startMultiSelect: (state, action: PayloadAction<Point>) => {
      state.isMultiSelecting = true;
      state.selectionRectangle = {
        start: action.payload,
        end: action.payload,
      };
    },
    updateMultiSelect: (state, action: PayloadAction<Point>) => {
      if (state.selectionRectangle) {
        state.selectionRectangle.end = action.payload;
      }
    },
    endMultiSelect: (state) => {
      state.isMultiSelecting = false;
      state.selectionRectangle = null;
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
  setDragState,
  startMultiSelect,
  updateMultiSelect,
  endMultiSelect,
  toggleColorPicker,
  togglePropertiesPanel,
} = uiSlice.actions;

export default uiSlice.reducer;
