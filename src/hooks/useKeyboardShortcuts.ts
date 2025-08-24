import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onUndo?: () => void;
  onRedo?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onToolSelect?: (tool: 'select' | 'rectangle' | 'circle' | 'text' | 'line') => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = (options: KeyboardShortcutsOptions) => {
  const {
    onUndo,
    onRedo,
    onGroup,
    onUngroup,
    onDelete,
    onSelectAll,
    onCopy,
    onPaste,
    onCut,
    onToolSelect,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

    // Prevent default browser shortcuts
    if (cmdOrCtrl) {
      switch (event.key.toLowerCase()) {
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            onRedo?.();
          } else {
            onUndo?.();
          }
          break;
        case 'y':
          if (!isMac) {
            event.preventDefault();
            onRedo?.();
          }
          break;
        case 'g':
          event.preventDefault();
          if (event.shiftKey) {
            onUngroup?.();
          } else {
            onGroup?.();
          }
          break;
        case 'a':
          event.preventDefault();
          onSelectAll?.();
          break;
        case 'c':
          event.preventDefault();
          onCopy?.();
          break;
        case 'v':
          event.preventDefault();
          onPaste?.();
          break;
        case 'x':
          event.preventDefault();
          onCut?.();
          break;
      }
    }

    // Non-modifier key shortcuts
    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        onDelete?.();
        break;
    }

    // Tool selection shortcuts (only when no modifiers are pressed)
    if (!cmdOrCtrl && !event.shiftKey && !event.altKey) {
      switch (event.key.toLowerCase()) {
        case 'v':
          event.preventDefault();
          onToolSelect?.('select');
          break;
        case 'r':
          event.preventDefault();
          onToolSelect?.('rectangle');
          break;
        case 'c':
          event.preventDefault();
          onToolSelect?.('circle');
          break;
        case 't':
          event.preventDefault();
          onToolSelect?.('text');
          break;
        case 'l':
          event.preventDefault();
          onToolSelect?.('line');
          break;
      }
    }
  }, [enabled, onUndo, onRedo, onGroup, onUngroup, onDelete, onSelectAll, onCopy, onPaste, onCut, onToolSelect]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  return {
    // Return utility functions for manual triggering
    triggerUndo: onUndo,
    triggerRedo: onRedo,
    triggerGroup: onGroup,
    triggerUngroup: onUngroup,
    triggerDelete: onDelete,
  };
};

export default useKeyboardShortcuts;