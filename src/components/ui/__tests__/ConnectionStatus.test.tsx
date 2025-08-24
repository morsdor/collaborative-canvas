import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ConnectionStatus } from '../ConnectionStatus';
import collaborationReducer, { setConnectionStatus } from '@/store/slices/collaborationSlice';

const createTestStore = (initialConnectionStatus = 'disconnected') => {
  const store = configureStore({
    reducer: {
      collaboration: collaborationReducer,
    },
  });
  
  store.dispatch(setConnectionStatus(initialConnectionStatus as any));
  return store;
};

const renderWithStore = (component: React.ReactElement, store: ReturnType<typeof createTestStore>) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('ConnectionStatus', () => {
  describe('Basic rendering', () => {
    it('should render connected status correctly', () => {
      const store = createTestStore('connected');
      renderWithStore(<ConnectionStatus />, store);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('●')).toBeInTheDocument();
    });

    it('should render connecting status correctly', () => {
      const store = createTestStore('connecting');
      renderWithStore(<ConnectionStatus />, store);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(screen.getByText('◐')).toBeInTheDocument();
    });

    it('should render disconnected status correctly', () => {
      const store = createTestStore('disconnected');
      renderWithStore(<ConnectionStatus />, store);
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('●')).toBeInTheDocument();
    });
  });

  describe('Detailed view', () => {
    it('should show detailed information when showDetails is true', () => {
      const store = createTestStore('connected');
      renderWithStore(<ConnectionStatus showDetails />, store);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Real-time collaboration is active')).toBeInTheDocument();
    });

    it('should show retry button for disconnected state with details', () => {
      const store = createTestStore('disconnected');
      const onRetry = jest.fn();
      
      renderWithStore(<ConnectionStatus showDetails onRetry={onRetry} />, store);
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('Working offline - changes will sync when reconnected')).toBeInTheDocument();
      
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button for connected state', () => {
      const store = createTestStore('connected');
      const onRetry = jest.fn();
      
      renderWithStore(<ConnectionStatus showDetails onRetry={onRetry} />, store);
      
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should not show retry button for connecting state', () => {
      const store = createTestStore('connecting');
      const onRetry = jest.fn();
      
      renderWithStore(<ConnectionStatus showDetails onRetry={onRetry} />, store);
      
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const store = createTestStore('connected');
      const { container } = renderWithStore(
        <ConnectionStatus className="custom-class" />, 
        store
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should apply correct color classes for different states', () => {
      const states = [
        { status: 'connected', colorClass: 'text-green-600' },
        { status: 'connecting', colorClass: 'text-yellow-600' },
        { status: 'disconnected', colorClass: 'text-red-600' },
      ];

      states.forEach(({ status, colorClass }) => {
        const store = createTestStore(status);
        const { container } = renderWithStore(<ConnectionStatus />, store);
        
        const statusElement = container.querySelector(`.${colorClass}`);
        expect(statusElement).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus management for retry button', () => {
      const store = createTestStore('disconnected');
      const onRetry = jest.fn();
      
      renderWithStore(<ConnectionStatus showDetails onRetry={onRetry} />, store);
      
      const retryButton = screen.getByText('Retry');
      retryButton.focus();
      
      expect(retryButton).toHaveFocus();
      
      // Test keyboard interaction
      fireEvent.keyDown(retryButton, { key: 'Enter' });
      fireEvent.keyUp(retryButton, { key: 'Enter' });
      
      // The button should be focusable (buttons are focusable by default)
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('State transitions', () => {
    it('should update display when connection status changes', () => {
      const store = createTestStore('connecting');
      const { rerender } = renderWithStore(<ConnectionStatus />, store);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      
      // Change status to connected
      act(() => {
        store.dispatch(setConnectionStatus('connected'));
      });
      rerender(
        <Provider store={store}>
          <ConnectionStatus />
        </Provider>
      );
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
    });
  });
});