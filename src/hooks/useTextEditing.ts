import { useState, useCallback, useRef, useEffect } from 'react';
import { Shape, TextStyle } from '@/types';

interface UseTextEditingOptions {
  onTextChange?: (shapeId: string, content: string) => void;
  onTextStyleChange?: (shapeId: string, textStyle: Partial<TextStyle>) => void;
}

interface UseTextEditingReturn {
  editingShapeId: string | null;
  startEditing: (shapeId: string) => void;
  finishEditing: (content: string) => void;
  cancelEditing: () => void;
  isEditing: (shapeId: string) => boolean;
}

export const useTextEditing = (options: UseTextEditingOptions = {}): UseTextEditingReturn => {
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const originalContentRef = useRef<string>('');

  const startEditing = useCallback((shapeId: string) => {
    setEditingShapeId(shapeId);
  }, []);

  const finishEditing = useCallback((content: string) => {
    if (editingShapeId && options.onTextChange) {
      options.onTextChange(editingShapeId, content);
    }
    setEditingShapeId(null);
    originalContentRef.current = '';
  }, [editingShapeId, options]);

  const cancelEditing = useCallback(() => {
    setEditingShapeId(null);
    originalContentRef.current = '';
  }, []);

  const isEditing = useCallback((shapeId: string) => {
    return editingShapeId === shapeId;
  }, [editingShapeId]);

  // Handle keyboard shortcuts for text editing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not editing (to avoid conflicts with text input)
      if (editingShapeId) return;

      // Handle text formatting shortcuts when text shapes are selected
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'b':
            // Bold toggle - this would need to be connected to selected shapes
            event.preventDefault();
            break;
          case 'i':
            // Italic toggle - could be added in future
            event.preventDefault();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingShapeId]);

  return {
    editingShapeId,
    startEditing,
    finishEditing,
    cancelEditing,
    isEditing,
  };
};

/**
 * Hook for managing text formatting operations
 */
export const useTextFormatting = () => {
  const applyTextStyle = useCallback((
    shapes: Shape[],
    shapeIds: string[],
    textStyle: Partial<TextStyle>
  ): Shape[] => {
    return shapes.map(shape => {
      if (shapeIds.includes(shape.id) && shape.type === 'text') {
        return {
          ...shape,
          textStyle: {
            ...shape.textStyle,
            ...textStyle,
          } as TextStyle,
        };
      }
      return shape;
    });
  }, []);

  const getDefaultTextStyle = useCallback((): TextStyle => {
    return {
      fontSize: 16,
      fontWeight: 'normal',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      color: '#000000',
    };
  }, []);

  return {
    applyTextStyle,
    getDefaultTextStyle,
  };
};