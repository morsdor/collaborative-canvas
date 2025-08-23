import { configureStore } from '@reduxjs/toolkit';
import uiSlice, {
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
} from '../slices/uiSlice';
import { DragState } from '@/types';

describe('uiSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        ui: uiSlice,
      },
    });
  });

  it('should set current tool', () => {
    store.dispatch(setCurrentTool('rectangle'));
    expect(store.getState().ui.currentTool).toBe('rectangle');
  });

  it('should set selected shape IDs', () => {
    const shapeIds = ['shape1', 'shape2'];
    store.dispatch(setSelectedShapeIds(shapeIds));
    expect(store.getState().ui.selectedShapeIds).toEqual(shapeIds);
  });

  it('should add to selection', () => {
    store.dispatch(addToSelection('shape1'));
    store.dispatch(addToSelection('shape2'));
    expect(store.getState().ui.selectedShapeIds).toEqual(['shape1', 'shape2']);
  });

  it('should not add duplicate to selection', () => {
    store.dispatch(addToSelection('shape1'));
    store.dispatch(addToSelection('shape1'));
    expect(store.getState().ui.selectedShapeIds).toEqual(['shape1']);
  });

  it('should remove from selection', () => {
    store.dispatch(setSelectedShapeIds(['shape1', 'shape2', 'shape3']));
    store.dispatch(removeFromSelection('shape2'));
    expect(store.getState().ui.selectedShapeIds).toEqual(['shape1', 'shape3']);
  });

  it('should clear selection', () => {
    store.dispatch(setSelectedShapeIds(['shape1', 'shape2']));
    store.dispatch(clearSelection());
    expect(store.getState().ui.selectedShapeIds).toEqual([]);
  });

  it('should set drag state', () => {
    const dragState: DragState = {
      isDragging: true,
      startPosition: { x: 100, y: 100 },
      currentPosition: { x: 150, y: 150 },
      targetShapeIds: ['shape1'],
      dragType: 'move',
    };

    store.dispatch(setDragState(dragState));
    expect(store.getState().ui.dragState).toEqual(dragState);
  });

  it('should clear drag state', () => {
    const dragState: DragState = {
      isDragging: true,
      startPosition: { x: 100, y: 100 },
      currentPosition: { x: 150, y: 150 },
      targetShapeIds: ['shape1'],
      dragType: 'move',
    };

    store.dispatch(setDragState(dragState));
    store.dispatch(setDragState(null));
    expect(store.getState().ui.dragState).toBeNull();
  });

  describe('Multi-selection', () => {
    it('should start multi-select', () => {
      const startPoint = { x: 100, y: 100 };
      store.dispatch(startMultiSelect(startPoint));
      
      const state = store.getState().ui;
      expect(state.isMultiSelecting).toBe(true);
      expect(state.selectionRectangle).toEqual({
        start: startPoint,
        end: startPoint,
      });
    });

    it('should update multi-select', () => {
      const startPoint = { x: 100, y: 100 };
      const endPoint = { x: 200, y: 200 };
      
      store.dispatch(startMultiSelect(startPoint));
      store.dispatch(updateMultiSelect(endPoint));
      
      const state = store.getState().ui;
      expect(state.selectionRectangle?.end).toEqual(endPoint);
    });

    it('should end multi-select', () => {
      store.dispatch(startMultiSelect({ x: 100, y: 100 }));
      store.dispatch(endMultiSelect());
      
      const state = store.getState().ui;
      expect(state.isMultiSelecting).toBe(false);
      expect(state.selectionRectangle).toBeNull();
    });
  });

  describe('Panels', () => {
    it('should toggle color picker', () => {
      const position = { x: 300, y: 400 };
      store.dispatch(toggleColorPicker(position));
      
      const state = store.getState().ui;
      expect(state.panels.colorPicker.open).toBe(true);
      expect(state.panels.colorPicker.position).toEqual(position);
    });

    it('should toggle color picker without position', () => {
      store.dispatch(toggleColorPicker());
      expect(store.getState().ui.panels.colorPicker.open).toBe(true);
    });

    it('should toggle properties panel', () => {
      store.dispatch(togglePropertiesPanel());
      expect(store.getState().ui.panels.properties.open).toBe(true);
      
      store.dispatch(togglePropertiesPanel());
      expect(store.getState().ui.panels.properties.open).toBe(false);
    });
  });
});
