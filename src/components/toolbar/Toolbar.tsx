'use client';

import React, { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { setCurrentTool, toggleColorPicker } from '@/store/slices/uiSlice';
import { Tool, Shape, ShapeStyle, Group, TextStyle } from '@/types';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { TextFormatPanel } from '@/components/ui/TextFormatPanel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { 
  MousePointer2, 
  Square, 
  Circle, 
  Type, 
  Minus, 
  Undo2, 
  Redo2, 
  Ungroup, 
  Trash2,
  Palette,
  Brush,
  Eye,
  Group as GroupIcon
} from 'lucide-react';

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
  onTextStyleChange?: (shapeIds: string[], textStyle: Partial<TextStyle>) => void;
  onDelete?: () => void;
  groupOperations?: GroupOperations;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  selectedShapes = [],
  onStyleChange,
  onTextStyleChange,
  onDelete,
  groupOperations,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  className = '' 
}) => {
  const dispatch = useAppDispatch();
  const currentTool = useAppSelector((state) => state.ui.currentTool);
  const colorPickerOpen = useAppSelector((state) => state.ui.panels.colorPicker.open);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });

  const tools: { id: Tool; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Select', icon: <MousePointer2 className="h-4 w-4" />, shortcut: 'V' },
    { id: 'rectangle', label: 'Rectangle', icon: <Square className="h-4 w-4" />, shortcut: 'R' },
    { id: 'circle', label: 'Circle', icon: <Circle className="h-4 w-4" />, shortcut: 'C' },
    { id: 'text', label: 'Text', icon: <Type className="h-4 w-4" />, shortcut: 'T' },
    { id: 'line', label: 'Line', icon: <Minus className="h-4 w-4" />, shortcut: 'L' },
  ];

  const handleToolClick = (tool: Tool) => {
    dispatch(setCurrentTool(tool));
  };

  const handleColorPickerToggle = (event: React.MouseEvent, colorType: 'fill' | 'stroke') => {
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

  const handleStrokeWidthChange = (value: string) => {
    handleStyleChange({ strokeWidth: parseInt(value) });
  };

  const handleOpacityChange = (value: number[]) => {
    handleStyleChange({ opacity: value[0] / 100 });
  };

  const handleTextStyleChange = (textStyle: Partial<TextStyle>) => {
    if (onTextStyleChange && selectedShapes.length > 0) {
      const textShapeIds = selectedShapes
        .filter(shape => shape.type === 'text')
        .map(shape => shape.id);
      if (textShapeIds.length > 0) {
        onTextStyleChange(textShapeIds, textStyle);
      }
    }
  };

  // Get common style from selected shapes (memoized to prevent infinite re-renders)
  const commonStyle = useMemo((): ShapeStyle => {
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
  }, [selectedShapes]);

  // Get common text style from selected text shapes
  const commonTextStyle = useMemo((): TextStyle | null => {
    const textShapes = selectedShapes.filter(shape => shape.type === 'text');
    if (textShapes.length === 0) return null;

    if (textShapes.length === 1) {
      return textShapes[0].textStyle || {
        fontSize: 16,
        fontWeight: 'normal',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        color: '#000000',
      };
    }

    // For multiple text shapes, find common values or use defaults
    const firstTextStyle = textShapes[0].textStyle || {
      fontSize: 16,
      fontWeight: 'normal',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      color: '#000000',
    };
    const commonTextStyle: TextStyle = { ...firstTextStyle };

    for (let i = 1; i < textShapes.length; i++) {
      const textStyle = textShapes[i].textStyle || {
        fontSize: 16,
        fontWeight: 'normal',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        color: '#000000',
      };
      
      if (textStyle.fontSize !== commonTextStyle.fontSize) {
        commonTextStyle.fontSize = 16; // Default if different
      }
      if (textStyle.fontWeight !== commonTextStyle.fontWeight) {
        commonTextStyle.fontWeight = 'normal'; // Default if different
      }
      if (textStyle.fontFamily !== commonTextStyle.fontFamily) {
        commonTextStyle.fontFamily = 'Arial, sans-serif'; // Default if different
      }
      if (textStyle.textAlign !== commonTextStyle.textAlign) {
        commonTextStyle.textAlign = 'center'; // Default if different
      }
      if (textStyle.color !== commonTextStyle.color) {
        commonTextStyle.color = '#000000'; // Default if different
      }
    }

    return commonTextStyle;
  }, [selectedShapes]);

  const hasTextShapes = selectedShapes.some(shape => shape.type === 'text');

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 p-3 bg-background border-b shadow-sm ${className}`}>
        {/* Tool Selection */}
        <div className="flex items-center gap-1">
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={currentTool === tool.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleToolClick(tool.id)}
                  className="h-9 w-9 p-0"
                  aria-label={tool.label}
                >
                  {tool.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tool.label} ({tool.shortcut})</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo Controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo}
                className="h-9 w-9 p-0"
                aria-label="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo (Ctrl/Cmd + Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo}
                className="h-9 w-9 p-0"
                aria-label="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo (Ctrl/Cmd + Y)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Action Buttons (only show when shapes are selected) */}
        {selectedShapes.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-1">
              {/* Delete Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete (Del)</p>
                </TooltipContent>
              </Tooltip>

              {/* Group Operations */}
              {groupOperations && (
                <>
                  {groupOperations.canCreateGroup && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={groupOperations.createGroup}
                          className="h-9 w-9 p-0"
                          aria-label="Group"
                        >
                          <GroupIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Group (Ctrl/Cmd + G)</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {groupOperations.canUngroupShapes && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={groupOperations.ungroupShapes}
                          className="h-9 w-9 p-0"
                          aria-label="Ungroup"
                        >
                          <Ungroup className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ungroup (Ctrl/Cmd + Shift + G)</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Style Controls (only show when shapes are selected) */}
        {selectedShapes.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              {/* Fill Color */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleColorPickerToggle(e, 'fill')}
                      className="h-8 w-8 p-0 border-2"
                      style={{ backgroundColor: commonStyle.fill }}
                      aria-label={`Fill Color: ${commonStyle.fill}`}
                    >
                      <Palette className="h-3 w-3 opacity-0" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fill Color: {commonStyle.fill}</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-xs text-muted-foreground">Fill</span>
              </div>

              {/* Stroke Color */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleColorPickerToggle(e, 'stroke')}
                      className="h-8 w-8 p-0 border-2"
                      style={{ backgroundColor: commonStyle.stroke }}
                      aria-label={`Stroke Color: ${commonStyle.stroke}`}
                    >
                      <Brush className="h-3 w-3 opacity-0" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Stroke Color: {commonStyle.stroke}</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-xs text-muted-foreground">Stroke</span>
              </div>

              {/* Stroke Width */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Width:</span>
                <Select value={commonStyle.strokeWidth.toString()} onValueChange={handleStrokeWidthChange}>
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 8, 10, 12, 16, 20].map(width => (
                      <SelectItem key={width} value={width.toString()}>
                        {width}px
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Opacity */}
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[Math.round(commonStyle.opacity * 100)]}
                  onValueChange={handleOpacityChange}
                  max={100}
                  min={0}
                  step={10}
                  className="w-16"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {Math.round(commonStyle.opacity * 100)}%
                </span>
              </div>
            </div>
          </>
        )}

        {/* Text Formatting Panel (only show when text shapes are selected) */}
        {hasTextShapes && commonTextStyle && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <TextFormatPanel
              textStyle={commonTextStyle}
              onTextStyleChange={handleTextStyleChange}
            />
          </>
        )}
        
        {/* Status Info */}
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {currentTool}
          </Badge>
          {selectedShapes.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {selectedShapes.length} selected
            </Badge>
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
    </TooltipProvider>
  );
};