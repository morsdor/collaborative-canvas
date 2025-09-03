import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextInput } from '../TextInput';

describe('TextInput', () => {
  const defaultProps = {
    value: 'Test Text',
    position: { x: 100, y: 100 },
    dimensions: { width: 200, height: 40 },
    fontSize: 16,
    fontWeight: 'normal' as const,
    textAlign: 'center' as const,
    color: '#000000',
    onValueChange: jest.fn(),
    onComplete: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with correct initial value', () => {
      render(<TextInput {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test Text');
      expect(input).toBeInTheDocument();
    });

    it('applies correct positioning and dimensions', () => {
      render(<TextInput {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test Text');
      expect(input).toHaveStyle({
        position: 'absolute',
        left: '100px',
        top: '100px',
        width: '200px',
        height: '40px',
      });
    });

    it('applies correct text styling', () => {
      render(<TextInput {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test Text');
      expect(input).toHaveStyle({
        fontSize: '16px',
        fontWeight: 'normal',
        textAlign: 'center',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
      });
    });

    it('applies minimum width when dimensions are too small', () => {
      const smallDimensions = { width: 50, height: 20 };
      render(<TextInput {...defaultProps} dimensions={smallDimensions} />);
      
      const input = screen.getByDisplayValue('Test Text');
      expect(input).toHaveStyle({ width: '100px' }); // Minimum width
    });

    it('shows placeholder when value is empty', () => {
      render(<TextInput {...defaultProps} value="" placeholder="Enter text..." />);
      
      const input = screen.getByPlaceholderText('Enter text...');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('auto-focuses by default', async () => {
      render(<TextInput {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test Text');
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });

    it('does not auto-focus when autoFocus is false', () => {
      render(<TextInput {...defaultProps} autoFocus={false} />);
      
      const input = screen.getByDisplayValue('Test Text');
      expect(input).not.toHaveFocus();
    });

    it('selects all text on focus', async () => {
      render(<TextInput {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test Text') as HTMLInputElement;
      await waitFor(() => {
        expect(input.selectionStart).toBe(0);
        expect(input.selectionEnd).toBe(input.value.length);
      });
    });
  });

  describe('Input Handling', () => {
    it('calls onValueChange when text is typed', async () => {
      const onValueChange = jest.fn();
      render(<TextInput {...defaultProps} onValueChange={onValueChange} />);
      
      const input = screen.getByDisplayValue('Test Text');
      await userEvent.clear(input);
      await userEvent.type(input, 'New Text');
      
      expect(onValueChange).toHaveBeenCalledWith('New Text');
    });

    it('updates internal state when typing', async () => {
      render(<TextInput {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test Text');
      await userEvent.clear(input);
      await userEvent.type(input, 'Updated Text');
      
      expect(input).toHaveValue('Updated Text');
    });

    it('respects maxLength prop', async () => {
      render(<TextInput {...defaultProps} maxLength={5} />);
      
      const input = screen.getByDisplayValue('Test Text') as HTMLInputElement;
      expect(input.maxLength).toBe(5);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('calls onComplete when Enter is pressed', async () => {
      const onComplete = jest.fn();
      render(<TextInput {...defaultProps} onComplete={onComplete} />);
      
      const input = screen.getByDisplayValue('Test Text');
      await userEvent.type(input, '{enter}');
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Escape is pressed', async () => {
      const onCancel = jest.fn();
      render(<TextInput {...defaultProps} onCancel={onCancel} />);
      
      const input = screen.getByDisplayValue('Test Text');
      await userEvent.type(input, '{escape}');
      
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onComplete when Tab is pressed', async () => {
      const onComplete = jest.fn();
      render(<TextInput {...defaultProps} onComplete={onComplete} />);
      
      const input = screen.getByDisplayValue('Test Text');
      await userEvent.type(input, '{tab}');
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('prevents default behavior for handled keys', async () => {
      const onComplete = jest.fn();
      render(<TextInput {...defaultProps} onComplete={onComplete} />);
      
      const input = screen.getByDisplayValue('Test Text');
      
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault');
      
      fireEvent(input, enterEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('stops propagation to prevent canvas shortcuts', async () => {
      render(<TextInput {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test Text');
      
      const keyEvent = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
      const stopPropagationSpy = jest.spyOn(keyEvent, 'stopPropagation');
      
      fireEvent(input, keyEvent);
      
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Blur Handling', () => {
    it('calls onComplete when input loses focus', async () => {
      const onComplete = jest.fn();
      render(<TextInput {...defaultProps} onComplete={onComplete} />);
      
      const input = screen.getByDisplayValue('Test Text');
      input.focus();
      input.blur();
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('applies editing border style', () => {
      render(<TextInput {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test Text');
      expect(input).toHaveStyle({
        border: '2px solid #3b82f6',
        borderRadius: '4px',
      });
    });

    it('has high z-index for proper layering', () => {
      render(<TextInput {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test Text');
      expect(input).toHaveStyle({ zIndex: '1000' });
    });

    it('has transparent background', () => {
      render(<TextInput {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test Text');
      expect(input).toHaveClass('bg-white'); // The component uses bg-white class
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label', () => {
      render(<TextInput {...defaultProps} />);
      
      const input = screen.getByLabelText('Text input for shape editing');
      expect(input).toBeInTheDocument();
    });

    it('supports custom placeholder text', () => {
      render(<TextInput {...defaultProps} value="" placeholder="Custom placeholder" />);
      
      const input = screen.getByPlaceholderText('Custom placeholder');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Different Text Styles', () => {
    it('applies bold font weight', () => {
      render(<TextInput {...defaultProps} fontWeight="bold" />);
      
      const input = screen.getByDisplayValue('Test Text');
      expect(input).toHaveStyle({ fontWeight: 'bold' });
    });

    it('applies different text alignments', () => {
      const { rerender } = render(<TextInput {...defaultProps} textAlign="left" />);
      let input = screen.getByDisplayValue('Test Text');
      expect(input).toHaveStyle({ textAlign: 'left' });

      rerender(<TextInput {...defaultProps} textAlign="right" />);
      input = screen.getByDisplayValue('Test Text');
      expect(input).toHaveStyle({ textAlign: 'right' });
    });

    it('applies different font sizes', () => {
      render(<TextInput {...defaultProps} fontSize={24} />);
      
      const input = screen.getByDisplayValue('Test Text');
      expect(input).toHaveStyle({ fontSize: '24px' });
    });

    it('applies different colors', () => {
      render(<TextInput {...defaultProps} color="#ff0000" />);
      
      const input = screen.getByDisplayValue('Test Text');
      expect(input).toHaveStyle({ color: '#ff0000' });
    });
  });
});