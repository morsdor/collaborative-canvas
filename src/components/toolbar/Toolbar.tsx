'use client';

import React from 'react';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { setCurrentTool } from '@/store/slices/uiSlice';
import { Tool } from '@/types';

interface ToolbarProps {
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const currentTool = useAppSelector((state) => state.ui.currentTool);

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

  return (
    <div className={`flex gap-2 p-4 bg-gray-100 border-b ${className}`}>
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
      
      <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
        <span>Current Tool: <strong>{currentTool}</strong></span>
      </div>
    </div>
  );
};