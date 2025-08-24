'use client';

import React, { useState, useCallback } from 'react';
import { ShapeStyle } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Palette, Brush } from 'lucide-react';

interface ColorPickerProps {
  currentStyle: ShapeStyle;
  onStyleChange: (style: Partial<ShapeStyle>) => void;
  className?: string;
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
  '#ffc0cb', '#a52a2a', '#808080', '#008000', '#000080',
  '#ff6347', '#4682b4', '#32cd32', '#ffd700', '#dc143c',
];

const STROKE_WIDTHS = [1, 2, 3, 4, 5, 8, 10, 12, 16, 20];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  currentStyle,
  onStyleChange,
  className,
}) => {
  const [customColor, setCustomColor] = useState(currentStyle.fill);

  const handleFillColorChange = useCallback((color: string) => {
    onStyleChange({ fill: color });
  }, [onStyleChange]);

  const handleStrokeColorChange = useCallback((color: string) => {
    onStyleChange({ stroke: color });
  }, [onStyleChange]);

  const handleStrokeWidthChange = useCallback((width: number) => {
    onStyleChange({ strokeWidth: width });
  }, [onStyleChange]);

  const handleOpacityChange = useCallback((value: number[]) => {
    onStyleChange({ opacity: value[0] / 100 });
  }, [onStyleChange]);

  const handleCustomColorChange = useCallback((color: string) => {
    setCustomColor(color);
  }, []);

  const applyCustomColor = useCallback((type: 'fill' | 'stroke') => {
    if (type === 'fill') {
      handleFillColorChange(customColor);
    } else {
      handleStrokeColorChange(customColor);
    }
  }, [customColor, handleFillColorChange, handleStrokeColorChange]);

  return (
    <div className={cn(
      "bg-background border rounded-lg shadow-lg p-4 min-w-80",
      className
    )}>
      <Tabs defaultValue="fill" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fill" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Fill
          </TabsTrigger>
          <TabsTrigger value="stroke" className="flex items-center gap-2">
            <Brush className="h-4 w-4" />
            Stroke
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fill" className="space-y-4">
          {/* Current Fill Color */}
          <div className="space-y-2">
            <Label>Current Fill Color</Label>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 border-2 border-border rounded-md"
                style={{ backgroundColor: currentStyle.fill }}
                aria-label={`Current fill color: ${currentStyle.fill}`}
              />
              <div className="flex-1">
                <Input
                  type="text"
                  value={currentStyle.fill}
                  onChange={(e) => handleFillColorChange(e.target.value)}
                  placeholder="#000000"
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preset Fill Colors */}
          <div className="space-y-2">
            <Label>Preset Colors</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <Button
                  key={color}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFillColorChange(color)}
                  className={cn(
                    "w-10 h-10 p-0 border-2",
                    currentStyle.fill === color && "ring-2 ring-primary ring-offset-2"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Set fill color to ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div className="space-y-2">
            <Label>Custom Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Button
                onClick={() => applyCustomColor('fill')}
                size="sm"
                variant="outline"
              >
                Apply to Fill
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stroke" className="space-y-4">
          {/* Current Stroke Color */}
          <div className="space-y-2">
            <Label>Current Stroke Color</Label>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 border-2 border-border rounded-md"
                style={{ backgroundColor: currentStyle.stroke }}
                aria-label={`Current stroke color: ${currentStyle.stroke}`}
              />
              <div className="flex-1">
                <Input
                  type="text"
                  value={currentStyle.stroke}
                  onChange={(e) => handleStrokeColorChange(e.target.value)}
                  placeholder="#000000"
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preset Stroke Colors */}
          <div className="space-y-2">
            <Label>Preset Colors</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <Button
                  key={color}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStrokeColorChange(color)}
                  className={cn(
                    "w-10 h-10 p-0 border-2",
                    currentStyle.stroke === color && "ring-2 ring-primary ring-offset-2"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Set stroke color to ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div className="space-y-2">
            <Label>Custom Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Button
                onClick={() => applyCustomColor('stroke')}
                size="sm"
                variant="outline"
              >
                Apply to Stroke
              </Button>
            </div>
          </div>

          {/* Stroke Width */}
          <div className="space-y-2">
            <Label>Stroke Width: {currentStyle.strokeWidth}px</Label>
            <div className="grid grid-cols-5 gap-2">
              {STROKE_WIDTHS.map((width) => (
                <Button
                  key={width}
                  variant={currentStyle.strokeWidth === width ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStrokeWidthChange(width)}
                  className="h-10 flex items-center justify-center"
                  aria-label={`Set stroke width to ${width}px`}
                >
                  <div
                    className="bg-current rounded"
                    style={{
                      width: '20px',
                      height: `${Math.min(width, 6)}px`,
                    }}
                  />
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Opacity (always visible) */}
      <div className="mt-4 space-y-2">
        <Label>Opacity: {Math.round(currentStyle.opacity * 100)}%</Label>
        <Slider
          value={[Math.round(currentStyle.opacity * 100)]}
          onValueChange={handleOpacityChange}
          max={100}
          min={0}
          step={5}
          className="w-full"
          aria-label="Opacity slider"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};