'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Point, Size } from '@/types';

interface TextInputProps {
  value: string;
  position: Point;
  dimensions: Size;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  onValueChange: (value: string) => void;
  onComplete: () => void;
  onCancel: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  position,
  dimensions,
  fontSize,
  fontWeight,
  textAlign,
  color,
  onValueChange,
  onComplete,
  onCancel,
  autoFocus = true,
  placeholder = 'Enter text...',
  maxLength = 500,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when component mounts
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  // Handle input changes
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    onValueChange(newValue);
  }, [onValueChange]);

  // Handle key events
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation(); // Prevent canvas shortcuts from firing

    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        onComplete();
        break;
      case 'Escape':
        event.preventDefault();
        onCancel();
        break;
      case 'Tab':
        event.preventDefault();
        onComplete();
        break;
    }
  }, [onComplete, onCancel]);

  // Handle blur (clicking outside)
  const handleBlur = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Calculate input styles based on text properties
  const inputStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: Math.max(dimensions.width, 100), // Minimum width for usability
    height: dimensions.height,
    fontSize: `${fontSize}px`,
    fontWeight,
    textAlign,
    color,
    backgroundColor: 'transparent',
    border: '2px solid #3b82f6', // Blue border to indicate editing
    borderRadius: '4px',
    padding: '4px 8px',
    outline: 'none',
    fontFamily: 'Arial, sans-serif',
    zIndex: 1000, // Ensure it appears above other elements
  };

  return (
    <Input
      ref={inputRef}
      value={inputValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={placeholder}
      maxLength={maxLength}
      style={inputStyle}
      className="absolute border-2 border-blue-500 bg-white shadow-lg"
      aria-label="Text input for shape editing"
    />
  );
};