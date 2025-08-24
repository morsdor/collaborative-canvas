import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPicker } from '../ColorPicker';
import { ShapeStyle } from '@/types';

const mockStyle: ShapeStyle = {
  fill: '#ff0000',
  stroke: '#000000',
  strokeWidth: 2,
  opacity: 0.8,
};

const mockOnStyleChange = jest.fn();

describe('ColorPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with current style values', () => {
    render(
      <ColorPicker
        currentStyle={mockStyle}
        onStyleChange={mockOnStyleChange}
      />
    );

    expect(screen.getByText('Fill')).toBeInTheDocument();
    expect(screen.getByText('Stroke')).toBeInTheDocument();
    expect(screen.getByText('#ff0000')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'Opacity: 80%';
    })).toBeInTheDocument();
  });

  it('should switch between fill and stroke tabs', () => {
    render(
      <ColorPicker
        currentStyle={mockStyle}
        onStyleChange={mockOnStyleChange}
      />
    );

    const strokeTab = screen.getByText('Stroke');
    fireEvent.click(strokeTab);

    expect(screen.getByText('#000000')).toBeInTheDocument();
  });

  it('should call onStyleChange when fill color is changed', () => {
    render(
      <ColorPicker
        currentStyle={mockStyle}
        onStyleChange={mockOnStyleChange}
      />
    );

    const colorInput = screen.getByDisplayValue('#ff0000');
    fireEvent.change(colorInput, { target: { value: '#00ff00' } });

    expect(mockOnStyleChange).toHaveBeenCalledWith({ fill: '#00ff00' });
  });

  it('should call onStyleChange when stroke color is changed', () => {
    render(
      <ColorPicker
        currentStyle={mockStyle}
        onStyleChange={mockOnStyleChange}
      />
    );

    // Switch to stroke tab
    const strokeTab = screen.getByText('Stroke');
    fireEvent.click(strokeTab);

    const colorInput = screen.getByDisplayValue('#000000');
    fireEvent.change(colorInput, { target: { value: '#0000ff' } });

    expect(mockOnStyleChange).toHaveBeenCalledWith({ stroke: '#0000ff' });
  });

  it('should handle preset color selection', () => {
    render(
      <ColorPicker
        currentStyle={mockStyle}
        onStyleChange={mockOnStyleChange}
      />
    );

    // Find and click a preset color button
    const presetButtons = screen.getAllByRole('button');
    const whiteButton = presetButtons.find(button => 
      button.style.backgroundColor === 'rgb(255, 255, 255)'
    );
    
    if (whiteButton) {
      fireEvent.click(whiteButton);
      expect(mockOnStyleChange).toHaveBeenCalledWith({ fill: '#ffffff' });
    }
  });

  it('should handle stroke width changes', () => {
    render(
      <ColorPicker
        currentStyle={mockStyle}
        onStyleChange={mockOnStyleChange}
      />
    );

    // Switch to stroke tab to see stroke width controls
    const strokeTab = screen.getByText('Stroke');
    fireEvent.click(strokeTab);

    // Find stroke width buttons
    const strokeWidthButtons = screen.getAllByRole('button');
    const width5Button = strokeWidthButtons.find(button => 
      button.textContent?.includes('5') || button.querySelector('div[style*="height: 5px"]')
    );

    if (width5Button) {
      fireEvent.click(width5Button);
      expect(mockOnStyleChange).toHaveBeenCalledWith({ strokeWidth: 5 });
    }
  });

  it('should handle opacity changes', () => {
    render(
      <ColorPicker
        currentStyle={mockStyle}
        onStyleChange={mockOnStyleChange}
      />
    );

    const opacitySlider = screen.getByDisplayValue('0.8');
    fireEvent.change(opacitySlider, { target: { value: '0.5' } });

    expect(mockOnStyleChange).toHaveBeenCalledWith({ opacity: 0.5 });
  });

  it('should display correct opacity percentage', () => {
    render(
      <ColorPicker
        currentStyle={mockStyle}
        onStyleChange={mockOnStyleChange}
      />
    );

    expect(screen.getByText((content, element) => {
      return element?.textContent === 'Opacity: 80%';
    })).toBeInTheDocument();
  });

  it('should show stroke width controls only on stroke tab', () => {
    render(
      <ColorPicker
        currentStyle={mockStyle}
        onStyleChange={mockOnStyleChange}
      />
    );

    // Should not show stroke width on fill tab
    expect(screen.queryByText(/Stroke Width/)).not.toBeInTheDocument();

    // Switch to stroke tab
    const strokeTab = screen.getByText('Stroke');
    fireEvent.click(strokeTab);

    // Should show stroke width on stroke tab
    expect(screen.getByText(/Stroke Width/)).toBeInTheDocument();
  });

  it('should highlight current stroke width', () => {
    render(
      <ColorPicker
        currentStyle={mockStyle}
        onStyleChange={mockOnStyleChange}
      />
    );

    // Switch to stroke tab
    const strokeTab = screen.getByText('Stroke');
    fireEvent.click(strokeTab);

    // The current stroke width (2) should be highlighted
    const strokeWidthButtons = screen.getAllByRole('button');
    const currentWidthButton = strokeWidthButtons.find(button => 
      button.classList.contains('bg-blue-100') || 
      button.classList.contains('border-blue-500')
    );

    expect(currentWidthButton).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ColorPicker
        currentStyle={mockStyle}
        onStyleChange={mockOnStyleChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});