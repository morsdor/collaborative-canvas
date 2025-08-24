import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StylePanel } from '../StylePanel';
import { Shape, ShapeType } from '@/types';

const createMockShape = (id: string, overrides?: Partial<Shape>): Shape => ({
  id,
  type: 'rectangle' as ShapeType,
  position: { x: 0, y: 0 },
  dimensions: { width: 100, height: 100 },
  style: {
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 2,
    opacity: 1,
  },
  ...overrides,
});

const mockOnStyleChange = jest.fn();

describe('StylePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show message when no shapes are selected', () => {
    render(
      <StylePanel
        selectedShapes={[]}
        onStyleChange={mockOnStyleChange}
      />
    );

    expect(screen.getByText('Select shapes to edit their style')).toBeInTheDocument();
  });

  it('should show style controls when shapes are selected', () => {
    const shapes = [createMockShape('1')];
    
    render(
      <StylePanel
        selectedShapes={shapes}
        onStyleChange={mockOnStyleChange}
      />
    );

    expect(screen.getByText('Style Properties')).toBeInTheDocument();
    expect(screen.getByText('1 shape selected')).toBeInTheDocument();
  });

  it('should show correct count for multiple selected shapes', () => {
    const shapes = [
      createMockShape('1'),
      createMockShape('2'),
    ];
    
    render(
      <StylePanel
        selectedShapes={shapes}
        onStyleChange={mockOnStyleChange}
      />
    );

    expect(screen.getByText('2 shapes selected')).toBeInTheDocument();
  });

  it('should call onStyleChange when style is modified', () => {
    const shapes = [createMockShape('1')];
    
    render(
      <StylePanel
        selectedShapes={shapes}
        onStyleChange={mockOnStyleChange}
      />
    );

    // Find and click the "No Fill" button
    const noFillButton = screen.getByText('No Fill');
    fireEvent.click(noFillButton);

    expect(mockOnStyleChange).toHaveBeenCalledWith(['1'], { fill: 'transparent' });
  });

  it('should handle "No Stroke" quick action', () => {
    const shapes = [createMockShape('1')];
    
    render(
      <StylePanel
        selectedShapes={shapes}
        onStyleChange={mockOnStyleChange}
      />
    );

    const noStrokeButton = screen.getByText('No Stroke');
    fireEvent.click(noStrokeButton);

    expect(mockOnStyleChange).toHaveBeenCalledWith(['1'], { stroke: 'transparent' });
  });

  it('should handle "Reset Style" quick action', () => {
    const shapes = [createMockShape('1')];
    
    render(
      <StylePanel
        selectedShapes={shapes}
        onStyleChange={mockOnStyleChange}
      />
    );

    const resetButton = screen.getByText('Reset Style');
    fireEvent.click(resetButton);

    expect(mockOnStyleChange).toHaveBeenCalledWith(['1'], {
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 1,
      opacity: 1,
    });
  });

  it('should handle "50% Opacity" quick action', () => {
    const shapes = [createMockShape('1')];
    
    render(
      <StylePanel
        selectedShapes={shapes}
        onStyleChange={mockOnStyleChange}
      />
    );

    const opacityButton = screen.getByText('50% Opacity');
    fireEvent.click(opacityButton);

    expect(mockOnStyleChange).toHaveBeenCalledWith(['1'], { opacity: 0.5 });
  });

  it('should pass correct shape IDs for multiple shapes', () => {
    const shapes = [
      createMockShape('shape1'),
      createMockShape('shape2'),
      createMockShape('shape3'),
    ];
    
    render(
      <StylePanel
        selectedShapes={shapes}
        onStyleChange={mockOnStyleChange}
      />
    );

    const noFillButton = screen.getByText('No Fill');
    fireEvent.click(noFillButton);

    expect(mockOnStyleChange).toHaveBeenCalledWith(
      ['shape1', 'shape2', 'shape3'], 
      { fill: 'transparent' }
    );
  });

  it('should use common style for single shape', () => {
    const shape = createMockShape('1', {
      style: {
        fill: '#00ff00',
        stroke: '#ff0000',
        strokeWidth: 5,
        opacity: 0.7,
      },
    });
    
    render(
      <StylePanel
        selectedShapes={[shape]}
        onStyleChange={mockOnStyleChange}
      />
    );

    // The ColorPicker should receive the shape's actual style
    expect(screen.getByText('#00ff00')).toBeInTheDocument();
  });

  it('should handle different styles for multiple shapes', () => {
    const shapes = [
      createMockShape('1', {
        style: {
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 1,
          opacity: 1,
        },
      }),
      createMockShape('2', {
        style: {
          fill: '#00ff00', // Different fill
          stroke: '#000000',
          strokeWidth: 2, // Different stroke width
          opacity: 1,
        },
      }),
    ];
    
    render(
      <StylePanel
        selectedShapes={shapes}
        onStyleChange={mockOnStyleChange}
      />
    );

    // Should show default values when styles differ
    expect(screen.getByText('#000000')).toBeInTheDocument(); // Default fill when different
  });

  it('should apply custom className', () => {
    const shapes = [createMockShape('1')];
    const { container } = render(
      <StylePanel
        selectedShapes={shapes}
        onStyleChange={mockOnStyleChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render ColorPicker component', () => {
    const shapes = [createMockShape('1')];
    
    render(
      <StylePanel
        selectedShapes={shapes}
        onStyleChange={mockOnStyleChange}
      />
    );

    // ColorPicker should be rendered (check for its characteristic elements)
    expect(screen.getByText('Fill')).toBeInTheDocument();
    expect(screen.getByText('Stroke')).toBeInTheDocument();
  });
});