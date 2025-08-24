import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { DraggableShape } from '../DraggableShape';
import { Shape } from '@/types';

const mockShape: Shape = {
  id: 'test-shape',
  type: 'rectangle',
  position: { x: 100, y: 100 },
  dimensions: { width: 50, height: 50 },
  style: {
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 1,
    opacity: 1,
  },
};

const DndWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndContext>{children}</DndContext>
);

describe('DraggableShape', () => {
  const defaultProps = {
    shape: mockShape,
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    children: <div data-testid="shape-content">Shape Content</div>,
  };

  it('should render shape content', () => {
    render(
      <DndWrapper>
        <DraggableShape {...defaultProps} />
      </DndWrapper>
    );

    expect(screen.getByTestId('shape-content')).toBeInTheDocument();
  });

  it('should apply correct positioning styles', () => {
    const { container } = render(
      <DndWrapper>
        <DraggableShape {...defaultProps} />
      </DndWrapper>
    );

    const shapeElement = container.firstChild as HTMLElement;
    expect(shapeElement).toHaveStyle({
      left: '100px',
      top: '100px',
      width: '50px',
      height: '50px',
    });
  });

  it('should show selection indicator when selected', () => {
    render(
      <DndWrapper>
        <DraggableShape {...defaultProps} isSelected={true} />
      </DndWrapper>
    );

    // Check for selection border
    const selectionBorder = document.querySelector('.border-blue-500');
    expect(selectionBorder).toBeInTheDocument();

    // Check for resize handles
    const resizeHandles = document.querySelectorAll('.bg-blue-500');
    expect(resizeHandles).toHaveLength(8); // 8 resize handles
  });

  it('should show hover indicator when hovered and not selected', () => {
    render(
      <DndWrapper>
        <DraggableShape {...defaultProps} isHovered={true} isSelected={false} />
      </DndWrapper>
    );

    const hoverBorder = document.querySelector('.border-blue-300');
    expect(hoverBorder).toBeInTheDocument();
  });

  it('should not show hover indicator when both hovered and selected', () => {
    render(
      <DndWrapper>
        <DraggableShape {...defaultProps} isHovered={true} isSelected={true} />
      </DndWrapper>
    );

    const hoverBorder = document.querySelector('.border-blue-300');
    expect(hoverBorder).not.toBeInTheDocument();
  });

  it('should show drag preview when dragging', () => {
    render(
      <DndWrapper>
        <DraggableShape {...defaultProps} isDragging={true} />
      </DndWrapper>
    );

    const dragPreview = document.querySelector('.border-dashed');
    expect(dragPreview).toBeInTheDocument();
  });

  it('should apply zoom transformation correctly', () => {
    const zoomedProps = {
      ...defaultProps,
      zoom: 2,
    };

    const { container } = render(
      <DndWrapper>
        <DraggableShape {...zoomedProps} />
      </DndWrapper>
    );

    const shapeElement = container.firstChild as HTMLElement;
    expect(shapeElement).toHaveStyle({
      left: '200px', // 100 * 2
      top: '200px',  // 100 * 2
      width: '100px', // 50 * 2
      height: '100px', // 50 * 2
    });
  });

  it('should apply pan offset correctly', () => {
    const pannedProps = {
      ...defaultProps,
      panOffset: { x: 50, y: 30 },
    };

    const { container } = render(
      <DndWrapper>
        <DraggableShape {...pannedProps} />
      </DndWrapper>
    );

    const shapeElement = container.firstChild as HTMLElement;
    expect(shapeElement).toHaveStyle({
      left: '50px', // (100 - 50) * 1
      top: '70px',  // (100 - 30) * 1
    });
  });

  it('should handle mouse events', () => {
    const mockOnMouseDown = jest.fn();
    const mockOnMouseEnter = jest.fn();
    const mockOnMouseLeave = jest.fn();

    render(
      <DndWrapper>
        <DraggableShape
          {...defaultProps}
          onMouseDown={mockOnMouseDown}
          onMouseEnter={mockOnMouseEnter}
          onMouseLeave={mockOnMouseLeave}
        />
      </DndWrapper>
    );

    const shapeElement = screen.getByTestId('shape-content').parentElement!;
    
    // Test mouse events using fireEvent
    fireEvent.mouseDown(shapeElement);
    expect(mockOnMouseDown).toHaveBeenCalled();

    fireEvent.mouseEnter(shapeElement);
    expect(mockOnMouseEnter).toHaveBeenCalled();

    fireEvent.mouseLeave(shapeElement);
    expect(mockOnMouseLeave).toHaveBeenCalled();
  });

  it('should apply correct border radius for circle shapes', () => {
    const circleShape: Shape = {
      ...mockShape,
      type: 'circle',
    };

    render(
      <DndWrapper>
        <DraggableShape {...defaultProps} shape={circleShape} isSelected={true} />
      </DndWrapper>
    );

    const selectionBorder = document.querySelector('.border-blue-500');
    expect(selectionBorder).toHaveStyle({ borderRadius: '50%' });
  });

  it('should have higher z-index when dragging', () => {
    const { container, rerender } = render(
      <DndWrapper>
        <DraggableShape {...defaultProps} />
      </DndWrapper>
    );

    let shapeElement = container.firstChild as HTMLElement;
    expect(shapeElement).toHaveStyle({ zIndex: '1' });

    rerender(
      <DndWrapper>
        <DraggableShape {...defaultProps} isDragging={true} />
      </DndWrapper>
    );

    shapeElement = container.firstChild as HTMLElement;
    expect(shapeElement).toHaveStyle({ zIndex: '1000' });
  });
});