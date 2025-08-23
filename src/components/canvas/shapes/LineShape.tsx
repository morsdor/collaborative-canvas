import React from 'react';
import { BaseShapeProps, ShapeRenderer } from './BaseShape';

export const LineShape: React.FC<BaseShapeProps> = (props) => {
  const { shape, isHovered } = props;
  const { style, dimensions } = shape;

  // Calculate line angle and length
  const length = Math.sqrt(dimensions.width ** 2 + dimensions.height ** 2);
  const angle = Math.atan2(dimensions.height, dimensions.width) * (180 / Math.PI);

  return (
    <ShapeRenderer {...props}>
      <div className="relative w-full h-full">
        <div
          className={`absolute transition-all duration-150 ${
            isHovered ? 'brightness-110' : ''
          }`}
          style={{
            width: `${length}px`,
            height: `${style.strokeWidth}px`,
            backgroundColor: style.stroke,
            opacity: style.opacity,
            transformOrigin: '0 50%',
            transform: `rotate(${angle}deg)`,
            top: '50%',
            left: '0',
            marginTop: `-${style.strokeWidth / 2}px`,
          }}
        />
      </div>
    </ShapeRenderer>
  );
};