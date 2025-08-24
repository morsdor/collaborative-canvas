'use client';

import React from 'react';
import { Group, Point } from '@/types';

interface GroupOverlayProps {
  groups: Group[];
  selectedGroup: Group | null;
  zoom: number;
  panOffset: Point;
}

export const GroupOverlay: React.FC<GroupOverlayProps> = ({
  groups,
  selectedGroup,
  zoom,
  panOffset,
}) => {
  if (!selectedGroup) {
    return null;
  }

  const bounds = selectedGroup.bounds;

  return (
    <div
      className="absolute pointer-events-none border-2 border-dashed border-purple-500 bg-purple-100 bg-opacity-10"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        transform: `scale(${zoom}) translate(${-panOffset.x}px, ${-panOffset.y}px)`,
        transformOrigin: '0 0',
      }}
    >
      {/* Group label */}
      <div
        className="absolute -top-6 left-0 bg-purple-500 text-white text-xs px-2 py-1 rounded"
        style={{
          transform: `scale(${1 / zoom})`,
          transformOrigin: 'left bottom',
        }}
      >
        Group ({selectedGroup.shapeIds.length} shapes)
        {selectedGroup.locked && ' 🔒'}
      </div>
      
      {/* Group resize handles */}
      {!selectedGroup.locked && (
        <>
          {/* Corner handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-purple-500 border border-white" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 border border-white" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-purple-500 border border-white" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-500 border border-white" />
          
          {/* Edge handles */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-500 border border-white" />
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-500 border border-white" />
          <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-purple-500 border border-white" />
          <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-purple-500 border border-white" />
        </>
      )}
    </div>
  );
};