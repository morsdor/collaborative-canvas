import { renderHook, act } from '@testing-library/react';
import { useTextEditing, useTextFormatting } from '../useTextEditing';
import { Shape, TextStyle } from '@/types';

describe('useTextEditing', () => {
  const mockOptions = {
    onTextChange: jest.fn(),
    onTextStyleChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('initializes with no shape being edited', () => {
      const { result } = renderHook(() => useTextEditing());
      
      expect(result.current.editingShapeId).toBeNull();
    });

    it('starts editing a shape', () => {
      const { result } = renderHook(() => useTextEditing());
      
      act(() => {
        result.current.startEditing('shape-1');
      });
      
      expect(result.current.editingShapeId).toBe('shape-1');
    });

    it('checks if a shape is being edited', () => {
      const { result } = renderHook(() => useTextEditing());
      
      act(() => {
        result.current.startEditing('shape-1');
      });
      
      expect(result.current.isEditing('shape-1')).toBe(true);
      expect(result.current.isEditing('shape-2')).toBe(false);
    });

    it('finishes editing and calls onTextChange', () => {
      const { result } = renderHook(() => useTextEditing(mockOptions));
      
      act(() => {
        result.current.startEditing('shape-1');
      });
      
      act(() => {
        result.current.finishEditing('New text content');
      });
      
      expect(mockOptions.onTextChange).toHaveBeenCalledWith('shape-1', 'New text content');
      expect(result.current.editingShapeId).toBeNull();
    });

    it('cancels editing without calling onTextChange', () => {
      const { result } = renderHook(() => useTextEditing(mockOptions));
      
      act(() => {
        result.current.startEditing('shape-1');
      });
      
      act(() => {
        result.current.cancelEditing();
      });
      
      expect(mockOptions.onTextChange).not.toHaveBeenCalled();
      expect(result.current.editingShapeId).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles finishing editing when no shape is being edited', () => {
      const { result } = renderHook(() => useTextEditing(mockOptions));
      
      act(() => {
        result.current.finishEditing('Some text');
      });
      
      expect(mockOptions.onTextChange).not.toHaveBeenCalled();
    });

    it('handles multiple start editing calls', () => {
      const { result } = renderHook(() => useTextEditing());
      
      act(() => {
        result.current.startEditing('shape-1');
      });
      
      act(() => {
        result.current.startEditing('shape-2');
      });
      
      expect(result.current.editingShapeId).toBe('shape-2');
    });

    it('works without options provided', () => {
      const { result } = renderHook(() => useTextEditing());
      
      expect(() => {
        act(() => {
          result.current.startEditing('shape-1');
          result.current.finishEditing('text');
        });
      }).not.toThrow();
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      // Mock addEventListener and removeEventListener
      jest.spyOn(document, 'addEventListener');
      jest.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('sets up keyboard event listeners', () => {
      renderHook(() => useTextEditing());
      
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('cleans up keyboard event listeners on unmount', () => {
      const { unmount } = renderHook(() => useTextEditing());
      
      unmount();
      
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('prevents default for Ctrl+B when not editing', () => {
      renderHook(() => useTextEditing());
      
      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
      });
      
      const preventDefaultSpy = jest.spyOn(keydownEvent, 'preventDefault');
      
      document.dispatchEvent(keydownEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('does not handle shortcuts when editing', () => {
      const { result } = renderHook(() => useTextEditing());
      
      act(() => {
        result.current.startEditing('shape-1');
      });
      
      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
      });
      
      const preventDefaultSpy = jest.spyOn(keydownEvent, 'preventDefault');
      
      document.dispatchEvent(keydownEvent);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });
});

describe('useTextFormatting', () => {
  const mockShapes: Shape[] = [
    {
      id: 'text-1',
      type: 'text',
      position: { x: 0, y: 0 },
      dimensions: { width: 100, height: 50 },
      style: { fill: '#000', stroke: '#000', strokeWidth: 1, opacity: 1 },
      content: 'Text 1',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        color: '#000000',
      },
    },
    {
      id: 'text-2',
      type: 'text',
      position: { x: 100, y: 0 },
      dimensions: { width: 100, height: 50 },
      style: { fill: '#000', stroke: '#000', strokeWidth: 1, opacity: 1 },
      content: 'Text 2',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Helvetica, sans-serif',
        textAlign: 'left',
        color: '#ff0000',
      },
    },
    {
      id: 'rect-1',
      type: 'rectangle',
      position: { x: 200, y: 0 },
      dimensions: { width: 100, height: 50 },
      style: { fill: '#000', stroke: '#000', strokeWidth: 1, opacity: 1 },
    },
  ];

  describe('applyTextStyle', () => {
    it('applies text style to specified text shapes', () => {
      const { result } = renderHook(() => useTextFormatting());
      
      const updatedShapes = result.current.applyTextStyle(
        mockShapes,
        ['text-1'],
        { fontSize: 24, fontWeight: 'bold' }
      );
      
      const updatedShape = updatedShapes.find(s => s.id === 'text-1');
      expect(updatedShape?.textStyle).toEqual({
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        color: '#000000',
      });
    });

    it('applies text style to multiple text shapes', () => {
      const { result } = renderHook(() => useTextFormatting());
      
      const updatedShapes = result.current.applyTextStyle(
        mockShapes,
        ['text-1', 'text-2'],
        { fontSize: 20 }
      );
      
      const updatedShape1 = updatedShapes.find(s => s.id === 'text-1');
      const updatedShape2 = updatedShapes.find(s => s.id === 'text-2');
      
      expect(updatedShape1?.textStyle?.fontSize).toBe(20);
      expect(updatedShape2?.textStyle?.fontSize).toBe(20);
    });

    it('does not modify non-text shapes', () => {
      const { result } = renderHook(() => useTextFormatting());
      
      const updatedShapes = result.current.applyTextStyle(
        mockShapes,
        ['rect-1'],
        { fontSize: 24 }
      );
      
      const rectShape = updatedShapes.find(s => s.id === 'rect-1');
      expect(rectShape?.textStyle).toBeUndefined();
    });

    it('does not modify shapes not in the target list', () => {
      const { result } = renderHook(() => useTextFormatting());
      
      const updatedShapes = result.current.applyTextStyle(
        mockShapes,
        ['text-1'],
        { fontSize: 24 }
      );
      
      const unchangedShape = updatedShapes.find(s => s.id === 'text-2');
      expect(unchangedShape?.textStyle?.fontSize).toBe(18); // Original value
    });

    it('handles shapes without existing textStyle', () => {
      const shapeWithoutTextStyle: Shape = {
        id: 'text-3',
        type: 'text',
        position: { x: 0, y: 0 },
        dimensions: { width: 100, height: 50 },
        style: { fill: '#000', stroke: '#000', strokeWidth: 1, opacity: 1 },
        content: 'Text 3',
      };

      const { result } = renderHook(() => useTextFormatting());
      
      const updatedShapes = result.current.applyTextStyle(
        [shapeWithoutTextStyle],
        ['text-3'],
        { fontSize: 24 }
      );
      
      const updatedShape = updatedShapes.find(s => s.id === 'text-3');
      expect(updatedShape?.textStyle?.fontSize).toBe(24);
    });

    it('preserves existing textStyle properties when applying partial updates', () => {
      const { result } = renderHook(() => useTextFormatting());
      
      const updatedShapes = result.current.applyTextStyle(
        mockShapes,
        ['text-1'],
        { fontSize: 24 } // Only updating fontSize
      );
      
      const updatedShape = updatedShapes.find(s => s.id === 'text-1');
      expect(updatedShape?.textStyle).toEqual({
        fontSize: 24, // Updated
        fontWeight: 'normal', // Preserved
        fontFamily: 'Arial, sans-serif', // Preserved
        textAlign: 'center', // Preserved
        color: '#000000', // Preserved
      });
    });
  });

  describe('getDefaultTextStyle', () => {
    it('returns default text style', () => {
      const { result } = renderHook(() => useTextFormatting());
      
      const defaultStyle = result.current.getDefaultTextStyle();
      
      expect(defaultStyle).toEqual({
        fontSize: 16,
        fontWeight: 'normal',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        color: '#000000',
      });
    });

    it('returns a new object each time (not a reference)', () => {
      const { result } = renderHook(() => useTextFormatting());
      
      const style1 = result.current.getDefaultTextStyle();
      const style2 = result.current.getDefaultTextStyle();
      
      expect(style1).toEqual(style2);
      expect(style1).not.toBe(style2); // Different object references
    });
  });

  describe('Immutability', () => {
    it('does not mutate the original shapes array', () => {
      const { result } = renderHook(() => useTextFormatting());
      const originalShapes = [...mockShapes];
      
      result.current.applyTextStyle(
        mockShapes,
        ['text-1'],
        { fontSize: 24 }
      );
      
      expect(mockShapes).toEqual(originalShapes);
    });

    it('does not mutate individual shape objects', () => {
      const { result } = renderHook(() => useTextFormatting());
      const originalShape = { ...mockShapes[0] };
      
      result.current.applyTextStyle(
        mockShapes,
        ['text-1'],
        { fontSize: 24 }
      );
      
      expect(mockShapes[0]).toEqual(originalShape);
    });
  });
});