import collaborationReducer, {
  setConnectionStatus,
  setCurrentUserId,
  addUser,
  removeUser,
  updateUserPresence,
  clearUsers,
} from '../slices/collaborationSlice';
import { UserPresence, ConnectionStatus } from '@/types';

describe('collaborationSlice', () => {
  const initialState = {
    users: [],
    connectionStatus: 'disconnected' as ConnectionStatus,
    currentUserId: null,
  };

  const mockUser: UserPresence = {
    userId: 'user-1',
    name: 'John Doe',
    avatar: 'avatar-url',
    cursor: { x: 100, y: 200 },
    selection: ['shape-1'],
    isActive: true,
  };

  it('should return the initial state', () => {
    expect(collaborationReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('setConnectionStatus', () => {
    it('should set connection status', () => {
      const actual = collaborationReducer(initialState, setConnectionStatus('connected'));
      expect(actual.connectionStatus).toBe('connected');
    });
  });

  describe('setCurrentUserId', () => {
    it('should set current user ID', () => {
      const actual = collaborationReducer(initialState, setCurrentUserId('user-123'));
      expect(actual.currentUserId).toBe('user-123');
    });
  });

  describe('addUser', () => {
    it('should add a new user', () => {
      const actual = collaborationReducer(initialState, addUser(mockUser));
      
      expect(actual.users).toHaveLength(1);
      expect(actual.users[0]).toEqual(mockUser);
    });

    it('should update existing user', () => {
      const stateWithUser = {
        ...initialState,
        users: [mockUser],
      };

      const updatedUser: UserPresence = {
        ...mockUser,
        cursor: { x: 300, y: 400 },
        isActive: false,
      };

      const actual = collaborationReducer(stateWithUser, addUser(updatedUser));
      
      expect(actual.users).toHaveLength(1);
      expect(actual.users[0]).toEqual(updatedUser);
    });
  });

  describe('removeUser', () => {
    it('should remove user by ID', () => {
      const stateWithUsers = {
        ...initialState,
        users: [
          mockUser,
          { ...mockUser, userId: 'user-2', name: 'Jane Doe' },
        ],
      };

      const actual = collaborationReducer(stateWithUsers, removeUser('user-1'));
      
      expect(actual.users).toHaveLength(1);
      expect(actual.users[0].userId).toBe('user-2');
    });

    it('should handle removing non-existent user', () => {
      const actual = collaborationReducer(initialState, removeUser('non-existent'));
      expect(actual.users).toHaveLength(0);
    });
  });

  describe('updateUserPresence', () => {
    it('should update user presence data', () => {
      const stateWithUser = {
        ...initialState,
        users: [mockUser],
      };

      const presenceUpdate = {
        cursor: { x: 500, y: 600 },
        selection: ['shape-2', 'shape-3'],
      };

      const actual = collaborationReducer(
        stateWithUser,
        updateUserPresence({ userId: 'user-1', presence: presenceUpdate })
      );

      expect(actual.users[0].cursor).toEqual(presenceUpdate.cursor);
      expect(actual.users[0].selection).toEqual(presenceUpdate.selection);
      expect(actual.users[0].name).toBe(mockUser.name); // Should preserve other fields
    });

    it('should handle updating non-existent user', () => {
      const actual = collaborationReducer(
        initialState,
        updateUserPresence({ userId: 'non-existent', presence: { isActive: false } })
      );
      
      expect(actual.users).toHaveLength(0);
    });
  });

  describe('clearUsers', () => {
    it('should clear all users', () => {
      const stateWithUsers = {
        ...initialState,
        users: [mockUser, { ...mockUser, userId: 'user-2' }],
      };

      const actual = collaborationReducer(stateWithUsers, clearUsers());
      expect(actual.users).toHaveLength(0);
    });
  });
});