import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../useSelection';
import { Shape, Point } from '@/types';

// Mock the viewport utilities
jest.mock('@/utils/viewport', () => ({
  screenToCanvas: jest.fn((screenPoint: Point, zoom: number, panOffset: Point) => ({
    x: screenPoint.x / zoom + panOffset.x,
    y: screenPoint.y / zoom + panOffset.y,
  })),
}));

// Mock the selection service
jest.mock('@/services/selectionService', () => ({
  SelectionService: {
    getShapeAtPoint: jest.fn(),
    getShapesInRectangle: jest.fn(),
    createRectangleFromPoints: jest.fn(),
    isValidSelectionRectangle: jest.fn(),
  },
}));

const mockShapes: Shape[] = [
  {
    id: 'shape1',
    type: 'rectangle',
    position: { x: 10, y: 10 },
    dimensions: { width: 50, height: 30 },
    style: { fill: '#ff0000', stroke: '#000000', strokeWidth: 1, opacity: 1 },
  },
  {
    id: 'shape2',
    type: 'circle',
    position: { x: 100, y: 50 },
    dimensions: { width: 40, height: 40 },
    style: { fill: '#00ff00', stroke: '#000000', strokeWidth: 1, opacity: 1 },
  },
];

// Mock Redux hooks
const mockDispatch = jest.fn();
const mockUiState = {
  selectedShapeIds: [],
  isMultiSelecting: false,
  selectionRectangle: null,
};

jest.mock('../redux', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => {
    const mockState = {
      ui: mockUiState,
    };
    return selector(mockState);
  },
}));

const renderUseSelection = (props = {}) => {
  const defaultProps = {
    shapes: mockShapes,
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    ...props,
  };

  return renderHook(() => useSelection(defaultProps));
};

describe('useSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectShape', () => {
    it('should select a single shape', () => {
      const { result } = renderUseSelection();

      act(() => {
        result.current.selectShape('shape1');
      });

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should add to selection with multiSelect', () => {
      mockUiState.selectedShapeIds = ['shape1'];
      const { result } = renderUseSelection();

      act(() => {
        result.current.selectShape('shape2', true);
      });

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should remove from selection if already selected with multiSelect', () => {
      mockUiState.selectedShapeIds = ['shape1', 'shape2'];
      const { result } = renderUseSelection();

      act(() => {
        result.current.selectShape('shape1', true);
      });

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('handleShapeClick', () => {
    it('should select shape on click', () => {
      const { result } = renderUseSelection();
      const mockEvent = {
        stopPropagation: jest.fn(),
        ctrlKey: false,
        metaKey: false,
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleShapeClick('shape1', mockEvent);
      });

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should handle multi-select with Ctrl key', () => {
      mockUiState.selectedShapeIds = ['shape1'];
      const { result } = renderUseSelection();
      const mockEvent = {
        stopPropagation: jest.fn(),
        ctrlKey: true,
        metaKey: false,
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleShapeClick('shape2', mockEvent);
      });

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should handle multi-select with Meta key', () => {
      mockUiState.selectedShapeIds = ['shape1'];
      const { result } = renderUseSelection();
      const mockEvent = {
        stopPropagation: jest.fn(),
        ctrlKey: false,
        metaKey: true,
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleShapeClick('shape2', mockEvent);
      });

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('area selection', () => {
    it('should start area selection', () => {
      const { result } = renderUseSelection();
      const screenPoint: Point = { x: 100, y: 100 };

      act(() => {
        result.current.startAreaSelection(screenPoint);
      });

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should update area selection when conditions are met', () => {
      // First start area selection to set up the internal state
      const { result } = renderUseSelection();
      const startPoint: Point = { x: 100, y: 100 };
      const updatePoint: Point = { x: 200, y: 150 };

      act(() => {
        result.current.startAreaSelection(startPoint);
      });

      // Clear previous dispatch calls
      mockDispatch.mockClear();

      act(() => {
        result.current.updateAreaSelection(updatePoint);
      });

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('clearAllSelections', () => {
    it('should clear all selections', () => {
      mockUiState.selectedShapeIds = ['shape1', 'shape2'];
      const { result } = renderUseSelection();

      act(() => {
        result.current.clearAllSelections();
      });

      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});