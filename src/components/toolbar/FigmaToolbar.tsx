import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  MousePointer2, Type, Square, Circle, Minus, ArrowRight, Triangle,
  Hand, Stamp, Smile, ChevronDown, Plus, RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCanvasStore } from '@/store/canvasStore';
import type {
  ToolType, ShapeType, TextLayer, ShapeLayer,
  WatermarkLayer, EmojiLayer
} from '@/types';

const tools: { id: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: <Hand size={18} />, label: 'Hand', shortcut: 'H' },
];

const shapes: { id: ShapeType; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: 'rectangle', icon: <Square size={16} />, label: 'Rectangle', shortcut: 'R' },
  { id: 'circle', icon: <Circle size={16} />, label: 'Circle', shortcut: 'O' },
  { id: 'triangle', icon: <Triangle size={16} />, label: 'Triangle', shortcut: '' },
  { id: 'line', icon: <Minus size={16} />, label: 'Line', shortcut: 'L' },
  { id: 'arrow', icon: <ArrowRight size={16} />, label: 'Arrow', shortcut: 'Shift+L' },
];

export const FigmaToolbar: React.FC = () => {
  const {
    activeTool, setActiveTool, document: doc, addLayer
  } = useCanvasStore();
  
  const [activeShape, setActiveShape] = useState<ShapeType>('rectangle');

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
    setActiveTool('select');
  };

  const addShapeLayer = (shapeType: ShapeType) => {
    setActiveShape(shapeType);
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
    setActiveTool('select');
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
    setActiveTool('select');
  };

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
    setActiveTool('select');
  };

  const currentShapeIcon = shapes.find(s => s.id === activeShape)?.icon || <Square size={18} />;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-[#1e1e1e]/95 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl p-1.5 flex items-center gap-1.5">
        {/* Pointer Group */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'select' ? 'secondary' : 'ghost'}
                size="icon"
                className={`w-9 h-9 rounded-xl ${activeTool === 'select' ? 'bg-blue-600 hover:bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => setActiveTool('select')}
              >
                <MousePointer2 size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Select (V)</p></TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 bg-neutral-800" />

        {/* Hand tool */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'pan' ? 'secondary' : 'ghost'}
              size="icon"
              className={`w-9 h-9 rounded-xl ${activeTool === 'pan' ? 'bg-blue-600 hover:bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
              onClick={() => setActiveTool('pan')}
            >
              <Hand size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top"><p>Hand (H)</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-neutral-800" />

        {/* Shapes Group */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-xl text-neutral-400 hover:text-white"
                  onClick={() => addShapeLayer(activeShape)}
                >
                  {currentShapeIcon}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-4 h-9 -ml-1 text-neutral-500 hover:text-white rounded-r-xl">
                      <ChevronDown size={12} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-neutral-900 border-neutral-800 text-neutral-200 min-w-[150px]">
                    {shapes.map((shape) => (
                      <DropdownMenuItem
                        key={shape.id}
                        className="gap-2 focus:bg-neutral-800 focus:text-white cursor-pointer"
                        onClick={() => addShapeLayer(shape.id)}
                      >
                        {shape.icon}
                        <span className="flex-1">{shape.label}</span>
                        <span className="text-[10px] text-neutral-500">{shape.shortcut}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Shapes</p></TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 bg-neutral-800" />

        {/* Text Tool */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-xl text-neutral-400 hover:text-white"
              onClick={addTextLayer}
            >
              <Type size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top"><p>Text (T)</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-neutral-800" />

        {/* Resources Dropdown (Watermark, Emoji) */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl text-neutral-400 hover:text-white">
                  <Plus size={18} />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Resources</p></TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="center" className="bg-neutral-900 border-neutral-800 text-neutral-200 min-w-[150px]">
            <DropdownMenuItem
              className="gap-2 focus:bg-neutral-800 focus:text-white cursor-pointer"
              onClick={addWatermarkLayer}
            >
              <Stamp size={16} />
              <span>Add Watermark</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 focus:bg-neutral-800 focus:text-white cursor-pointer"
              onClick={() => {
                const selected = useCanvasStore.getState().selectedLayerIds;
                selected.forEach(id => {
                  const layer = useCanvasStore.getState().document.layers.find(l => l.id === id);
                  if (layer) {
                    useCanvasStore.getState().updateLayer(id, { rotation: (layer.rotation + 90) % 360 });
                  }
                });
              }}
            >
              <RotateCw size={16} />
              <span>Rotate 90°</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 focus:bg-neutral-800 focus:text-white cursor-pointer"
              onClick={() => addEmojiLayer('😀')}
            >
              <Smile size={16} />
              <span>Add Emoji</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

