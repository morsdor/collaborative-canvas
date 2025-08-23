import React from 'react';
import { BaseShapeProps, ShapeRenderer } from './BaseShape';

export const CircleShape: React.FC<BaseShapeProps> = (props) => {
  const { shape, isHovered } = props;
  const { style } = shape;

  return (
    <ShapeRenderer {...props}>
      <div
        className={`w-full h-full rounded-full transition-all duration-150 ${
          isHovered ? 'brightness-110' : ''
        }`}
        style={{
          backgroundColor: style.fill,
          border: style.strokeWidth > 0 ? `${style.strokeWidth}px solid ${style.stroke}` : 'none',
          opacity: style.opacity,
        }}
      />
    </ShapeRenderer>
  );
};