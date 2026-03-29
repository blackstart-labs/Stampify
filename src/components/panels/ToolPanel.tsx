import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  MousePointer2, Type, Square, Circle, Minus, ArrowRight, Triangle,
  Droplets, Hand, Stamp, Smile, ZoomIn, ZoomOut, Maximize,
  Grid3X3, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useCanvasStore } from '@/store/canvasStore';
import type {
  ToolType, ShapeType, TextLayer, ShapeLayer,
  WatermarkLayer, EmojiLayer
} from '@/types';

const tools: { id: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select', shortcut: 'V' },
  { id: 'text', icon: <Type size={18} />, label: 'Text', shortcut: 'T' },
  { id: 'pan', icon: <Hand size={18} />, label: 'Pan', shortcut: 'H' },
];

const shapes: { id: ShapeType; icon: React.ReactNode; label: string }[] = [
  { id: 'rectangle', icon: <Square size={16} />, label: 'Rectangle' },
  { id: 'circle', icon: <Circle size={16} />, label: 'Circle' },
  { id: 'triangle', icon: <Triangle size={16} />, label: 'Triangle' },
  { id: 'line', icon: <Minus size={16} />, label: 'Line' },
  { id: 'arrow', icon: <ArrowRight size={16} />, label: 'Arrow' },
];

export const ToolPanel: React.FC = () => {
  const {
    activeTool, setActiveTool, activeShapeType, setActiveShapeType,
    zoom, setZoom, showGrid, setShowGrid, addLayer, document: doc,
    triggerFitToScreen
  } = useCanvasStore();
  const [showShapes, setShowShapes] = useState(false);

  const addTextLayer = () => {
    const layer: TextLayer = {
      id: uuidv4(),
      type: 'text',
      name: 'Text',
      visible: true,
      locked: false,
      opacity: 100,
      x: doc.width / 2 - 100,
      y: doc.height / 2 - 20,
      width: 200,
      height: 50,
      rotation: 0,
      blendMode: 'normal',
      text: 'Double-click to edit',
      fontSize: 24,
      fontFamily: 'Arial',
      fontStyle: 'normal',
      fill: '#1a1a2e',
      align: 'center',
      letterSpacing: 0,
      lineHeight: 1.2,
      stroke: '',
      strokeWidth: 0,
    };
    addLayer(layer);
  };

  const addShapeLayer = (shapeType: ShapeType) => {
    const layer: ShapeLayer = {
      id: uuidv4(),
      type: 'shape',
      name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`,
      visible: true,
      locked: false,
      opacity: 100,
      x: doc.width / 2 - 75,
      y: doc.height / 2 - 75,
      width: 150,
      height: 150,
      rotation: 0,
      blendMode: 'normal',
      shapeType,
      fill: '#3b82f6',
      stroke: '#1d4ed8',
      strokeWidth: 2,
      cornerRadius: shapeType === 'rectangle' ? 8 : undefined,
    };
    addLayer(layer);
    setShowShapes(false);
  };

  const addWatermarkLayer = () => {
    const layer: WatermarkLayer = {
      id: uuidv4(),
      type: 'watermark',
      name: 'Watermark',
      visible: true,
      locked: false,
      opacity: 20,
      x: 0,
      y: 0,
      width: 300,
      height: 100,
      rotation: 0,
      blendMode: 'normal',
      watermarkType: 'text',
      text: 'WATERMARK',
      fontSize: 48,
      fontFamily: 'Arial',
      fill: '#000000',
      fontStyle: 'bold',
      position: 'center',
      repeatX: Math.max(3, Math.ceil(doc.width / 400) + 1),
      repeatY: Math.max(3, Math.ceil(doc.height / 300) + 1),
      repeatSpacingX: 100,
      repeatSpacingY: 100,
      angle: -30,
      padding: 0,
    };
    addLayer(layer);
  };

// blur layer creation removed

  const addEmojiLayer = (emoji: string) => {
    const layer: EmojiLayer = {
      id: uuidv4(),
      type: 'emoji',
      name: `Emoji ${emoji}`,
      visible: true,
      locked: false,
      opacity: 100,
      x: doc.width / 2 - 25,
      y: doc.height / 2 - 25,
      width: 60,
      height: 60,
      rotation: 0,
      blendMode: 'normal',
      emoji,
      fontSize: 48,
    };
    addLayer(layer);
  };

  return (
    <div className="w-12 bg-card border-r border-border flex flex-col items-center py-2 gap-1">
      {tools.map((tool) => (
        <Tooltip key={tool.id}>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === tool.id ? 'default' : 'ghost'}
              size="icon"
              className="w-9 h-9"
              onClick={() => {
                if (tool.id === 'text') {
                  addTextLayer();
                  setActiveTool('select');
                } else {
                  setActiveTool(tool.id);
                }
              }}
              aria-label={tool.label}
            >
              {tool.icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{tool.label} ({tool.shortcut})</p>
          </TooltipContent>
        </Tooltip>
      ))}

      <Separator className="my-1 w-8" />

      {/* Shapes */}
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'shape' ? 'default' : 'ghost'}
              size="icon"
              className="w-9 h-9"
              onClick={() => setShowShapes(!showShapes)}
              aria-label="Add Shape"
            >
              <Square size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Shapes (R)</p>
          </TooltipContent>
        </Tooltip>
        {showShapes && (
          <div className="absolute left-11 top-0 z-50 bg-popover border border-border rounded-md shadow-lg p-1 flex flex-col gap-1">
            {shapes.map((shape) => (
              <Button
                key={shape.id}
                variant="ghost"
                size="sm"
                className="justify-start gap-2 text-xs"
                onClick={() => addShapeLayer(shape.id)}
              >
                {shape.icon}
                {shape.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <Separator className="my-1 w-8" />

      {/* Watermark */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9"
            onClick={addWatermarkLayer}
            aria-label="Add Watermark"
          >
            <Stamp size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Add Watermark</p>
        </TooltipContent>
      </Tooltip>

      {/* Emoji */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9"
            onClick={() => addEmojiLayer('😀')}
            aria-label="Add Emoji"
          >
            <Smile size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Add Emoji</p>
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      <Separator className="my-1 w-8" />

      {/* Grid toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={showGrid ? 'default' : 'ghost'}
            size="icon"
            className="w-9 h-9"
            onClick={() => setShowGrid(!showGrid)}
            aria-label="Toggle Grid"
          >
            <Grid3X3 size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Toggle Grid</p>
        </TooltipContent>
      </Tooltip>

      {/* Zoom controls */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9"
            onClick={() => setZoom(zoom + 0.1)}
            aria-label="Zoom In"
          >
            <ZoomIn size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Zoom In (+)</p>
        </TooltipContent>
      </Tooltip>

      <span className="text-[10px] text-muted-foreground font-mono">
        {Math.round(zoom * 100)}%
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9"
            onClick={() => setZoom(zoom - 0.1)}
            aria-label="Zoom Out"
          >
            <ZoomOut size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Zoom Out (-)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9"
            onClick={() => triggerFitToScreen()}
            aria-label="Fit to Screen"
          >
            <Maximize size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Reset Zoom (Ctrl+0)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
