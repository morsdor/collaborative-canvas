'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { Toolbar } from '@/components/toolbar';
import { CanvasContainer } from '@/components/canvas';

export default function Home() {
  return (
    <Provider store={store}>
      <div className="h-screen flex flex-col">
        <Toolbar />
        <div className="flex-1 relative">
          <CanvasContainer sessionId="demo-session" className="w-full h-full" />
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
            <li>• Use Ctrl/Cmd + mouse to pan</li>
            <li>• Scroll to zoom in/out</li>
          </ul>
        </div>
      </div>
    </Provider>
  );
}