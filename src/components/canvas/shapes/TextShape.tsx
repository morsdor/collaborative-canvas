import React from 'react';
import { BaseShapeProps, ShapeRenderer } from './BaseShape';

export const TextShape: React.FC<BaseShapeProps> = (props) => {
  const { shape, isHovered } = props;
  const { style, content, dimensions } = shape;

  // Calculate font size based on shape height
  const fontSize = Math.max(12, dimensions.height * 0.6);

  return (
    <ShapeRenderer {...props}>
      <div
        className={`w-full h-full flex items-center justify-center transition-all duration-150 ${
          isHovered ? 'brightness-110' : ''
        }`}
        style={{
          backgroundColor: style.fill !== '#000000' ? style.fill : 'transparent',
          border: style.strokeWidth > 0 ? `${style.strokeWidth}px solid ${style.stroke}` : 'none',
          opacity: style.opacity,
          color: style.fill === '#000000' || style.fill === 'transparent' ? '#000000' : '#ffffff',
          fontSize: `${fontSize}px`,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          textAlign: 'center',
          wordWrap: 'break-word',
          overflow: 'hidden',
        }}
      >
        {content || 'Text'}
      </div>
    </ShapeRenderer>
  );
};