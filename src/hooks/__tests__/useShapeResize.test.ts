import { renderHook, act } from '@testing-library/react';
import { useShapeResize, ResizeHandle } from '../useShapeResize';
import { Shape, ShapeType, Point, Size } from '@/types';

// Mock shape for testing
const createMockShape = (overrides?: Partial<Shape>): Shape => ({
  id: 'test-shape',
  type: 'rectangle' as ShapeType,
  position: { x: 100, y: 100 },
  dimensions: { width: 200, height: 150 },
  style: {
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 1,
    opacity: 1,
  },
  ...overrides,
});

describe('useShapeResize', () => {
  const mockOnResize = jest.fn();
  const defaultProps = {
    shape: createMockShape(),
    onResize: mockOnResize,
    zoom: 1,
    panOffset: { x: 0, y: 0 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useShapeResize(defaultProps));

    expect(result.current.isResizing).toBe(false);
    expect(result.current.currentHandle).toBe(null);
  });

  it('should start resize operation', () => {
    const { result } = renderHook(() => useShapeResize(defaultProps));

    act(() => {
      result.current.startResize('se', { x: 300, y: 250 });
    });

    expect(result.current.isResizing).toBe(true);
    expect(result.current.currentHandle).toBe('se');
  });

  it('should end resize operation', () => {
    const { result } = renderHook(() => useShapeResize(defaultProps));

    act(() => {
      result.current.startResize('se', { x: 300, y: 250 });
    });

    expect(result.current.isResizing).toBe(true);

    act(() => {
      result.current.endResize();
    });

    expect(result.current.isResizing).toBe(false);
    expect(result.current.currentHandle).toBe(null);
  });

  describe('resize operations', () => {
    it('should resize from southeast handle', () => {
      const { result } = renderHook(() => useShapeResize(defaultProps));

      act(() => {
        result.current.startResize('se', { x: 300, y: 250 });
      });

      act(() => {
        result.current.updateResize({ x: 350, y: 300 });
      });

      expect(mockOnResize).toHaveBeenCalledWith(
        'test-shape',
        { width: 250, height: 200 }, // Increased by 50px each
        { x: 100, y: 100 } // Position unchanged for SE resize
      );
    });

    it('should resize from northwest handle', () => {
      const { result } = renderHook(() => useShapeResize(defaultProps));

      act(() => {
        result.current.startResize('nw', { x: 100, y: 100 });
      });

      act(() => {
        result.current.updateResize({ x: 50, y: 50 });
      });

      expect(mockOnResize).toHaveBeenCalledWith(
        'test-shape',
        { width: 250, height: 200 }, // Increased by 50px each
        { x: 50, y: 50 } // Position moved by resize amount
      );
    });

    it('should resize from east handle (width only)', () => {
      const { result } = renderHook(() => useShapeResize(defaultProps));

      act(() => {
        result.current.startResize('e', { x: 300, y: 175 });
      });

      act(() => {
        result.current.updateResize({ x: 350, y: 175 });
      });

      expect(mockOnResize).toHaveBeenCalledWith(
        'test-shape',
        { width: 250, height: 150 }, // Only width changed
        { x: 100, y: 100 } // Position unchanged
      );
    });

    it('should resize from north handle (height only)', () => {
      const { result } = renderHook(() => useShapeResize(defaultProps));

      act(() => {
        result.current.startResize('n', { x: 200, y: 100 });
      });

      act(() => {
        result.current.updateResize({ x: 200, y: 50 });
      });

      expect(mockOnResize).toHaveBeenCalledWith(
        'test-shape',
        { width: 200, height: 200 }, // Only height changed
        { x: 100, y: 50 } // Y position moved
      );
    });

    it('should enforce minimum dimensions', () => {
      const { result } = renderHook(() => useShapeResize(defaultProps));

      act(() => {
        result.current.startResize('se', { x: 300, y: 250 });
      });

      // Try to resize to very small dimensions
      act(() => {
        result.current.updateResize({ x: 105, y: 105 });
      });

      expect(mockOnResize).toHaveBeenCalledWith(
        'test-shape',
        { width: 10, height: 10 }, // Minimum size enforced
        { x: 100, y: 100 }
      );
    });

    it('should maintain aspect ratio for circles', () => {
      const circleShape = createMockShape({ type: 'circle' });
      const { result } = renderHook(() => 
        useShapeResize({ ...defaultProps, shape: circleShape })
      );

      act(() => {
        result.current.startResize('se', { x: 300, y: 250 });
      });

      act(() => {
        result.current.updateResize({ x: 350, y: 280 });
      });

      // Should use the larger dimension for both width and height
      expect(mockOnResize).toHaveBeenCalledWith(
        'test-shape',
        { width: 250, height: 250 }, // Aspect ratio maintained
        { x: 100, y: 100 }
      );
    });

    it('should handle zoom factor correctly', () => {
      const zoomedProps = { ...defaultProps, zoom: 2 };
      const { result } = renderHook(() => useShapeResize(zoomedProps));

      act(() => {
        result.current.startResize('se', { x: 300, y: 250 });
      });

      act(() => {
        result.current.updateResize({ x: 400, y: 350 });
      });

      // Delta should be divided by zoom factor
      expect(mockOnResize).toHaveBeenCalledWith(
        'test-shape',
        { width: 250, height: 200 }, // 100px screen delta = 50px canvas delta at 2x zoom
        { x: 100, y: 100 }
      );
    });
  });

  describe('edge cases', () => {
    it('should not call onResize when not resizing', () => {
      const { result } = renderHook(() => useShapeResize(defaultProps));

      act(() => {
        result.current.updateResize({ x: 350, y: 300 });
      });

      expect(mockOnResize).not.toHaveBeenCalled();
    });

    it('should handle missing resize state gracefully', () => {
      const { result } = renderHook(() => useShapeResize(defaultProps));

      // Try to update resize without starting
      expect(() => {
        act(() => {
          result.current.updateResize({ x: 350, y: 300 });
        });
      }).not.toThrow();
    });
  });
});