'use client';

import React, { useCallback } from 'react';
import { Shape, ShapeStyle } from '@/types';
import { ColorPicker } from './ColorPicker';
import { cn } from '@/lib/utils';

interface StylePanelProps {
  selectedShapes: Shape[];
  onStyleChange: (shapeIds: string[], style: Partial<ShapeStyle>) => void;
  className?: string;
}

export const StylePanel: React.FC<StylePanelProps> = ({
  selectedShapes,
  onStyleChange,
  className,
}) => {
  if (selectedShapes.length === 0) {
    return (
      <div className={cn("p-4 text-center text-gray-500", className)}>
        Select shapes to edit their style
      </div>
    );
  }

  // Get the common style properties from selected shapes
  const getCommonStyle = (): ShapeStyle => {
    if (selectedShapes.length === 1) {
      return selectedShapes[0].style;
    }

    // For multiple shapes, find common values or use defaults
    const firstStyle = selectedShapes[0].style;
    const commonStyle: ShapeStyle = { ...firstStyle };

    for (let i = 1; i < selectedShapes.length; i++) {
      const style = selectedShapes[i].style;
      
      if (style.fill !== commonStyle.fill) {
        commonStyle.fill = '#000000'; // Default if different
      }
      if (style.stroke !== commonStyle.stroke) {
        commonStyle.stroke = '#000000'; // Default if different
      }
      if (style.strokeWidth !== commonStyle.strokeWidth) {
        commonStyle.strokeWidth = 1; // Default if different
      }
      if (style.opacity !== commonStyle.opacity) {
        commonStyle.opacity = 1; // Default if different
      }
    }

    return commonStyle;
  };

  const handleStyleChange = useCallback((styleUpdates: Partial<ShapeStyle>) => {
    const shapeIds = selectedShapes.map(shape => shape.id);
    onStyleChange(shapeIds, styleUpdates);
  }, [selectedShapes, onStyleChange]);

  const commonStyle = getCommonStyle();

  return (
    <div className={cn("bg-white border border-gray-200 rounded-lg shadow-sm", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">
          Style Properties
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {selectedShapes.length === 1 
            ? `1 shape selected` 
            : `${selectedShapes.length} shapes selected`
          }
        </p>
      </div>

      {/* Color Picker */}
      <div className="p-4">
        <ColorPicker
          currentStyle={commonStyle}
          onStyleChange={handleStyleChange}
        />
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleStyleChange({ fill: 'transparent' })}
            className="px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            No Fill
          </button>
          <button
            onClick={() => handleStyleChange({ stroke: 'transparent' })}
            className="px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            No Stroke
          </button>
          <button
            onClick={() => handleStyleChange({ 
              fill: '#ffffff', 
              stroke: '#000000', 
              strokeWidth: 1, 
              opacity: 1 
            })}
            className="px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Reset Style
          </button>
          <button
            onClick={() => handleStyleChange({ opacity: 0.5 })}
            className="px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            50% Opacity
          </button>
        </div>
      </div>
    </div>
  );
};