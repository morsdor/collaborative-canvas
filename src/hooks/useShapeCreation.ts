import { useCallback, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { useYjsSync } from '@/hooks/useYjsSync';
import { ShapeCreationService } from '@/services/shapeCreationService';
import { Shape, Point, ShapeType, Tool } from '@/types';
import { setCurrentTool } from '@/store/slices/uiSlice';

interface UseShapeCreationOptions {
  sessionId: string;
  onShapeCreated?: (shape: Shape) => void;
  onCreationError?: (error: Error) => void;
}

interface UseShapeCreationReturn {
  createShapeAtPosition: (position: Point, customType?: ShapeType) => Promise<Shape | null>;
  isCreatingShape: boolean;
  previewShape: Shape | null;
  startShapeCreation: (type: ShapeType) => void;
  cancelShapeCreation: () => void;
}

export const useShapeCreation = (options: UseShapeCreationOptions): UseShapeCreationReturn => {
  const dispatch = useAppDispatch();
  const currentTool = useAppSelector((state) => state.ui.currentTool);
  const { addShape, isConnected } = useYjsSync({ sessionId: options.sessionId });
  
  const [isCreatingShape, setIsCreatingShape] = useState(false);
  const [previewShape, setPreviewShape] = useState<Shape | null>(null);

  /**
   * Create a shape at the specified position
   */
  const createShapeAtPosition = useCallback(async (
    position: Point,
    customType?: ShapeType
  ): Promise<Shape | null> => {
    try {
      setIsCreatingShape(true);

      // Determine shape type from current tool or custom type
      const shapeType = customType || getShapeTypeFromTool(currentTool);
      if (!shapeType) {
        throw new Error(`Cannot create shape: invalid tool '${currentTool}'`);
      }

      // Validate creation parameters
      if (!ShapeCreationService.validateShapeCreation({ type: shapeType, position })) {
        throw new Error('Invalid shape creation parameters');
      }

      // Create the shape
      const newShape = ShapeCreationService.createShapeAtPosition(shapeType, position);

      // Add to Yjs document for real-time synchronization
      if (isConnected) {
        addShape(newShape);
      } else {
        console.warn('Not connected to collaboration server, shape created locally only');
      }

      // Clear preview
      setPreviewShape(null);

      // Notify callback
      if (options.onShapeCreated) {
        options.onShapeCreated(newShape);
      }

      return newShape;
    } catch (error) {
      console.error('Error creating shape:', error);
      
      if (options.onCreationError) {
        options.onCreationError(error as Error);
      }
      
      return null;
    } finally {
      setIsCreatingShape(false);
    }
  }, [currentTool, addShape, isConnected, options]);

  /**
   * Start shape creation mode
   */
  const startShapeCreation = useCallback((type: ShapeType) => {
    const toolMap: Record<ShapeType, Tool> = {
      rectangle: 'rectangle',
      circle: 'circle',
      text: 'text',
      line: 'line',
    };

    dispatch(setCurrentTool(toolMap[type]));
  }, [dispatch]);

  /**
   * Cancel shape creation and return to select tool
   */
  const cancelShapeCreation = useCallback(() => {
    setPreviewShape(null);
    setIsCreatingShape(false);
    dispatch(setCurrentTool('select'));
  }, [dispatch]);

  return {
    createShapeAtPosition,
    isCreatingShape,
    previewShape,
    startShapeCreation,
    cancelShapeCreation,
  };
};

/**
 * Helper function to convert tool to shape type
 */
function getShapeTypeFromTool(tool: Tool): ShapeType | null {
  switch (tool) {
    case 'rectangle':
      return 'rectangle';
    case 'circle':
      return 'circle';
    case 'text':
      return 'text';
    case 'line':
      return 'line';
    case 'select':
    default:
      return null;
  }
}

/**
 * Hook for managing shape creation with preview functionality
 */
export const useShapeCreationWithPreview = (options: UseShapeCreationOptions) => {
  const baseHook = useShapeCreation(options);
  const [previewPosition, setPreviewPosition] = useState<Point | null>(null);

  const showPreview = useCallback((position: Point, type?: ShapeType) => {
    const currentTool = type || getShapeTypeFromTool(baseHook.previewShape?.type || 'rectangle');
    if (currentTool) {
      const preview = ShapeCreationService.createPreviewShape(currentTool, position);
      setPreviewPosition(position);
      // Note: We're not setting the preview shape in state here to avoid conflicts
      // The preview will be handled by the calling component
    }
  }, [baseHook.previewShape?.type]);

  const hidePreview = useCallback(() => {
    setPreviewPosition(null);
  }, []);

  return {
    ...baseHook,
    previewPosition,
    showPreview,
    hidePreview,
  };
};