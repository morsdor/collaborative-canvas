'use client';

import React, { useState, useCallback } from 'react';
import { ShapeStyle } from '@/types';
import { cn } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState<'fill' | 'stroke'>('fill');

  const handleColorChange = useCallback((color: string) => {
    if (activeTab === 'fill') {
      onStyleChange({ fill: color });
    } else {
      onStyleChange({ stroke: color });
    }
  }, [activeTab, onStyleChange]);

  const handleStrokeWidthChange = useCallback((width: number) => {
    onStyleChange({ strokeWidth: width });
  }, [onStyleChange]);

  const handleOpacityChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(event.target.value);
    onStyleChange({ opacity });
  }, [onStyleChange]);

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64",
      className
    )}>
      {/* Tabs */}
      <div className="flex mb-4 border-b">
        <button
          onClick={() => setActiveTab('fill')}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'fill'
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Fill
        </button>
        <button
          onClick={() => setActiveTab('stroke')}
          className={cn(
            "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'stroke'
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Stroke
        </button>
      </div>

      {/* Current Color Display */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current {activeTab === 'fill' ? 'Fill' : 'Stroke'} Color
        </label>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 border border-gray-300 rounded"
            style={{
              backgroundColor: activeTab === 'fill' ? currentStyle.fill : currentStyle.stroke,
            }}
          />
          <input
            type="color"
            value={activeTab === 'fill' ? currentStyle.fill : currentStyle.stroke}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-8 h-8 border-none cursor-pointer"
          />
          <span className="text-sm text-gray-600">
            {activeTab === 'fill' ? currentStyle.fill : currentStyle.stroke}
          </span>
        </div>
      </div>

      {/* Preset Colors */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preset Colors
        </label>
        <div className="grid grid-cols-5 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className={cn(
                "w-8 h-8 border border-gray-300 rounded hover:scale-110 transition-transform",
                (activeTab === 'fill' ? currentStyle.fill : currentStyle.stroke) === color &&
                "ring-2 ring-blue-500 ring-offset-1"
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width (only for stroke tab) */}
      {activeTab === 'stroke' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stroke Width: {currentStyle.strokeWidth}px
          </label>
          <div className="grid grid-cols-5 gap-2">
            {STROKE_WIDTHS.map((width) => (
              <button
                key={width}
                onClick={() => handleStrokeWidthChange(width)}
                className={cn(
                  "h-8 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center",
                  currentStyle.strokeWidth === width && "bg-blue-100 border-blue-500"
                )}
              >
                <div
                  className="bg-gray-800 rounded"
                  style={{
                    width: '20px',
                    height: `${Math.min(width, 6)}px`,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Opacity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opacity: {Math.round(currentStyle.opacity * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={currentStyle.opacity}
          onChange={handleOpacityChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};