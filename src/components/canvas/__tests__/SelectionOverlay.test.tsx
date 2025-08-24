import React from 'react';
import { render } from '@testing-library/react';
import { SelectionOverlay } from '../SelectionOverlay';
import { Point } from '@/types';

// Mock the SelectionService
jest.mock('@/services/selectionService', () => ({
  SelectionService: {
    createRectangleFromPoints: jest.fn((start: Point, end: Point) => ({
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    })),
  },
}));

describe('SelectionOverlay', () => {
  const defaultProps = {
    isMultiSelecting: false,
    selectionRectangle: null,
    zoom: 1,
    panOffset: { x: 0, y: 0 },
  };

  it('should not render when not multi-selecting', () => {
    const { container } = render(<SelectionOverlay {...defaultProps} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should not render when selection rectangle is null', () => {
    const { container } = render(
      <SelectionOverlay
        {...defaultProps}
        isMultiSelecting={true}
        selectionRectangle={null}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should render selection rectangle when multi-selecting', () => {
    const selectionRectangle = {
      start: { x: 10, y: 20 },
      end: { x: 100, y: 80 },
    };

    const { container } = render(
      <SelectionOverlay
        {...defaultProps}
        isMultiSelecting={true}
        selectionRectangle={selectionRectangle}
      />
    );

    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('border-2', 'border-blue-500', 'bg-blue-100', 'bg-opacity-20');
  });

  it('should apply correct positioning and dimensions', () => {
    const selectionRectangle = {
      start: { x: 50, y: 30 },
      end: { x: 150, y: 120 },
    };

    const { container } = render(
      <SelectionOverlay
        {...defaultProps}
        isMultiSelecting={true}
        selectionRectangle={selectionRectangle}
        zoom={2}
        panOffset={{ x: 10, y: 20 }}
      />
    );

    const overlay = container.firstChild as HTMLElement;
    expect(overlay.style.left).toBe('50px');
    expect(overlay.style.top).toBe('30px');
    expect(overlay.style.width).toBe('100px');
    expect(overlay.style.height).toBe('90px');
    expect(overlay.style.transform).toBe('scale(2) translate(-10px, -20px)');
  });

  it('should handle negative selection (drag from bottom-right to top-left)', () => {
    const selectionRectangle = {
      start: { x: 100, y: 80 },
      end: { x: 10, y: 20 },
    };

    const { container } = render(
      <SelectionOverlay
        {...defaultProps}
        isMultiSelecting={true}
        selectionRectangle={selectionRectangle}
      />
    );

    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toBeInTheDocument();
    // The SelectionService.createRectangleFromPoints should normalize the coordinates
  });
});