import { configureStore } from '@reduxjs/toolkit';
import uiSlice from './slices/uiSlice';
import collaborationSlice from './slices/collaborationSlice';

export const store = configureStore({
  reducer: {
    ui: uiSlice,
    collaboration: collaborationSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['ui/setSelectedShapeIds'],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['payload.selectedIds'],
        // Ignore these paths in the state
        ignoredPaths: ['ui.selectedShapeIds'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
