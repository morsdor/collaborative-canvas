import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RectangleShape } from '../RectangleShape';
import { Shape } from '@/types';

const mockShape: Shape = {
  id: 'rect1',
  type: 'rectangle',
  position: { x: 100, y: 100 },
  dimensions: { width: 200, height: 150 },
  style: {
    fill: '#3b82f6',
    stroke: '#1e40af',
    strokeWidth: 2,
    opacity: 1,
  },
};

describe('RectangleShape', () => {
  const defaultProps = {
    shape: mockShape,
    zoom: 1,
    panOffset: { x: 0, y: 0 },
  };

  it('should render rectangle with correct styles', () => {
    render(<RectangleShape {...defaultProps} />);
    
    const shapeElement = document.querySelector('[style*="background-color"]');
    expect(shapeElement).toBeInTheDocument();
    expect(shapeElement).toHaveStyle({
      backgroundColor: '#3b82f6',
      border: '2px solid #1e40af',
      opacity: '1',
    });
  });

  it('should show selection indicators when selected', () => {
    render(<RectangleShape {...defaultProps} isSelected={true} />);
    
    // Should have resize handles
    const resizeHandles = document.querySelectorAll('.cursor-nw-resize, .cursor-n-resize, .cursor-ne-resize, .cursor-e-resize, .cursor-se-resize, .cursor-s-resize, .cursor-sw-resize, .cursor-w-resize');
    expect(resizeHandles).toHaveLength(8);
  });

  it('should show hover effects when hovered', () => {
    render(<RectangleShape {...defaultProps} isHovered={true} />);
    
    const shapeElement = document.querySelector('.brightness-110');
    expect(shapeElement).toBeInTheDocument();
  });

  it('should call onMouseDown when clicked', () => {
    const onMouseDown = jest.fn();
    render(<RectangleShape {...defaultProps} onMouseDown={onMouseDown} />);
    
    const shapeContainer = document.querySelector('.absolute.pointer-events-auto');
    fireEvent.mouseDown(shapeContainer!);
    
    expect(onMouseDown).toHaveBeenCalled();
  });

  it('should call onMouseEnter when mouse enters', () => {
    const onMouseEnter = jest.fn();
    render(<RectangleShape {...defaultProps} onMouseEnter={onMouseEnter} />);
    
    const shapeContainer = document.querySelector('.absolute.pointer-events-auto');
    fireEvent.mouseEnter(shapeContainer!);
    
    expect(onMouseEnter).toHaveBeenCalled();
  });

  it('should call onMouseLeave when mouse leaves', () => {
    const onMouseLeave = jest.fn();
    render(<RectangleShape {...defaultProps} onMouseLeave={onMouseLeave} />);
    
    const shapeContainer = document.querySelector('.absolute.pointer-events-auto');
    fireEvent.mouseLeave(shapeContainer!);
    
    expect(onMouseLeave).toHaveBeenCalled();
  });

  it('should position correctly with zoom and pan offset', () => {
    const props = {
      ...defaultProps,
      zoom: 2,
      panOffset: { x: 50, y: 25 },
    };
    
    render(<RectangleShape {...props} />);
    
    const shapeContainer = document.querySelector('.absolute.pointer-events-auto');
    expect(shapeContainer).toHaveStyle({
      left: '100px', // (100 - 50) * 2
      top: '150px',  // (100 - 25) * 2
      width: '400px', // 200 * 2
      height: '300px', // 150 * 2
    });
  });

  it('should handle transparent fill', () => {
    const transparentShape: Shape = {
      ...mockShape,
      style: {
        ...mockShape.style,
        fill: 'transparent',
        strokeWidth: 0,
      },
    };

    render(<RectangleShape {...defaultProps} shape={transparentShape} />);
    
    const shapeElement = document.querySelector('[style*="background-color"]');
    expect(shapeElement).toHaveStyle('background-color: rgba(0, 0, 0, 0)');
    expect(shapeElement).toHaveStyle('border: none');
  });
});