import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

// Mock navigator.platform
Object.defineProperty(navigator, 'platform', {
  writable: true,
  value: 'MacIntel',
});

describe('useKeyboardShortcuts', () => {
  let mockHandlers: {
    onUndo: jest.Mock;
    onRedo: jest.Mock;
    onGroup: jest.Mock;
    onUngroup: jest.Mock;
    onDelete: jest.Mock;
    onSelectAll: jest.Mock;
    onCopy: jest.Mock;
    onPaste: jest.Mock;
    onCut: jest.Mock;
  };

  beforeEach(() => {
    mockHandlers = {
      onUndo: jest.fn(),
      onRedo: jest.fn(),
      onGroup: jest.fn(),
      onUngroup: jest.fn(),
      onDelete: jest.fn(),
      onSelectAll: jest.fn(),
      onCopy: jest.fn(),
      onPaste: jest.fn(),
      onCut: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Mac shortcuts', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: 'MacIntel',
      });
    });

    it('should handle Cmd+Z for undo', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onUndo).toHaveBeenCalledTimes(1);
    });

    it('should handle Cmd+Shift+Z for redo', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        shiftKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onRedo).toHaveBeenCalledTimes(1);
    });

    it('should handle Cmd+G for group', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'g',
        metaKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onGroup).toHaveBeenCalledTimes(1);
    });

    it('should handle Cmd+Shift+G for ungroup', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'g',
        metaKey: true,
        shiftKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onUngroup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Windows shortcuts', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: 'Win32',
      });
    });

    it('should handle Ctrl+Z for undo', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onUndo).toHaveBeenCalledTimes(1);
    });

    it('should handle Ctrl+Y for redo', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'y',
        ctrlKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onRedo).toHaveBeenCalledTimes(1);
    });

    it('should handle Ctrl+Shift+Z for redo', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onRedo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Common shortcuts', () => {
    it('should handle Delete key', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'Delete',
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onDelete).toHaveBeenCalledTimes(1);
    });

    it('should handle Backspace key', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'Backspace',
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onDelete).toHaveBeenCalledTimes(1);
    });

    it('should handle Cmd/Ctrl+A for select all', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onSelectAll).toHaveBeenCalledTimes(1);
    });

    it('should handle Cmd/Ctrl+C for copy', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onCopy).toHaveBeenCalledTimes(1);
    });

    it('should handle Cmd/Ctrl+V for paste', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'v',
        ctrlKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onPaste).toHaveBeenCalledTimes(1);
    });

    it('should handle Cmd/Ctrl+X for cut', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const event = new KeyboardEvent('keydown', {
        key: 'x',
        ctrlKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onCut).toHaveBeenCalledTimes(1);
    });
  });

  describe('Input field handling', () => {
    it('should not trigger shortcuts when typing in input field', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      // Mock input element as event target
      const inputElement = document.createElement('input');
      document.body.appendChild(inputElement);
      inputElement.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
      });
      
      Object.defineProperty(event, 'target', {
        value: inputElement,
        enumerable: true,
      });

      document.dispatchEvent(event);
      expect(mockHandlers.onUndo).not.toHaveBeenCalled();

      document.body.removeChild(inputElement);
    });

    it('should not trigger shortcuts when typing in textarea', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const textareaElement = document.createElement('textarea');
      document.body.appendChild(textareaElement);

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
      });
      
      Object.defineProperty(event, 'target', {
        value: textareaElement,
        enumerable: true,
      });

      document.dispatchEvent(event);
      expect(mockHandlers.onUndo).not.toHaveBeenCalled();

      document.body.removeChild(textareaElement);
    });

    it('should not trigger shortcuts in contentEditable elements', () => {
      renderHook(() => useKeyboardShortcuts(mockHandlers));

      const editableElement = document.createElement('div');
      editableElement.contentEditable = 'true';
      document.body.appendChild(editableElement);

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
      });
      
      Object.defineProperty(event, 'target', {
        value: editableElement,
        enumerable: true,
      });

      document.dispatchEvent(event);
      expect(mockHandlers.onUndo).not.toHaveBeenCalled();

      document.body.removeChild(editableElement);
    });
  });

  describe('Enabled/disabled state', () => {
    it('should not handle shortcuts when disabled', () => {
      renderHook(() => useKeyboardShortcuts({ ...mockHandlers, enabled: false }));

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onUndo).not.toHaveBeenCalled();
    });

    it('should handle shortcuts when enabled', () => {
      renderHook(() => useKeyboardShortcuts({ ...mockHandlers, enabled: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
      });
      
      document.dispatchEvent(event);
      expect(mockHandlers.onUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Return values', () => {
    it('should return utility functions', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockHandlers));

      expect(result.current.triggerUndo).toBe(mockHandlers.onUndo);
      expect(result.current.triggerRedo).toBe(mockHandlers.onRedo);
      expect(result.current.triggerGroup).toBe(mockHandlers.onGroup);
      expect(result.current.triggerUngroup).toBe(mockHandlers.onUngroup);
      expect(result.current.triggerDelete).toBe(mockHandlers.onDelete);
    });
  });
});