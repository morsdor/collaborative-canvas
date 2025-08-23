import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserPresence, ConnectionStatus } from '@/types';

interface CollaborationState {
  users: UserPresence[];
  connectionStatus: ConnectionStatus;
  currentUserId: string | null;
}

const initialState: CollaborationState = {
  users: [],
  connectionStatus: 'disconnected',
  currentUserId: null,
};

const collaborationSlice = createSlice({
  name: 'collaboration',
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.connectionStatus = action.payload;
    },
    setCurrentUserId: (state, action: PayloadAction<string>) => {
      state.currentUserId = action.payload;
    },
    addUser: (state, action: PayloadAction<UserPresence>) => {
      const existingIndex = state.users.findIndex(
        (user) => user.userId === action.payload.userId
      );
      if (existingIndex >= 0) {
        state.users[existingIndex] = action.payload;
      } else {
        state.users.push(action.payload);
      }
    },
    removeUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(
        (user) => user.userId !== action.payload
      );
    },
    updateUserPresence: (
      state,
      action: PayloadAction<{ userId: string; presence: Partial<UserPresence> }>
    ) => {
      const user = state.users.find(
        (u) => u.userId === action.payload.userId
      );
      if (user) {
        Object.assign(user, action.payload.presence);
      }
    },
    clearUsers: (state) => {
      state.users = [];
    },
  },
});

export const {
  setConnectionStatus,
  setCurrentUserId,
  addUser,
  removeUser,
  updateUserPresence,
  clearUsers,
} = collaborationSlice.actions;

export default collaborationSlice.reducer;