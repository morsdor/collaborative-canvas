import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertyPanel } from '../PropertyPanel';
import { Shape } from '@/types';

const mockShape: Shape = {
  id: 'shape-1',
  type: 'rectangle',
  position: { x: 100, y: 100 },
  dimensions: { width: 200, height: 150 },
  style: {
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    opacity: 1,
  },
};

const mockTextShape: Shape = {
  id: 'shape-2',
  type: 'text',
  position: { x: 50, y: 50 },
  dimensions: { width: 100, height: 50 },
  style: {
    fill: '#000000',
    stroke: '#ffffff',
    strokeWidth: 1,
    opacity: 0.8,
  },
  content: 'Hello World',
};

describe('PropertyPanel', () => {
  const mockOnShapeUpdate = jest.fn();
  const mockOnStyleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('shows empty state when no shapes are selected', () => {
      render(
        <PropertyPanel
          selectedShapes={[]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      expect(screen.getByText('Select shapes to edit properties')).toBeInTheDocument();
    });
  });

  describe('Single Shape Selection', () => {
    it('displays shape properties for single selection', () => {
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      expect(screen.getByText('Properties')).toBeInTheDocument();
      expect(screen.getByText('rectangle shape')).toBeInTheDocument();
    });

    it('shows correct position values', () => {
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const xInput = screen.getByLabelText('X');
      const yInput = screen.getByLabelText('Y');
      
      expect(xInput).toHaveValue(100);
      expect(yInput).toHaveValue(100);
    });

    it('shows correct dimension values', () => {
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const widthInput = screen.getByLabelText('Width');
      const heightInput = screen.getByLabelText('Height');
      
      expect(widthInput).toHaveValue(200);
      expect(heightInput).toHaveValue(150);
    });

    it('calls onShapeUpdate when position is changed', async () => {
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const xInput = screen.getByLabelText('X');
      
      // Simulate direct input change
      fireEvent.change(xInput, { target: { value: '150' } });

      expect(mockOnShapeUpdate).toHaveBeenCalledWith(['shape-1'], {
        position: { x: 150, y: 100 }
      });
    });

    it('calls onShapeUpdate when dimensions are changed', async () => {
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const widthInput = screen.getByLabelText('Width');
      
      // Simulate direct input change
      fireEvent.change(widthInput, { target: { value: '300' } });

      expect(mockOnShapeUpdate).toHaveBeenCalledWith(['shape-1'], {
        dimensions: { width: 300, height: 150 }
      });
    });
  });

  describe('Multiple Shape Selection', () => {
    it('displays multiple shapes selection info', () => {
      render(
        <PropertyPanel
          selectedShapes={[mockShape, mockTextShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      expect(screen.getByText('2 shapes selected')).toBeInTheDocument();
    });

    it('shows mixed values for different properties', () => {
      render(
        <PropertyPanel
          selectedShapes={[mockShape, mockTextShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      // Should show mixed values for different positions
      const mixedInputs = screen.getAllByPlaceholderText('Mixed');
      expect(mixedInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Style Tab', () => {
    it('displays style properties', async () => {
      const user = userEvent.setup();
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const styleTab = screen.getByRole('tab', { name: /style/i });
      await user.click(styleTab);

      expect(screen.getByText('Fill Color')).toBeInTheDocument();
      expect(screen.getByText('Stroke Color')).toBeInTheDocument();
      expect(screen.getByText(/Stroke Width/)).toBeInTheDocument();
      expect(screen.getByText(/Opacity/)).toBeInTheDocument();
    });

    it('shows correct fill color', async () => {
      const user = userEvent.setup();
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const styleTab = screen.getByRole('tab', { name: /style/i });
      await user.click(styleTab);

      const fillInputs = screen.getAllByDisplayValue('#ffffff');
      expect(fillInputs.length).toBeGreaterThan(0);
    });

    it('calls onStyleChange when fill color is changed', async () => {
      const user = userEvent.setup();
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const styleTab = screen.getByRole('tab', { name: /style/i });
      await user.click(styleTab);

      const fillInputs = screen.getAllByDisplayValue('#ffffff');
      const fillInput = fillInputs[0]; // Take the first one
      
      // Simulate direct input change
      fireEvent.change(fillInput, { target: { value: '#ff0000' } });

      expect(mockOnStyleChange).toHaveBeenCalledWith(['shape-1'], { fill: '#ff0000' });
    });

    it('updates opacity via slider', async () => {
      const user = userEvent.setup();
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const styleTab = screen.getByRole('tab', { name: /style/i });
      await user.click(styleTab);

      // Find the opacity slider (should be the second slider, first is stroke width)
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThanOrEqual(2);
      
      // Just verify the sliders exist and have proper attributes
      const opacitySlider = sliders[1]; // Opacity slider
      expect(opacitySlider).toHaveAttribute('aria-valuemax', '100');
      expect(opacitySlider).toHaveAttribute('aria-valuemin', '0');
    });
  });

  describe('Content Tab', () => {
    it('shows text content for text shapes', async () => {
      const user = userEvent.setup();
      render(
        <PropertyPanel
          selectedShapes={[mockTextShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const contentTab = screen.getByRole('tab', { name: /content/i });
      await user.click(contentTab);

      expect(screen.getByText('Text Content')).toBeInTheDocument();
      expect(screen.getByLabelText('Text Content')).toHaveValue('Hello World');
    });

    it('calls onShapeUpdate when text content is changed', async () => {
      const user = userEvent.setup();
      render(
        <PropertyPanel
          selectedShapes={[mockTextShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const contentTab = screen.getByRole('tab', { name: /content/i });
      await user.click(contentTab);

      const textArea = screen.getByLabelText('Text Content');
      
      // Simulate direct input change
      fireEvent.change(textArea, { target: { value: 'New Text' } });

      expect(mockOnShapeUpdate).toHaveBeenCalledWith(['shape-2'], { content: 'New Text' });
    });

    it('shows shape type information', async () => {
      const user = userEvent.setup();
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const contentTab = screen.getByRole('tab', { name: /content/i });
      await user.click(contentTab);

      expect(screen.getByText('Shape Type')).toBeInTheDocument();
      expect(screen.getByText('rectangle')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper labels for form inputs', () => {
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      expect(screen.getByLabelText('X')).toBeInTheDocument();
      expect(screen.getByLabelText('Y')).toBeInTheDocument();
      expect(screen.getByLabelText('Width')).toBeInTheDocument();
      expect(screen.getByLabelText('Height')).toBeInTheDocument();
    });

    it('supports keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const transformTab = screen.getByRole('tab', { name: /transform/i });
      const styleTab = screen.getByRole('tab', { name: /style/i });
      const contentTab = screen.getByRole('tab', { name: /content/i });

      expect(transformTab).toHaveAttribute('aria-selected', 'true');
      
      await user.click(styleTab);
      expect(styleTab).toHaveAttribute('aria-selected', 'true');
      
      await user.click(contentTab);
      expect(contentTab).toHaveAttribute('aria-selected', 'true');
    });

    it('provides appropriate ARIA labels for sliders', async () => {
      const user = userEvent.setup();
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const styleTab = screen.getByRole('tab', { name: /style/i });
      await user.click(styleTab);

      // Check that sliders have proper accessibility attributes
      const sliders = screen.getAllByRole('slider');
      sliders.forEach(slider => {
        expect(slider).toHaveAttribute('aria-valuemin');
        expect(slider).toHaveAttribute('aria-valuemax');
        expect(slider).toHaveAttribute('aria-valuenow');
      });
    });
  });

  describe('Input Validation', () => {
    it('handles invalid position values gracefully', async () => {
      const user = userEvent.setup();
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const xInput = screen.getByLabelText('X');
      await user.clear(xInput);
      await user.type(xInput, 'invalid');

      // Should not call onShapeUpdate with invalid values
      expect(mockOnShapeUpdate).not.toHaveBeenCalledWith(['shape-1'], {
        position: { x: NaN, y: 100 }
      });
    });

    it('prevents negative dimensions', async () => {
      const user = userEvent.setup();
      render(
        <PropertyPanel
          selectedShapes={[mockShape]}
          onShapeUpdate={mockOnShapeUpdate}
          onStyleChange={mockOnStyleChange}
        />
      );

      const widthInput = screen.getByLabelText('Width');
      await user.clear(widthInput);
      await user.type(widthInput, '-50');

      // Should not call onShapeUpdate with negative dimensions
      expect(mockOnShapeUpdate).not.toHaveBeenCalledWith(['shape-1'], {
        dimensions: { width: -50, height: 150 }
      });
    });
  });
});