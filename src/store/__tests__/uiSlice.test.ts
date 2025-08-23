import { configureStore } from '@reduxjs/toolkit';
import uiSlice, {
  setCurrentTool,
  setSelectedShapeIds,
  addToSelection,
  clearSelection,
  setZoom,
} from '../slices/uiSlice';

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

  it('should clear selection', () => {
    store.dispatch(setSelectedShapeIds(['shape1', 'shape2']));
    store.dispatch(clearSelection());
    expect(store.getState().ui.selectedShapeIds).toEqual([]);
  });

  it('should set zoom level', () => {
    store.dispatch(setZoom(2.5));
    expect(store.getState().ui.viewport.zoom).toBe(2.5);
  });
});
