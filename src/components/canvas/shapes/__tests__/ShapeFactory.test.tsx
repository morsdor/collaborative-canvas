import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShapeFactory } from '../../ShapeFactory';
import { Shape } from '@/types';

const createMockShape = (type: Shape['type'], id: string = 'test-shape'): Shape => ({
  id,
  type,
  position: { x: 100, y: 100 },
  dimensions: { width: 200, height: 150 },
  style: {
    fill: '#3b82f6',
    stroke: '#1e40af',
    strokeWidth: 2,
    opacity: 1,
  },
  content: type === 'text' ? 'Test Text' : undefined,
});

describe('ShapeFactory', () => {
  const defaultProps = {
    zoom: 1,
    panOffset: { x: 0, y: 0 },
  };

  it('should render RectangleShape for rectangle type', () => {
    const shape = createMockShape('rectangle');
    render(<ShapeFactory {...defaultProps} shape={shape} />);
    
    const shapeElement = document.querySelector('[style*="background-color"]');
    expect(shapeElement).toBeInTheDocument();
    expect(shapeElement).not.toHaveClass('rounded-full');
  });

  it('should render CircleShape for circle type', () => {
    const shape = createMockShape('circle');
    render(<ShapeFactory {...defaultProps} shape={shape} />);
    
    const shapeElement = document.querySelector('.rounded-full');
    expect(shapeElement).toBeInTheDocument();
  });

  it('should render TextShape for text type', () => {
    const shape = createMockShape('text');
    render(<ShapeFactory {...defaultProps} shape={shape} />);
    
    expect(screen.getByText('Test Text')).toBeInTheDocument();
  });

  it('should render LineShape for line type', () => {
    const shape = createMockShape('line');
    render(<ShapeFactory {...defaultProps} shape={shape} />);
    
    // Line shape should have a rotated div
    const lineElement = document.querySelector('[style*="rotate"]');
    expect(lineElement).toBeInTheDocument();
  });

  it('should return null for unknown shape type', () => {
    const shape = { ...createMockShape('rectangle'), type: 'unknown' as any };
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const { container } = render(<ShapeFactory {...defaultProps} shape={shape} />);
    
    expect(container.firstChild).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Unknown shape type: unknown');
    
    consoleSpy.mockRestore();
  });

  it('should pass selection state correctly', () => {
    const shape = createMockShape('rectangle');
    render(<ShapeFactory {...defaultProps} shape={shape} isSelected={true} />);
    
    // Should have selection border
    const selectionBorder = document.querySelector('.border-blue-500');
    expect(selectionBorder).toBeInTheDocument();
  });

  it('should pass hover state correctly', () => {
    const shape = createMockShape('rectangle');
    render(<ShapeFactory {...defaultProps} shape={shape} isHovered={true} />);
    
    const hoveredElement = document.querySelector('.brightness-110');
    expect(hoveredElement).toBeInTheDocument();
  });

  it('should call onShapeMouseDown with shape id', () => {
    const onShapeMouseDown = jest.fn();
    const shape = createMockShape('rectangle', 'test-id');
    
    render(
      <ShapeFactory 
        {...defaultProps} 
        shape={shape} 
        onShapeMouseDown={onShapeMouseDown} 
      />
    );
    
    const shapeContainer = document.querySelector('.absolute.pointer-events-auto');
    fireEvent.mouseDown(shapeContainer!);
    
    expect(onShapeMouseDown).toHaveBeenCalledWith('test-id', expect.any(Object));
  });

  it('should call onShapeMouseEnter with shape id', () => {
    const onShapeMouseEnter = jest.fn();
    const shape = createMockShape('rectangle', 'test-id');
    
    render(
      <ShapeFactory 
        {...defaultProps} 
        shape={shape} 
        onShapeMouseEnter={onShapeMouseEnter} 
      />
    );
    
    const shapeContainer = document.querySelector('.absolute.pointer-events-auto');
    fireEvent.mouseEnter(shapeContainer!);
    
    expect(onShapeMouseEnter).toHaveBeenCalledWith('test-id', expect.any(Object));
  });

  it('should call onShapeMouseLeave with shape id', () => {
    const onShapeMouseLeave = jest.fn();
    const shape = createMockShape('rectangle', 'test-id');
    
    render(
      <ShapeFactory 
        {...defaultProps} 
        shape={shape} 
        onShapeMouseLeave={onShapeMouseLeave} 
      />
    );
    
    const shapeContainer = document.querySelector('.absolute.pointer-events-auto');
    fireEvent.mouseLeave(shapeContainer!);
    
    expect(onShapeMouseLeave).toHaveBeenCalledWith('test-id', expect.any(Object));
  });

  it('should not call mouse handlers when not provided', () => {
    const shape = createMockShape('rectangle');
    
    // Should not throw when handlers are not provided
    expect(() => {
      render(<ShapeFactory {...defaultProps} shape={shape} />);
      
      const shapeContainer = document.querySelector('.absolute.pointer-events-auto');
      fireEvent.mouseDown(shapeContainer!);
      fireEvent.mouseEnter(shapeContainer!);
      fireEvent.mouseLeave(shapeContainer!);
    }).not.toThrow();
  });
});