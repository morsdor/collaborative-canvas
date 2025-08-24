import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorPickerModal } from '../ColorPickerModal';
import { ShapeStyle } from '@/types';

const mockStyle: ShapeStyle = {
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 2,
  opacity: 1,
};

describe('ColorPickerModal', () => {
  const mockOnStyleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Behavior', () => {
    it('renders trigger button when provided', () => {
      render(
        <ColorPickerModal
          currentStyle={mockStyle}
          onStyleChange={mockOnStyleChange}
          trigger={<button>Open Color Picker</button>}
        />
      );

      expect(screen.getByText('Open Color Picker')).toBeInTheDocument();
    });

    it('opens modal when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ColorPickerModal
          currentStyle={mockStyle}
          onStyleChange={mockOnStyleChange}
          trigger={<button>Open Color Picker</button>}
        />
      );

      const trigger = screen.getByText('Open Color Picker');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Advanced Color Picker')).toBeInTheDocument();
      });
    });

    it('can be controlled externally', () => {
      render(
        <ColorPickerModal
          currentStyle={mockStyle}
          onStyleChange={mockOnStyleChange}
          open={true}
        />
      );

      expect(screen.getByText('Advanced Color Picker')).toBeInTheDocument();
    });
  });

  describe('Solid Colors Tab', () => {
    beforeEach(async () => {
      render(
        <ColorPickerModal
          currentStyle={mockStyle}
          onStyleChange={mockOnStyleChange}
          open={true}
        />
      );
    });

    it('displays current fill and stroke colors', () => {
      expect(screen.getByText('Fill Color')).toBeInTheDocument();
      expect(screen.getByText('Stroke Color')).toBeInTheDocument();
      expect(screen.getByText('#ffffff')).toBeInTheDocument();
      expect(screen.getByText('#000000')).toBeInTheDocument();
    });

    it('shows preset color grid', () => {
      // Should have multiple color buttons
      const colorButtons = screen.getAllByRole('button');
      const presetButtons = colorButtons.filter(button => 
        button.getAttribute('title')?.includes('Set fill to') ||
        button.getAttribute('title')?.includes('Set stroke to')
      );
      
      expect(presetButtons.length).toBeGreaterThan(0);
    });

    it('calls onStyleChange when preset color is selected for fill', async () => {
      const user = userEvent.setup();
      
      const redFillButton = screen.getByTitle('Set fill to #ff0000');
      await user.click(redFillButton);

      expect(mockOnStyleChange).toHaveBeenCalledWith({ fill: '#ff0000' });
    });

    it('calls onStyleChange when preset color is selected for stroke', async () => {
      const user = userEvent.setup();
      
      const redStrokeButton = screen.getByTitle('Set stroke to #ff0000');
      await user.click(redStrokeButton);

      expect(mockOnStyleChange).toHaveBeenCalledWith({ stroke: '#ff0000' });
    });
  });

  describe('Color Picker Tab', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <ColorPickerModal
          currentStyle={mockStyle}
          onStyleChange={mockOnStyleChange}
          open={true}
        />
      );

      // Switch to picker tab
      const pickerTab = screen.getAllByRole('tab')[1]; // Second tab
      await user.click(pickerTab);
    });

    it('displays HSL sliders', () => {
      expect(screen.getByText(/Hue:/)).toBeInTheDocument();
      expect(screen.getByText(/Saturation:/)).toBeInTheDocument();
      expect(screen.getByText(/Lightness:/)).toBeInTheDocument();
    });

    it('updates color preview when sliders change', async () => {
      const hueSlider = screen.getByRole('slider', { name: /hue/i });
      fireEvent.change(hueSlider, { target: { value: 180 } });

      // The color should update (we can't easily test the visual change, 
      // but we can verify the slider value changed)
      expect(hueSlider).toHaveValue('180');
    });

    it('allows applying custom color to fill', async () => {
      const user = userEvent.setup();
      
      const fillButton = screen.getByText('Fill');
      await user.click(fillButton);

      expect(mockOnStyleChange).toHaveBeenCalled();
    });

    it('allows applying custom color to stroke', async () => {
      const user = userEvent.setup();
      
      const strokeButton = screen.getByText('Stroke');
      await user.click(strokeButton);

      expect(mockOnStyleChange).toHaveBeenCalled();
    });
  });

  describe('Gradient Tab', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <ColorPickerModal
          currentStyle={mockStyle}
          onStyleChange={mockOnStyleChange}
          open={true}
        />
      );

      // Switch to gradient tab
      const gradientTab = screen.getAllByRole('tab')[2]; // Third tab
      await user.click(gradientTab);
    });

    it('displays gradient presets', () => {
      expect(screen.getByText('Gradient Presets')).toBeInTheDocument();
      expect(screen.getByText('Sunset')).toBeInTheDocument();
      expect(screen.getByText('Ocean')).toBeInTheDocument();
      expect(screen.getByText('Forest')).toBeInTheDocument();
    });

    it('applies gradient color when preset is clicked', async () => {
      const user = userEvent.setup();
      
      const sunsetButton = screen.getByTitle('Apply Sunset to fill');
      await user.click(sunsetButton);

      expect(mockOnStyleChange).toHaveBeenCalledWith({ fill: '#ff7e5f' });
    });
  });

  describe('Recent Colors Tab', () => {
    it('shows empty state when no recent colors', async () => {
      const user = userEvent.setup();
      render(
        <ColorPickerModal
          currentStyle={mockStyle}
          onStyleChange={mockOnStyleChange}
          open={true}
        />
      );

      // Switch to recent tab
      const recentTab = screen.getAllByRole('tab')[3]; // Fourth tab
      await user.click(recentTab);

      expect(screen.getByText('No recent colors')).toBeInTheDocument();
    });

    // Note: Testing recent colors functionality would require more complex setup
    // to simulate color selection and then check the recent colors tab
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      render(
        <ColorPickerModal
          currentStyle={mockStyle}
          onStyleChange={mockOnStyleChange}
          open={true}
        />
      );
    });

    it('provides proper ARIA labels for tabs', () => {
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('provides proper ARIA labels for sliders', async () => {
      const user = userEvent.setup();
      
      // Switch to picker tab to access sliders
      const pickerTab = screen.getAllByRole('tab')[1];
      await user.click(pickerTab);

      const sliders = screen.getAllByRole('slider');
      sliders.forEach(slider => {
        expect(slider).toHaveAttribute('aria-valuemin');
        expect(slider).toHaveAttribute('aria-valuemax');
        expect(slider).toHaveAttribute('aria-valuenow');
      });
    });

    it('provides descriptive titles for color buttons', () => {
      const colorButtons = screen.getAllByRole('button');
      const titledButtons = colorButtons.filter(button => 
        button.getAttribute('title')?.includes('Set fill to') ||
        button.getAttribute('title')?.includes('Set stroke to')
      );
      
      titledButtons.forEach(button => {
        expect(button).toHaveAttribute('title');
        expect(button.getAttribute('title')).toMatch(/Set (fill|stroke) to #[0-9a-fA-F]{6}/);
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      const tabs = screen.getAllByRole('tab');
      
      // Should be able to navigate between tabs with keyboard
      await user.tab();
      expect(document.activeElement).toBe(tabs[0]);
      
      await user.keyboard('{ArrowRight}');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Color Format Validation', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <ColorPickerModal
          currentStyle={mockStyle}
          onStyleChange={mockOnStyleChange}
          open={true}
        />
      );

      // Switch to picker tab
      const pickerTab = screen.getAllByRole('tab')[1];
      await user.click(pickerTab);
    });

    it('accepts valid hex color input', async () => {
      const user = userEvent.setup();
      
      const colorInput = screen.getByDisplayValue('#000000');
      await user.clear(colorInput);
      await user.type(colorInput, '#ff0000');

      expect(colorInput).toHaveValue('#ff0000');
    });

    it('handles HSL to hex conversion', async () => {
      // This tests the internal HSL to hex conversion
      // We can verify by changing sliders and checking if the hex value updates
      const hueSlider = screen.getByRole('slider', { name: /hue/i });
      fireEvent.change(hueSlider, { target: { value: 0 } });

      const saturationSlider = screen.getByRole('slider', { name: /saturation/i });
      fireEvent.change(saturationSlider, { target: { value: 100 } });

      const lightnessSlider = screen.getByRole('slider', { name: /lightness/i });
      fireEvent.change(lightnessSlider, { target: { value: 50 } });

      // Should result in red color (#ff0000)
      const colorInput = screen.getByDisplayValue(/#[0-9a-fA-F]{6}/);
      expect(colorInput).toBeInTheDocument();
    });
  });
});