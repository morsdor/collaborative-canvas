import React from 'react';
import { render, screen } from '@testing-library/react';
import { SelectionOverlay } from '../SelectionOverlay';

// Mock the SelectionService
jest.mock('@/services/selectionService', () => ({
  SelectionService: {
    createRectangleFromPoints: jest.fn((start, end) => ({
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    })),
  },
}));

describe('Selection Integration', () => {
  describe('Selection Overlay Rendering', () => {
    it('should render selection overlay when multi-selecting', () => {
      const selectionRectangle = {
        start: { x: 10, y: 10 },
        end: { x: 100, y: 100 },
      };

      render(
        <SelectionOverlay
          isMultiSelecting={true}
          selectionRectangle={selectionRectangle}
          zoom={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      // Selection overlay should be rendered
      const overlay = document.querySelector('.border-blue-500');
      expect(overlay).toBeInTheDocument();
    });

    it('should not render selection overlay when not multi-selecting', () => {
      render(
        <SelectionOverlay
          isMultiSelecting={false}
          selectionRectangle={null}
          zoom={1}
          panOffset={{ x: 0, y: 0 }}
        />
      );

      // Selection overlay should not be rendered
      const overlay = document.querySelector('.border-blue-500');
      expect(overlay).not.toBeInTheDocument();
    });

    it('should apply correct styling and positioning', () => {
      const selectionRectangle = {
        start: { x: 50, y: 30 },
        end: { x: 150, y: 120 },
      };

      render(
        <SelectionOverlay
          isMultiSelecting={true}
          selectionRectangle={selectionRectangle}
          zoom={2}
          panOffset={{ x: 10, y: 20 }}
        />
      );

      const overlay = document.querySelector('.border-blue-500') as HTMLElement;
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('bg-blue-100', 'bg-opacity-20', 'pointer-events-none');
    });
  });
});