import React, { useState, useCallback } from 'react';
import { BaseShapeProps, ShapeRenderer } from './BaseShape';
import { TextInput } from '@/components/ui/TextInput';

interface TextShapeProps extends BaseShapeProps {
  isEditing?: boolean;
  onStartEdit?: () => void;
  onFinishEdit?: (newContent: string) => void;
  onCancelEdit?: () => void;
}

export const TextShape: React.FC<TextShapeProps> = (props) => {
  const { 
    shape, 
    isHovered, 
    isEditing = false, 
    onStartEdit, 
    onFinishEdit, 
    onCancelEdit 
  } = props;
  const { style, content, dimensions, textStyle } = shape;
  const [editingContent, setEditingContent] = useState(content || '');

  // Use text style if available, otherwise fall back to calculated values
  const fontSize = textStyle?.fontSize || Math.max(12, dimensions.height * 0.6);
  const fontWeight = textStyle?.fontWeight || 'normal';
  const textAlign = textStyle?.textAlign || 'center';
  const textColor = textStyle?.color || (style.fill === '#000000' || style.fill === 'transparent' ? '#000000' : '#ffffff');
  const fontFamily = textStyle?.fontFamily || 'Arial, sans-serif';

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (onStartEdit) {
      onStartEdit();
    }
  }, [onStartEdit]);

  const handleEditComplete = useCallback(() => {
    if (onFinishEdit) {
      onFinishEdit(editingContent);
    }
  }, [onFinishEdit, editingContent]);

  const handleEditCancel = useCallback(() => {
    setEditingContent(content || '');
    if (onCancelEdit) {
      onCancelEdit();
    }
  }, [onCancelEdit, content]);

  const handleContentChange = useCallback((newContent: string) => {
    setEditingContent(newContent);
  }, []);

  // If editing, render the text input
  if (isEditing) {
    return (
      <TextInput
        value={editingContent}
        position={shape.position}
        dimensions={dimensions}
        fontSize={fontSize}
        fontWeight={fontWeight}
        textAlign={textAlign}
        color={textColor}
        onValueChange={handleContentChange}
        onComplete={handleEditComplete}
        onCancel={handleEditCancel}
        placeholder="Enter text..."
      />
    );
  }

  // Normal display mode
  return (
    <ShapeRenderer {...props}>
      <div
        className={`w-full h-full flex items-center justify-center transition-all duration-150 cursor-text ${
          isHovered ? 'brightness-110' : ''
        }`}
        style={{
          backgroundColor: style.fill !== '#000000' ? style.fill : 'transparent',
          border: style.strokeWidth > 0 ? `${style.strokeWidth}px solid ${style.stroke}` : 'none',
          opacity: style.opacity,
          color: textColor,
          fontSize: `${fontSize}px`,
          fontFamily,
          fontWeight,
          textAlign,
          wordWrap: 'break-word',
          overflow: 'hidden',
          padding: '4px',
        }}
        onDoubleClick={handleDoubleClick}
        title="Double-click to edit text"
      >
        {content || 'Text'}
      </div>
    </ShapeRenderer>
  );
};