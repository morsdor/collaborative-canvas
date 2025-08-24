'use client';

import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { setCurrentTool, toggleColorPicker } from '@/store/slices/uiSlice';
import { Tool, Shape, ShapeStyle, Group } from '@/types';
import { ColorPicker } from '@/components/ui/ColorPicker';

interface GroupOperations {
  createGroup: () => void;
  ungroupShapes: () => void;
  canCreateGroup: boolean;
  canUngroupShapes: boolean;
}

interface ToolbarProps {
  selectedShapes?: Shape[];
  groups?: Group[];
  onStyleChange?: (shapeIds: string[], style: Partial<ShapeStyle>) => void;
  groupOperations?: GroupOperations;
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  selectedShapes = [],
  groups = [],
  onStyleChange,
  groupOperations,
  className = '' 
}) => {
  const dispatch = useAppDispatch();
  const currentTool = useAppSelector((state) => state.ui.currentTool);
  const colorPickerOpen = useAppSelector((state) => state.ui.panels.colorPicker.open);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });

  const tools: { id: Tool; label: string; icon: string }[] = [
    { id: 'select', label: 'Select', icon: '↖️' },
    { id: 'rectangle', label: 'Rectangle', icon: '⬜' },
    { id: 'circle', label: 'Circle', icon: '⭕' },
    { id: 'text', label: 'Text', icon: '📝' },
    { id: 'line', label: 'Line', icon: '📏' },
  ];

  const handleToolClick = (tool: Tool) => {
    dispatch(setCurrentTool(tool));
  };

  const handleColorPickerToggle = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setColorPickerPosition({
      x: rect.left,
      y: rect.bottom + 8,
    });
    dispatch(toggleColorPicker({ x: rect.left, y: rect.bottom + 8 }));
  };

  const handleStyleChange = (style: Partial<ShapeStyle>) => {
    if (onStyleChange && selectedShapes.length > 0) {
      const shapeIds = selectedShapes.map(shape => shape.id);
      onStyleChange(shapeIds, style);
    }
  };

  // Get common style from selected shapes
  const getCommonStyle = (): ShapeStyle => {
    if (selectedShapes.length === 0) {
      return {
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 1,
        opacity: 1,
      };
    }

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

  const commonStyle = getCommonStyle();

  return (
    <div className={`flex gap-4 p-4 bg-gray-100 border-b ${className}`}>
      {/* Tool Selection */}
      <div className="flex gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${
                currentTool === tool.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border'
              }
            `}
            title={tool.label}
          >
            <span className="mr-2">{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      {/* Group Operations (only show when shapes are selected) */}
      {selectedShapes.length > 0 && groupOperations && (
        <div className="flex items-center gap-2 border-l pl-4">
          {groupOperations.canCreateGroup && (
            <button
              onClick={groupOperations.createGroup}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              title="Group selected shapes (Ctrl/Cmd + G)"
            >
              Group
            </button>
          )}
          
          {groupOperations.canUngroupShapes && (
            <button
              onClick={groupOperations.ungroupShapes}
              className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
              title="Ungroup selected shapes (Ctrl/Cmd + Shift + G)"
            >
              Ungroup
            </button>
          )}
        </div>
      )}

      {/* Style Controls (only show when shapes are selected) */}
      {selectedShapes.length > 0 && (
        <div className="flex items-center gap-2 border-l pl-4">
          {/* Fill Color */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Fill:</span>
            <button
              onClick={handleColorPickerToggle}
              className="w-8 h-8 border border-gray-300 rounded hover:scale-110 transition-transform"
              style={{ backgroundColor: commonStyle.fill }}
              title={`Fill Color: ${commonStyle.fill}`}
            />
          </div>

          {/* Stroke Color */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Stroke:</span>
            <button
              className="w-8 h-8 border border-gray-300 rounded hover:scale-110 transition-transform"
              style={{ backgroundColor: commonStyle.stroke }}
              title={`Stroke Color: ${commonStyle.stroke}`}
            />
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Width:</span>
            <select
              value={commonStyle.strokeWidth}
              onChange={(e) => handleStyleChange({ strokeWidth: parseInt(e.target.value) })}
              className="px-2 py-1 text-sm border border-gray-300 rounded"
            >
              {[1, 2, 3, 4, 5, 8, 10, 12, 16, 20].map(width => (
                <option key={width} value={width}>{width}px</option>
              ))}
            </select>
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Opacity:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={commonStyle.opacity}
              onChange={(e) => handleStyleChange({ opacity: parseFloat(e.target.value) })}
              className="w-16"
            />
            <span className="text-xs text-gray-500 w-8">
              {Math.round(commonStyle.opacity * 100)}%
            </span>
          </div>
        </div>
      )}
      
      <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
        <span>Tool: <strong>{currentTool}</strong></span>
        {selectedShapes.length > 0 && (
          <span>Selected: <strong>{selectedShapes.length}</strong></span>
        )}
      </div>

      {/* Color Picker Popup */}
      {colorPickerOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => dispatch(toggleColorPicker(undefined))}
          />
          <div
            className="fixed z-50"
            style={{
              left: colorPickerPosition.x,
              top: colorPickerPosition.y,
            }}
          >
            <ColorPicker
              currentStyle={commonStyle}
              onStyleChange={handleStyleChange}
            />
          </div>
        </>
      )}
    </div>
  );
};