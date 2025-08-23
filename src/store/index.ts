import { configureStore } from '@reduxjs/toolkit';
import uiSlice from './slices/uiSlice';
import collaborationSlice from './slices/collaborationSlice';
import viewportSlice from './slices/viewportSlice';
import { canvasApi } from './api/canvasApi';

export const store = configureStore({
  reducer: {
    ui: uiSlice,
    collaboration: collaborationSlice,
    viewport: viewportSlice,
    [canvasApi.reducerPath]: canvasApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'ui/setSelectedShapeIds',
          'ui/setDragState',
          'persist/PERSIST',
          'persist/REHYDRATE',
        ],
        // Ignore these field paths in all actions
        ignoredActionsPaths: [
          'payload.selectedIds',
          'payload.dragState',
          'register',
          'rehydrate',
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'ui.selectedShapeIds',
          'ui.dragState',
          'register',
          'rehydrate',
        ],
      },
    })
    .concat(canvasApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
