'use client';

import React, { useCallback } from 'react';
import { Shape, ShapeStyle } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Move, 
  Maximize2, 
  Palette, 
  Type, 
  RotateCw,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';

interface PropertyPanelProps {
  selectedShapes: Shape[];
  onShapeUpdate: (shapeIds: string[], updates: Partial<Shape>) => void;
  onStyleChange: (shapeIds: string[], style: Partial<ShapeStyle>) => void;
  className?: string;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedShapes,
  onShapeUpdate,
  onStyleChange,
  className,
}) => {
  // Get common properties from selected shapes
  const getCommonProperty = <T extends keyof Shape>(property: T): Shape[T] | 'mixed' => {
    if (selectedShapes.length === 0) return undefined as Shape[T];
    if (selectedShapes.length === 1) return selectedShapes[0][property];
    
    const firstValue = selectedShapes[0][property];
    const allSame = selectedShapes.every(shape => 
      JSON.stringify(shape[property]) === JSON.stringify(firstValue)
    );
    
    return allSame ? firstValue : 'mixed' as Shape[T];
  };

  const getCommonStyleProperty = <T extends keyof ShapeStyle>(property: T): ShapeStyle[T] | 'mixed' => {
    if (selectedShapes.length === 0) return undefined as ShapeStyle[T];
    if (selectedShapes.length === 1) return selectedShapes[0].style[property];
    
    const firstValue = selectedShapes[0].style[property];
    const allSame = selectedShapes.every(shape => shape.style[property] === firstValue);
    
    return allSame ? firstValue : 'mixed' as ShapeStyle[T];
  };

  // Event handlers
  const handlePositionChange = useCallback((axis: 'x' | 'y', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    const shapeIds = selectedShapes.map(shape => shape.id);
    onShapeUpdate(shapeIds, {
      position: {
        ...selectedShapes[0].position,
        [axis]: numValue
      }
    });
  }, [selectedShapes, onShapeUpdate]);

  const handleDimensionChange = useCallback((dimension: 'width' | 'height', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;
    
    const shapeIds = selectedShapes.map(shape => shape.id);
    onShapeUpdate(shapeIds, {
      dimensions: {
        ...selectedShapes[0].dimensions,
        [dimension]: numValue
      }
    });
  }, [selectedShapes, onShapeUpdate]);

  const handleContentChange = useCallback((content: string) => {
    const shapeIds = selectedShapes.map(shape => shape.id);
    onShapeUpdate(shapeIds, { content });
  }, [selectedShapes, onShapeUpdate]);

  const handleStyleChange = useCallback((style: Partial<ShapeStyle>) => {
    const shapeIds = selectedShapes.map(shape => shape.id);
    onStyleChange(shapeIds, style);
  }, [selectedShapes, onStyleChange]);

  if (selectedShapes.length === 0) {
    return (
      <div className={cn(
        "w-80 bg-background border-l p-4 flex items-center justify-center text-muted-foreground",
        className
      )}>
        <div className="text-center">
          <Maximize2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select shapes to edit properties</p>
        </div>
      </div>
    );
  }

  const commonPosition = getCommonProperty('position');
  const commonDimensions = getCommonProperty('dimensions');
  const commonContent = getCommonProperty('content');
  const commonType = getCommonProperty('type');
  
  const commonFill = getCommonStyleProperty('fill');
  const commonStroke = getCommonStyleProperty('stroke');
  const commonStrokeWidth = getCommonStyleProperty('strokeWidth');
  const commonOpacity = getCommonStyleProperty('opacity');

  return (
    <div className={cn("w-80 bg-background border-l overflow-y-auto", className)}>
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">Properties</h3>
        <p className="text-sm text-muted-foreground">
          {selectedShapes.length === 1 
            ? `${selectedShapes[0].type} shape` 
            : `${selectedShapes.length} shapes selected`
          }
        </p>
      </div>

      <Tabs defaultValue="transform" className="w-full">
        <TabsList className="grid w-full grid-cols-3 m-4">
          <TabsTrigger value="transform" className="flex items-center gap-1">
            <Move className="h-3 w-3" />
            Transform
          </TabsTrigger>
          <TabsTrigger value="style" className="flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Style
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-1">
            <Type className="h-3 w-3" />
            Content
          </TabsTrigger>
        </TabsList>

        <div className="px-4 pb-4">
          <TabsContent value="transform" className="space-y-4 mt-0">
            {/* Position */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Position</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="pos-x" className="text-xs text-muted-foreground">X</Label>
                  <Input
                    id="pos-x"
                    type="number"
                    value={commonPosition === 'mixed' ? '' : commonPosition?.x || 0}
                    onChange={(e) => handlePositionChange('x', e.target.value)}
                    placeholder={commonPosition === 'mixed' ? 'Mixed' : '0'}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="pos-y" className="text-xs text-muted-foreground">Y</Label>
                  <Input
                    id="pos-y"
                    type="number"
                    value={commonPosition === 'mixed' ? '' : commonPosition?.y || 0}
                    onChange={(e) => handlePositionChange('y', e.target.value)}
                    placeholder={commonPosition === 'mixed' ? 'Mixed' : '0'}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Size</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="width" className="text-xs text-muted-foreground">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    min="1"
                    value={commonDimensions === 'mixed' ? '' : commonDimensions?.width || 100}
                    onChange={(e) => handleDimensionChange('width', e.target.value)}
                    placeholder={commonDimensions === 'mixed' ? 'Mixed' : '100'}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs text-muted-foreground">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    min="1"
                    value={commonDimensions === 'mixed' ? '' : commonDimensions?.height || 100}
                    onChange={(e) => handleDimensionChange('height', e.target.value)}
                    placeholder={commonDimensions === 'mixed' ? 'Mixed' : '100'}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Actions</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-8">
                  <Lock className="h-3 w-3 mr-1" />
                  Lock
                </Button>
                <Button variant="outline" size="sm" className="h-8">
                  <Eye className="h-3 w-3 mr-1" />
                  Hide
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="style" className="space-y-4 mt-0">
            {/* Fill Color */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fill Color</Label>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 border-2 border-border rounded"
                  style={{ 
                    backgroundColor: commonFill === 'mixed' ? '#ccc' : commonFill || '#ffffff'
                  }}
                />
                <Input
                  type="text"
                  value={commonFill === 'mixed' ? 'Mixed' : commonFill || '#ffffff'}
                  onChange={(e) => handleStyleChange({ fill: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1 h-8 font-mono text-sm"
                  disabled={commonFill === 'mixed'}
                />
              </div>
            </div>

            {/* Stroke Color */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Stroke Color</Label>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 border-2 border-border rounded"
                  style={{ 
                    backgroundColor: commonStroke === 'mixed' ? '#ccc' : commonStroke || '#000000'
                  }}
                />
                <Input
                  type="text"
                  value={commonStroke === 'mixed' ? 'Mixed' : commonStroke || '#000000'}
                  onChange={(e) => handleStyleChange({ stroke: e.target.value })}
                  placeholder="#000000"
                  className="flex-1 h-8 font-mono text-sm"
                  disabled={commonStroke === 'mixed'}
                />
              </div>
            </div>

            {/* Stroke Width */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Stroke Width: {commonStrokeWidth === 'mixed' ? 'Mixed' : `${commonStrokeWidth || 1}px`}
              </Label>
              <Slider
                value={[commonStrokeWidth === 'mixed' ? 1 : commonStrokeWidth || 1]}
                onValueChange={(value) => handleStyleChange({ strokeWidth: value[0] })}
                max={20}
                min={1}
                step={1}
                className="w-full"
                disabled={commonStrokeWidth === 'mixed'}
              />
            </div>

            {/* Opacity */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Opacity: {commonOpacity === 'mixed' ? 'Mixed' : `${Math.round((commonOpacity || 1) * 100)}%`}
              </Label>
              <Slider
                value={[commonOpacity === 'mixed' ? 100 : Math.round((commonOpacity || 1) * 100)]}
                onValueChange={(value) => handleStyleChange({ opacity: value[0] / 100 })}
                max={100}
                min={0}
                step={5}
                className="w-full"
                disabled={commonOpacity === 'mixed'}
              />
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-0">
            {/* Text Content (for text shapes) */}
            {(commonType === 'text' || commonType === 'mixed') && (
              <div className="space-y-2">
                <Label htmlFor="text-content" className="text-sm font-medium">Text Content</Label>
                <textarea
                  id="text-content"
                  value={commonContent === 'mixed' ? 'Mixed content' : commonContent || ''}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Enter text..."
                  className="w-full h-20 px-3 py-2 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={commonContent === 'mixed'}
                />
              </div>
            )}

            {/* Shape Type Info */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Shape Type</Label>
              <div className="text-sm text-muted-foreground capitalize">
                {commonType === 'mixed' ? 'Multiple types' : commonType || 'Unknown'}
              </div>
            </div>

            {/* Layer Order */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Layer Order</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-8">
                  Bring Forward
                </Button>
                <Button variant="outline" size="sm" className="h-8">
                  Send Backward
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};