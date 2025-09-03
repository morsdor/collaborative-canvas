import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextFormatPanel } from '../TextFormatPanel';
import { TextStyle } from '@/types';

// Mock the shadcn/ui components
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select 
      data-testid="select" 
      onChange={(e) => onValueChange && onValueChange(e.target.value)} 
      value={value}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder || 'Select Value'}</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={`${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <div data-testid="separator" />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

describe('TextFormatPanel', () => {
  const defaultTextStyle: TextStyle = {
    fontSize: 16,
    fontWeight: 'normal',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    color: '#000000',
  };

  const defaultProps = {
    textStyle: defaultTextStyle,
    onTextStyleChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all formatting controls', () => {
      render(<TextFormatPanel {...defaultProps} />);
      
      // Check that selects are rendered
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(2); // Font family and font size
      
      // Bold button
      expect(screen.getByLabelText('Bold')).toBeInTheDocument();
      
      // Alignment buttons
      expect(screen.getByLabelText('Align Left')).toBeInTheDocument();
      expect(screen.getByLabelText('Align Center')).toBeInTheDocument();
      expect(screen.getByLabelText('Align Right')).toBeInTheDocument();
      
      // Color input
      expect(screen.getByLabelText(/Text Color/)).toBeInTheDocument();
    });

    it('applies correct initial values', () => {
      render(<TextFormatPanel {...defaultProps} />);
      
      const selects = screen.getAllByTestId('select');
      const colorInput = screen.getByDisplayValue('#000000');
      
      expect(selects[0]).toHaveValue('Arial, sans-serif'); // Font family select
      expect(selects[1]).toHaveValue('16'); // Font size select
      expect(colorInput).toBeInTheDocument();
    });

    it('shows active state for current text alignment', () => {
      render(<TextFormatPanel {...defaultProps} />);
      
      const centerButton = screen.getByLabelText('Align Center');
      expect(centerButton).toHaveClass('default'); // Active variant
    });

    it('shows active state for bold text', () => {
      const boldTextStyle = { ...defaultTextStyle, fontWeight: 'bold' as const };
      render(<TextFormatPanel {...defaultProps} textStyle={boldTextStyle} />);
      
      const boldButton = screen.getByLabelText('Bold');
      expect(boldButton).toHaveClass('default'); // Active variant
    });
  });

  describe('Font Family Changes', () => {
    it('calls onTextStyleChange when font family is changed', async () => {
      const onTextStyleChange = jest.fn();
      render(<TextFormatPanel {...defaultProps} onTextStyleChange={onTextStyleChange} />);
      
      const selects = screen.getAllByTestId('select');
      const fontFamilySelect = selects[0];
      fireEvent.change(fontFamilySelect, { target: { value: 'Helvetica, sans-serif' } });
      
      expect(onTextStyleChange).toHaveBeenCalledWith({
        fontFamily: 'Helvetica, sans-serif',
      });
    });

    it('displays font families with their respective fonts', () => {
      render(<TextFormatPanel {...defaultProps} />);
      
      // Check that font options are available
      expect(screen.getByText('Arial')).toBeInTheDocument();
      expect(screen.getByText('Helvetica')).toBeInTheDocument();
      expect(screen.getByText('Times New Roman')).toBeInTheDocument();
    });
  });

  describe('Font Size Changes', () => {
    it('calls onTextStyleChange when font size is changed', async () => {
      const onTextStyleChange = jest.fn();
      render(<TextFormatPanel {...defaultProps} onTextStyleChange={onTextStyleChange} />);
      
      const selects = screen.getAllByTestId('select');
      const fontSizeSelect = selects[1];
      fireEvent.change(fontSizeSelect, { target: { value: '24' } });
      
      expect(onTextStyleChange).toHaveBeenCalledWith({
        fontSize: 24,
      });
    });

    it('provides common font size options', () => {
      render(<TextFormatPanel {...defaultProps} />);
      
      // Check that various font sizes are available
      expect(screen.getByText('8px')).toBeInTheDocument();
      expect(screen.getByText('12px')).toBeInTheDocument();
      expect(screen.getByText('16px')).toBeInTheDocument();
      expect(screen.getByText('24px')).toBeInTheDocument();
      expect(screen.getByText('48px')).toBeInTheDocument();
    });
  });

  describe('Font Weight Changes', () => {
    it('toggles font weight when bold button is clicked', async () => {
      const onTextStyleChange = jest.fn();
      render(<TextFormatPanel {...defaultProps} onTextStyleChange={onTextStyleChange} />);
      
      const boldButton = screen.getByLabelText('Bold');
      await userEvent.click(boldButton);
      
      expect(onTextStyleChange).toHaveBeenCalledWith({
        fontWeight: 'bold',
      });
    });

    it('toggles from bold to normal when already bold', async () => {
      const boldTextStyle = { ...defaultTextStyle, fontWeight: 'bold' as const };
      const onTextStyleChange = jest.fn();
      render(
        <TextFormatPanel 
          {...defaultProps} 
          textStyle={boldTextStyle}
          onTextStyleChange={onTextStyleChange} 
        />
      );
      
      const boldButton = screen.getByLabelText('Bold');
      await userEvent.click(boldButton);
      
      expect(onTextStyleChange).toHaveBeenCalledWith({
        fontWeight: 'normal',
      });
    });
  });

  describe('Text Alignment Changes', () => {
    it('changes text alignment to left', async () => {
      const onTextStyleChange = jest.fn();
      render(<TextFormatPanel {...defaultProps} onTextStyleChange={onTextStyleChange} />);
      
      const leftButton = screen.getByLabelText('Align Left');
      await userEvent.click(leftButton);
      
      expect(onTextStyleChange).toHaveBeenCalledWith({
        textAlign: 'left',
      });
    });

    it('changes text alignment to right', async () => {
      const onTextStyleChange = jest.fn();
      render(<TextFormatPanel {...defaultProps} onTextStyleChange={onTextStyleChange} />);
      
      const rightButton = screen.getByLabelText('Align Right');
      await userEvent.click(rightButton);
      
      expect(onTextStyleChange).toHaveBeenCalledWith({
        textAlign: 'right',
      });
    });

    it('shows correct active state for different alignments', () => {
      const leftAlignedStyle = { ...defaultTextStyle, textAlign: 'left' as const };
      render(<TextFormatPanel {...defaultProps} textStyle={leftAlignedStyle} />);
      
      const leftButton = screen.getByLabelText('Align Left');
      const centerButton = screen.getByLabelText('Align Center');
      
      expect(leftButton).toHaveClass('default'); // Active
      expect(centerButton).toHaveClass('ghost'); // Inactive
    });
  });

  describe('Color Changes', () => {
    it('calls onTextStyleChange when color is changed', async () => {
      const onTextStyleChange = jest.fn();
      render(<TextFormatPanel {...defaultProps} onTextStyleChange={onTextStyleChange} />);
      
      const colorInput = screen.getByDisplayValue('#000000');
      fireEvent.change(colorInput, { target: { value: '#ff0000' } });
      
      expect(onTextStyleChange).toHaveBeenCalledWith({
        color: '#ff0000',
      });
    });

    it('displays current color value', () => {
      const redTextStyle = { ...defaultTextStyle, color: '#ff0000' };
      render(<TextFormatPanel {...defaultProps} textStyle={redTextStyle} />);
      
      const colorInput = screen.getByDisplayValue('#ff0000');
      expect(colorInput).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper aria labels for all controls', () => {
      render(<TextFormatPanel {...defaultProps} />);
      
      expect(screen.getByLabelText('Bold')).toBeInTheDocument();
      expect(screen.getByLabelText('Align Left')).toBeInTheDocument();
      expect(screen.getByLabelText('Align Center')).toBeInTheDocument();
      expect(screen.getByLabelText('Align Right')).toBeInTheDocument();
      expect(screen.getByLabelText(/Text Color/)).toBeInTheDocument();
    });

    it('shows tooltips with keyboard shortcuts', () => {
      render(<TextFormatPanel {...defaultProps} />);
      
      // The tooltip content should be rendered (mocked)
      expect(screen.getByText('Bold (Ctrl/Cmd + B)')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<TextFormatPanel {...defaultProps} className="custom-class" />);
      
      const panel = container.firstChild;
      expect(panel).toHaveClass('custom-class');
    });

    it('includes separators between control groups', () => {
      render(<TextFormatPanel {...defaultProps} />);
      
      const separators = screen.getAllByTestId('separator');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined text style properties gracefully', () => {
      const incompleteTextStyle = {
        fontSize: 16,
      } as TextStyle;
      
      expect(() => {
        render(<TextFormatPanel {...defaultProps} textStyle={incompleteTextStyle} />);
      }).not.toThrow();
    });

    it('handles extreme font sizes', () => {
      const extremeTextStyle = { ...defaultTextStyle, fontSize: 72 };
      const onTextStyleChange = jest.fn();
      
      render(
        <TextFormatPanel 
          {...defaultProps} 
          textStyle={extremeTextStyle}
          onTextStyleChange={onTextStyleChange} 
        />
      );
      
      const selects = screen.getAllByTestId('select');
      const fontSizeSelect = selects[1];
      expect(fontSizeSelect).toHaveValue('72');
    });
  });
});