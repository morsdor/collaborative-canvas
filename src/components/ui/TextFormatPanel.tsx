'use client';

import React from 'react';
import { TextStyle } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Bold, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Type
} from 'lucide-react';

interface TextFormatPanelProps {
  textStyle: TextStyle;
  onTextStyleChange: (style: Partial<TextStyle>) => void;
  className?: string;
}

export const TextFormatPanel: React.FC<TextFormatPanelProps> = ({
  textStyle,
  onTextStyleChange,
  className = '',
}) => {
  const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];
  const fontFamilies = [
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Helvetica, sans-serif', label: 'Helvetica' },
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
  ];

  const handleFontSizeChange = (value: string) => {
    onTextStyleChange({ fontSize: parseInt(value) });
  };

  const handleFontFamilyChange = (value: string) => {
    onTextStyleChange({ fontFamily: value });
  };

  const handleFontWeightToggle = () => {
    onTextStyleChange({ 
      fontWeight: textStyle.fontWeight === 'bold' ? 'normal' : 'bold' 
    });
  };

  const handleTextAlignChange = (align: 'left' | 'center' | 'right') => {
    onTextStyleChange({ textAlign: align });
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onTextStyleChange({ color: event.target.value });
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 p-2 bg-background border rounded-lg shadow-sm ${className}`}>
        {/* Font Family */}
        <div className="flex items-center gap-1">
          <Type className="h-4 w-4 text-muted-foreground" />
          <Select value={textStyle.fontFamily} onValueChange={handleFontFamilyChange}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map(font => (
                <SelectItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Font Size */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Size:</span>
          <Select value={textStyle.fontSize.toString()} onValueChange={handleFontSizeChange}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontSizes.map(size => (
                <SelectItem key={size} value={size.toString()}>
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Font Weight */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={textStyle.fontWeight === 'bold' ? 'default' : 'ghost'}
              size="sm"
              onClick={handleFontWeightToggle}
              className="h-8 w-8 p-0"
              aria-label="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Bold (Ctrl/Cmd + B)</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Alignment */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={textStyle.textAlign === 'left' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTextAlignChange('left')}
                className="h-8 w-8 p-0"
                aria-label="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Align Left</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={textStyle.textAlign === 'center' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTextAlignChange('center')}
                className="h-8 w-8 p-0"
                aria-label="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Align Center</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={textStyle.textAlign === 'right' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTextAlignChange('right')}
                className="h-8 w-8 p-0"
                aria-label="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Align Right</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Color */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Color:</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <input
                  type="color"
                  value={textStyle.color}
                  onChange={handleColorChange}
                  className="w-8 h-8 border-2 border-border rounded cursor-pointer"
                  aria-label={`Text Color: ${textStyle.color}`}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Text Color: {textStyle.color}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};