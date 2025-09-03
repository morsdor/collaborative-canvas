import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextShape } from '../TextShape';
import { Shape, ShapeType, TextStyle } from '@/types';

// Mock the TextInput component
jest.mock('@/components/ui/TextInput', () => ({
  TextInput: ({ value, onComplete, onCancel, onValueChange }: any) => (
    <input
      data-testid="text-input"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onComplete();
        if (e.key === 'Escape') onCancel();
      }}
    />
  ),
}));

// Mock BaseShape
jest.mock('../BaseShape', () => ({
  ShapeRenderer: ({ children }: any) => <div data-testid="shape-renderer">{children}</div>,
}));

describe('TextShape', () => {
  const mockTextStyle: TextStyle = {
    fontSize: 16,
    fontWeight: 'normal',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    color: '#000000',
  };

  const mockShape: Shape = {
    id: 'text-1',
    type: 'text' as ShapeType,
    position: { x: 100, y: 100 },
    dimensions: { width: 200, height: 40 },
    style: {
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 1,
      opacity: 1,
    },
    content: 'Test Text',
    textStyle: mockTextStyle,
  };

  const defaultProps = {
    shape: mockShape,
    isSelected: false,
    isHovered: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display Mode', () => {
    it('renders text content correctly', () => {
      render(<TextShape {...defaultProps} />);
      
      expect(screen.getByText('Test Text')).toBeInTheDocument();
    });

    it('applies text styles correctly', () => {
      render(<TextShape {...defaultProps} />);
      
      const textElement = screen.getByText('Test Text');
      const styles = window.getComputedStyle(textElement);
      
      expect(textElement).toHaveStyle({
        fontSize: '16px',
        fontWeight: 'normal',
        textAlign: 'center',
        color: 'rgb(0, 0, 0)',
        fontFamily: 'Arial, sans-serif',
      });
    });

    it('shows default text when content is empty', () => {
      const shapeWithoutContent = { ...mockShape, content: undefined };
      render(<TextShape {...defaultProps} shape={shapeWithoutContent} />);
      
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('applies hover effects', () => {
      render(<TextShape {...defaultProps} isHovered={true} />);
      
      const textElement = screen.getByText('Test Text');
      expect(textElement).toHaveClass('brightness-110');
    });

    it('shows cursor-text cursor and title on hover', () => {
      render(<TextShape {...defaultProps} />);
      
      const textElement = screen.getByText('Test Text');
      expect(textElement).toHaveClass('cursor-text');
      expect(textElement).toHaveAttribute('title', 'Double-click to edit text');
    });
  });

  describe('Edit Mode Activation', () => {
    it('calls onStartEdit when double-clicked', async () => {
      const onStartEdit = jest.fn();
      render(<TextShape {...defaultProps} onStartEdit={onStartEdit} />);
      
      const textElement = screen.getByText('Test Text');
      await userEvent.dblClick(textElement);
      
      expect(onStartEdit).toHaveBeenCalledTimes(1);
    });

    it('stops propagation on double-click', async () => {
      const onStartEdit = jest.fn();
      const parentClickHandler = jest.fn();
      
      render(
        <div onClick={parentClickHandler}>
          <TextShape {...defaultProps} onStartEdit={onStartEdit} />
        </div>
      );
      
      const textElement = screen.getByText('Test Text');
      await userEvent.dblClick(textElement);
      
      expect(onStartEdit).toHaveBeenCalled();
      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    it('renders TextInput when in editing mode', () => {
      render(<TextShape {...defaultProps} isEditing={true} />);
      
      expect(screen.getByTestId('text-input')).toBeInTheDocument();
      expect(screen.queryByText('Test Text')).not.toBeInTheDocument();
    });

    it('passes correct props to TextInput', () => {
      render(<TextShape {...defaultProps} isEditing={true} />);
      
      const textInput = screen.getByTestId('text-input');
      expect(textInput).toHaveValue('Test Text');
    });

    it('calls onFinishEdit when Enter is pressed', async () => {
      const onFinishEdit = jest.fn();
      render(
        <TextShape 
          {...defaultProps} 
          isEditing={true} 
          onFinishEdit={onFinishEdit} 
        />
      );
      
      const textInput = screen.getByTestId('text-input');
      await userEvent.type(textInput, '{enter}');
      
      expect(onFinishEdit).toHaveBeenCalledWith('Test Text');
    });

    it('calls onCancelEdit when Escape is pressed', async () => {
      const onCancelEdit = jest.fn();
      render(
        <TextShape 
          {...defaultProps} 
          isEditing={true} 
          onCancelEdit={onCancelEdit} 
        />
      );
      
      const textInput = screen.getByTestId('text-input');
      await userEvent.type(textInput, '{escape}');
      
      expect(onCancelEdit).toHaveBeenCalledTimes(1);
    });

    it('updates content during editing', async () => {
      const onFinishEdit = jest.fn();
      render(
        <TextShape 
          {...defaultProps} 
          isEditing={true} 
          onFinishEdit={onFinishEdit} 
        />
      );
      
      const textInput = screen.getByTestId('text-input');
      await userEvent.clear(textInput);
      await userEvent.type(textInput, 'New Text');
      await userEvent.type(textInput, '{enter}');
      
      expect(onFinishEdit).toHaveBeenCalledWith('New Text');
    });

    it('resets content on cancel', async () => {
      const onCancelEdit = jest.fn();
      render(
        <TextShape 
          {...defaultProps} 
          isEditing={true} 
          onCancelEdit={onCancelEdit} 
        />
      );
      
      const textInput = screen.getByTestId('text-input');
      await userEvent.clear(textInput);
      await userEvent.type(textInput, 'Modified Text');
      await userEvent.type(textInput, '{escape}');
      
      expect(onCancelEdit).toHaveBeenCalled();
    });
  });

  describe('Text Style Fallbacks', () => {
    it('uses calculated font size when textStyle is not provided', () => {
      const shapeWithoutTextStyle = { ...mockShape, textStyle: undefined };
      render(<TextShape {...defaultProps} shape={shapeWithoutTextStyle} />);
      
      const textElement = screen.getByText('Test Text');
      // Font size should be calculated as Math.max(12, dimensions.height * 0.6)
      // 40 * 0.6 = 24px
      expect(textElement).toHaveStyle({ fontSize: '24px' });
    });

    it('uses default values for missing text style properties', () => {
      const partialTextStyle = { fontSize: 20 };
      const shapeWithPartialStyle = { 
        ...mockShape, 
        textStyle: partialTextStyle as TextStyle 
      };
      
      render(<TextShape {...defaultProps} shape={shapeWithPartialStyle} />);
      
      const textElement = screen.getByText('Test Text');
      expect(textElement).toHaveStyle({
        fontSize: '20px',
        fontWeight: 'normal', // default
        textAlign: 'center', // default
        fontFamily: 'Arial, sans-serif', // default
      });
    });

    it('calculates text color based on fill when textStyle color is not provided', () => {
      const shapeWithDarkFill = {
        ...mockShape,
        style: { ...mockShape.style, fill: '#000000' },
        textStyle: { ...mockTextStyle, color: undefined } as any,
      };
      
      render(<TextShape {...defaultProps} shape={shapeWithDarkFill} />);
      
      const textElement = screen.getByText('Test Text');
      expect(textElement).toHaveStyle({ color: 'rgb(0, 0, 0)' });
    });
  });

  describe('Accessibility', () => {
    it('provides appropriate title for screen readers', () => {
      render(<TextShape {...defaultProps} />);
      
      const textElement = screen.getByText('Test Text');
      expect(textElement).toHaveAttribute('title', 'Double-click to edit text');
    });

    it('maintains focus management during editing', () => {
      render(<TextShape {...defaultProps} isEditing={true} />);
      
      const textInput = screen.getByTestId('text-input');
      expect(textInput).toBeInTheDocument();
      // TextInput component should handle auto-focus internally
    });
  });
});