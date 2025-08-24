'use client';

import React, { useState, useCallback } from 'react';
import { ShapeStyle } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Palette, Pipette, Gradient, History } from 'lucide-react';

interface ColorPickerModalProps {
  currentStyle: ShapeStyle;
  onStyleChange: (style: Partial<ShapeStyle>) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
  '#ffc0cb', '#a52a2a', '#808080', '#008000', '#000080',
  '#ff6347', '#4682b4', '#32cd32', '#ffd700', '#dc143c',
  '#8b4513', '#2f4f4f', '#9acd32', '#ff1493', '#00ced1',
  '#ff69b4', '#cd5c5c', '#4169e1', '#daa520', '#b22222',
];

const GRADIENT_PRESETS = [
  { name: 'Sunset', colors: ['#ff7e5f', '#feb47b'] },
  { name: 'Ocean', colors: ['#667eea', '#764ba2'] },
  { name: 'Forest', colors: ['#134e5e', '#71b280'] },
  { name: 'Fire', colors: ['#f12711', '#f5af19'] },
  { name: 'Purple', colors: ['#667eea', '#764ba2'] },
  { name: 'Pink', colors: ['#ff9a9e', '#fecfef'] },
];

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  currentStyle,
  onStyleChange,
  trigger,
  open,
  onOpenChange,
}) => {
  const [selectedTab, setSelectedTab] = useState('solid');
  const [customColor, setCustomColor] = useState('#000000');
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [recentColors, setRecentColors] = useState<string[]>([]);

  // Convert HSL to hex
  const hslToHex = useCallback((h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }, []);

  // Update custom color when HSL changes
  React.useEffect(() => {
    const newColor = hslToHex(hue, saturation, lightness);
    setCustomColor(newColor);
  }, [hue, saturation, lightness, hslToHex]);

  const addToRecentColors = useCallback((color: string) => {
    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== color);
      return [color, ...filtered].slice(0, 10);
    });
  }, []);

  const handleColorSelect = useCallback((color: string, type: 'fill' | 'stroke') => {
    addToRecentColors(color);
    if (type === 'fill') {
      onStyleChange({ fill: color });
    } else {
      onStyleChange({ stroke: color });
    }
  }, [onStyleChange, addToRecentColors]);

  const handleGradientSelect = useCallback((gradient: { colors: string[] }, type: 'fill' | 'stroke') => {
    // For now, just use the first color of the gradient
    // In a real implementation, you might want to support actual gradients
    const color = gradient.colors[0];
    handleColorSelect(color, type);
  }, [handleColorSelect]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Advanced Color Picker
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="solid" className="text-xs">
              <Palette className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="picker" className="text-xs">
              <Pipette className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="gradient" className="text-xs">
              <Gradient className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-xs">
              <History className="h-3 w-3" />
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <TabsContent value="solid" className="space-y-4 mt-0">
              {/* Current Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Fill Color</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 border-2 border-border rounded cursor-pointer"
                      style={{ backgroundColor: currentStyle.fill }}
                      onClick={() => handleColorSelect(currentStyle.fill, 'fill')}
                    />
                    <span className="text-xs font-mono">{currentStyle.fill}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Stroke Color</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 border-2 border-border rounded cursor-pointer"
                      style={{ backgroundColor: currentStyle.stroke }}
                      onClick={() => handleColorSelect(currentStyle.stroke, 'stroke')}
                    />
                    <span className="text-xs font-mono">{currentStyle.stroke}</span>
                  </div>
                </div>
              </div>

              {/* Preset Colors */}
              <div className="space-y-2">
                <Label className="text-sm">Preset Colors</Label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <div key={color} className="space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleColorSelect(color, 'fill')}
                        className="w-8 h-8 p-0 border-2"
                        style={{ backgroundColor: color }}
                        title={`Set fill to ${color}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleColorSelect(color, 'stroke')}
                        className="w-8 h-6 p-0 border"
                        style={{ backgroundColor: color }}
                        title={`Set stroke to ${color}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="picker" className="space-y-4 mt-0">
              {/* HSL Color Picker */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Hue: {hue}°</Label>
                  <Slider
                    value={[hue]}
                    onValueChange={(value) => setHue(value[0])}
                    max={360}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Saturation: {saturation}%</Label>
                  <Slider
                    value={[saturation]}
                    onValueChange={(value) => setSaturation(value[0])}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Lightness: {lightness}%</Label>
                  <Slider
                    value={[lightness]}
                    onValueChange={(value) => setLightness(value[0])}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Preview and Apply */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-12 h-12 border-2 border-border rounded"
                    style={{ backgroundColor: customColor }}
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleColorSelect(customColor, 'fill')}
                        className="flex-1"
                      >
                        Fill
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleColorSelect(customColor, 'stroke')}
                        className="flex-1"
                      >
                        Stroke
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gradient" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-sm">Gradient Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GRADIENT_PRESETS.map((gradient) => (
                    <div key={gradient.name} className="space-y-1">
                      <Button
                        variant="outline"
                        onClick={() => handleGradientSelect(gradient, 'fill')}
                        className="w-full h-8 p-0 overflow-hidden"
                        style={{
                          background: `linear-gradient(45deg, ${gradient.colors.join(', ')})`
                        }}
                        title={`Apply ${gradient.name} to fill`}
                      />
                      <div className="text-xs text-center text-muted-foreground">
                        {gradient.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recent" className="space-y-4 mt-0">
              {recentColors.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm">Recently Used</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {recentColors.map((color, index) => (
                      <div key={`${color}-${index}`} className="space-y-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleColorSelect(color, 'fill')}
                          className="w-8 h-8 p-0 border-2"
                          style={{ backgroundColor: color }}
                          title={`Set fill to ${color}`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleColorSelect(color, 'stroke')}
                          className="w-8 h-6 p-0 border"
                          style={{ backgroundColor: color }}
                          title={`Set stroke to ${color}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent colors</p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};