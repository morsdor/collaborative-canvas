'use client';

import React, { useState, useCallback } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { Toolbar } from '@/components/toolbar';
import { CanvasContainer } from '@/components/canvas';
import { StylePanel } from '@/components/ui/StylePanel';
import { Shape, ShapeStyle } from '@/types';

export default function Home() {
  const [selectedShapes, setSelectedShapes] = useState<Shape[]>([]);
  const [allShapes, setAllShapes] = useState<Shape[]>([]);

  const handleShapesChange = useCallback((shapes: Shape[]) => {
    setAllShapes(shapes);
    // Update selected shapes when shapes change
    setSelectedShapes(prev => {
      const selectedIds = new Set(prev.map(s => s.id));
      return shapes.filter(shape => selectedIds.has(shape.id));
    });
  }, []);

  const handleSelectionChange = useCallback((selectedIds: Set<string>) => {
    const selected = allShapes.filter(shape => selectedIds.has(shape.id));
    setSelectedShapes(selected);
  }, [allShapes]);

  const handleStyleChange = useCallback((shapeIds: string[], style: Partial<ShapeStyle>) => {
    console.log('Style change requested:', shapeIds, style);
    // The CanvasContainer will handle the actual style updates
  }, []);

  return (
    <Provider store={store}>
      <div className="h-screen flex flex-col">
        <Toolbar 
          selectedShapes={selectedShapes}
          onStyleChange={handleStyleChange}
        />
        <div className="flex flex-1">
          <div className="flex-1 relative">
            <CanvasContainer 
              sessionId="demo-session" 
              className="w-full h-full"
              onShapesChange={handleShapesChange}
              onSelectionChange={handleSelectionChange}
              onStyleChange={handleStyleChange}
            />
          </div>
          
          {/* Style Panel */}
          {selectedShapes.length > 0 && (
            <div className="w-80 border-l bg-gray-50 p-4">
              <StylePanel
                selectedShapes={selectedShapes}
                onStyleChange={handleStyleChange}
              />
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="absolute top-20 left-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-sm">
          <h3 className="font-semibold mb-2">Collaborative Canvas Demo</h3>
          <ul className="text-sm space-y-1">
            <li>• Select a tool from the toolbar</li>
            <li>• Click on the canvas to create shapes</li>
            <li>• Drag shapes to move them around</li>
            <li>• Click shapes to select them</li>
            <li>• Ctrl/Cmd + click for multi-select</li>
            <li>• Use resize handles to resize shapes</li>
            <li>• Use style panel to change colors</li>
            <li>• Use Ctrl/Cmd + mouse to pan</li>
            <li>• Scroll to zoom in/out</li>
          </ul>
        </div>
      </div>
    </Provider>
  );
}