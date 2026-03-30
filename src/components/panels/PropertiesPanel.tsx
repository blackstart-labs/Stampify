import React, { useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
} from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import type {
  Layer, ImageLayer, TextLayer, ShapeLayer,
  WatermarkLayer, EmojiLayer, WatermarkPosition,
} from '@/types';

const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
  'Courier New', 'Verdana', 'Impact', 'Comic Sans MS',
  'Trebuchet MS', 'Palatino Linotype',
];

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay',
  'darken', 'lighten', 'color-dodge', 'color-burn',
  'hard-light', 'soft-light', 'difference', 'exclusion',
];

const EMOJI_LIST = [
  '😀', '😂', '🥰', '😎', '🤔', '😢', '😡', '🥳',
  '👍', '👎', '👏', '🙌', '💪', '🤝', '✌️', '🤟',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '⭐', '🌟', '💫', '✨', '🔥', '💧', '🌈', '☀️',
  '🎉', '🎊', '🎁', '🏆', '🥇', '🎯', '🚀', '💎',
  '✅', '❌', '⚠️', '📌', '🔒', '🔑', '💡', '📷',
];

const ColorPickerField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <Label className="text-xs">{label}</Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-8 h-8 p-0 border-2" aria-label={`Pick ${label}`}>
          <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: value || 'transparent' }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" side="left">
        <HexColorPicker color={value || '#000000'} onChange={onChange} />
        <Input
          className="mt-2 h-7 text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </PopoverContent>
    </Popover>
  </div>
);

const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, value, onChange, min, max, step = 1 }) => (
  <div className="flex items-center justify-between gap-2">
    <Label className="text-xs flex-shrink-0">{label}</Label>
    <Input
      type="number"
      className="h-7 text-xs w-20"
      value={Number.isNaN(value) ? '' : value}
      onFocus={(e) => e.target.select()}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
  </div>
);

const SliderField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}> = ({ label, value, onChange, min, max, step = 1 }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <span className="text-[10px] text-muted-foreground font-mono">{value}</span>
    </div>
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min}
      max={max}
      step={step}
    />
  </div>
);

export const PropertiesPanel: React.FC = () => {
  const { document: doc, selectedLayerIds, updateLayer, saveToHistory } = useCanvasStore();

  const selectedLayers = doc.layers.filter((l) => selectedLayerIds.includes(l.id));
  const layer = selectedLayers.length === 1 ? selectedLayers[0] : null;

  const update = useCallback(
    (updates: Partial<Layer>) => {
      if (layer) {
        updateLayer(layer.id, updates);
      }
    },
    [layer, updateLayer]
  );

  const updateWithHistory = useCallback(
    (updates: Partial<Layer>) => {
      saveToHistory();
      update(updates);
    },
    [update, saveToHistory]
  );

  if (selectedLayers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <p className="text-sm text-muted-foreground">Select a layer to edit properties</p>
        <p className="text-xs text-muted-foreground mt-1">Click on a layer in the canvas or layer panel</p>
      </div>
    );
  }

  // Multi-select: show alignment tools
  if (selectedLayers.length > 1) {
    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            {selectedLayers.length} Layers Selected
          </h3>
          <Separator />
          <div>
            <Label className="text-xs mb-2 block">Alignment</Label>
            <div className="grid grid-cols-3 gap-1">
              <Button variant="outline" size="icon" className="w-8 h-8" aria-label="Align Left"
                onClick={() => {
                  saveToHistory();
                  const minX = Math.min(...selectedLayers.map((l) => l.x));
                  selectedLayers.forEach((l) => updateLayer(l.id, { x: minX }));
                }}>
                <AlignStartVertical size={14} />
              </Button>
              <Button variant="outline" size="icon" className="w-8 h-8" aria-label="Align Center X"
                onClick={() => {
                  saveToHistory();
                  const avgX = selectedLayers.reduce((s, l) => s + l.x + l.width / 2, 0) / selectedLayers.length;
                  selectedLayers.forEach((l) => updateLayer(l.id, { x: avgX - l.width / 2 }));
                }}>
                <AlignCenterVertical size={14} />
              </Button>
              <Button variant="outline" size="icon" className="w-8 h-8" aria-label="Align Right"
                onClick={() => {
                  saveToHistory();
                  const maxR = Math.max(...selectedLayers.map((l) => l.x + l.width));
                  selectedLayers.forEach((l) => updateLayer(l.id, { x: maxR - l.width }));
                }}>
                <AlignEndVertical size={14} />
              </Button>
              <Button variant="outline" size="icon" className="w-8 h-8" aria-label="Align Top"
                onClick={() => {
                  saveToHistory();
                  const minY = Math.min(...selectedLayers.map((l) => l.y));
                  selectedLayers.forEach((l) => updateLayer(l.id, { y: minY }));
                }}>
                <AlignStartHorizontal size={14} />
              </Button>
              <Button variant="outline" size="icon" className="w-8 h-8" aria-label="Align Center Y"
                onClick={() => {
                  saveToHistory();
                  const avgY = selectedLayers.reduce((s, l) => s + l.y + l.height / 2, 0) / selectedLayers.length;
                  selectedLayers.forEach((l) => updateLayer(l.id, { y: avgY - l.height / 2 }));
                }}>
                <AlignCenterHorizontal size={14} />
              </Button>
              <Button variant="outline" size="icon" className="w-8 h-8" aria-label="Align Bottom"
                onClick={() => {
                  saveToHistory();
                  const maxB = Math.max(...selectedLayers.map((l) => l.y + l.height));
                  selectedLayers.forEach((l) => updateLayer(l.id, { y: maxB - l.height }));
                }}>
                <AlignEndHorizontal size={14} />
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    );
  }

  if (!layer) return null;

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Common properties */}
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Properties</h3>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                className="h-7 text-xs mt-0.5"
                value={layer.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>

            <SliderField label="Opacity" value={layer.opacity} onChange={(v) => update({ opacity: v })} min={0} max={100} />

            <div className="flex items-center justify-between">
              <Label className="text-xs">Blend Mode</Label>
              <Select value={layer.blendMode} onValueChange={(v) => update({ blendMode: v })}>
                <SelectTrigger className="h-7 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLEND_MODES.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumberField label="X" value={Math.round(layer.x)} onChange={(v) => update({ x: v })} />
              <NumberField label="Y" value={Math.round(layer.y)} onChange={(v) => update({ y: v })} />
              <NumberField label="W" value={Math.round(layer.width)} onChange={(v) => update({ width: v })} min={1} />
              <NumberField label="H" value={Math.round(layer.height)} onChange={(v) => update({ height: v })} min={1} />
            </div>

            <NumberField label="Rotation" value={Math.round(layer.rotation)} onChange={(v) => update({ rotation: v })} min={-360} max={360} />
          </div>
        </div>

        <div>
          <Label className="text-xs mb-2 block">Align to Canvas</Label>
          <div className="grid grid-cols-6 gap-1">
            <Button variant="outline" size="icon" className="h-8 w-full" onClick={() => updateWithHistory({ x: 0 })} aria-label="Align Left"><AlignStartVertical size={14} /></Button>
            <Button variant="outline" size="icon" className="h-8 w-full" onClick={() => updateWithHistory({ x: doc.width / 2 - layer.width / 2 })} aria-label="Center Horizontally"><AlignCenterVertical size={14} /></Button>
            <Button variant="outline" size="icon" className="h-8 w-full" onClick={() => updateWithHistory({ x: doc.width - layer.width })} aria-label="Align Right"><AlignEndVertical size={14} /></Button>
            <Button variant="outline" size="icon" className="h-8 w-full" onClick={() => updateWithHistory({ y: 0 })} aria-label="Align Top"><AlignStartHorizontal size={14} /></Button>
            <Button variant="outline" size="icon" className="h-8 w-full" onClick={() => updateWithHistory({ y: doc.height / 2 - layer.height / 2 })} aria-label="Center Vertically"><AlignCenterHorizontal size={14} /></Button>
            <Button variant="outline" size="icon" className="h-8 w-full" onClick={() => updateWithHistory({ y: doc.height - layer.height })} aria-label="Align Bottom"><AlignEndHorizontal size={14} /></Button>
          </div>
        </div>

        <Separator />

        {/* Type-specific properties */}
        {layer.type === 'image' && <ImageProperties layer={layer} update={updateWithHistory} />}
        {layer.type === 'text' && <TextProperties layer={layer} update={updateWithHistory} />}
        {layer.type === 'shape' && <ShapeProperties layer={layer} update={updateWithHistory} />}
        {layer.type === 'watermark' && <WatermarkProperties layer={layer} update={updateWithHistory} />}
        {/* blur properties removed */}
        {layer.type === 'emoji' && <EmojiProperties layer={layer} update={updateWithHistory} />}
      </div>
    </ScrollArea>
  );
};

const ImageProperties: React.FC<{ layer: ImageLayer; update: (u: Partial<ImageLayer>) => void }> = ({ layer, update }) => (
  <div className="space-y-3">
    <h4 className="text-xs font-semibold uppercase text-muted-foreground">Image Adjustments</h4>
    <SliderField label="Brightness" value={layer.filters.brightness} onChange={(v) => update({ filters: { ...layer.filters, brightness: v } })} min={-100} max={100} />
    <SliderField label="Contrast" value={layer.filters.contrast} onChange={(v) => update({ filters: { ...layer.filters, contrast: v } })} min={-100} max={100} />
    <SliderField label="Saturation" value={layer.filters.saturation} onChange={(v) => update({ filters: { ...layer.filters, saturation: v } })} min={-100} max={100} />
    <SliderField label="Blur" value={layer.filters.blur} onChange={(v) => update({ filters: { ...layer.filters, blur: v } })} min={0} max={20} step={0.5} />

    <Separator />
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Grayscale</Label>
        <Switch checked={layer.filters.grayscale} onCheckedChange={(v) => update({ filters: { ...layer.filters, grayscale: v } })} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Sepia</Label>
        <Switch checked={layer.filters.sepia} onCheckedChange={(v) => update({ filters: { ...layer.filters, sepia: v } })} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Invert</Label>
        <Switch checked={layer.filters.invert} onCheckedChange={(v) => update({ filters: { ...layer.filters, invert: v } })} />
      </div>
    </div>
  </div>
);

const TextProperties: React.FC<{ layer: TextLayer; update: (u: Partial<TextLayer>) => void }> = ({ layer, update }) => (
  <div className="space-y-3">
    <h4 className="text-xs font-semibold uppercase text-muted-foreground">Text</h4>
    <div>
      <Label className="text-xs">Content</Label>
      <textarea
        className="w-full mt-0.5 rounded-md border border-input bg-background px-2 py-1 text-xs min-h-[60px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
        value={layer.text}
        onChange={(e) => update({ text: e.target.value })}
      />
    </div>

    <div className="flex items-center justify-between">
      <Label className="text-xs">Font</Label>
      <Select value={layer.fontFamily} onValueChange={(v) => update({ fontFamily: v })}>
        <SelectTrigger className="h-7 text-xs w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((f) => (
            <SelectItem key={f} value={f} className="text-xs" style={{ fontFamily: f }}>{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <NumberField label="Font Size" value={layer.fontSize} onChange={(v) => update({ fontSize: v })} min={1} max={500} />

    <div className="flex gap-1">
      <Button
        variant={layer.fontStyle.includes('bold') ? 'default' : 'outline'}
        size="icon" className="w-8 h-8"
        onClick={() => {
          const isBold = layer.fontStyle.includes('bold');
          const isItalic = layer.fontStyle.includes('italic');
          let style: TextLayer['fontStyle'] = 'normal';
          if (!isBold && isItalic) style = 'bold italic';
          else if (!isBold) style = 'bold';
          else if (isItalic) style = 'italic';
          update({ fontStyle: style });
        }}
        aria-label="Bold"
      >
        <Bold size={14} />
      </Button>
      <Button
        variant={layer.fontStyle.includes('italic') ? 'default' : 'outline'}
        size="icon" className="w-8 h-8"
        onClick={() => {
          const isBold = layer.fontStyle.includes('bold');
          const isItalic = layer.fontStyle.includes('italic');
          let style: TextLayer['fontStyle'] = 'normal';
          if (isBold && !isItalic) style = 'bold italic';
          else if (!isItalic) style = 'italic';
          else if (isBold) style = 'bold';
          update({ fontStyle: style });
        }}
        aria-label="Italic"
      >
        <Italic size={14} />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-8" />
      <Button variant={layer.align === 'left' ? 'default' : 'outline'} size="icon" className="w-8 h-8"
        onClick={() => update({ align: 'left' })} aria-label="Align Left">
        <AlignLeft size={14} />
      </Button>
      <Button variant={layer.align === 'center' ? 'default' : 'outline'} size="icon" className="w-8 h-8"
        onClick={() => update({ align: 'center' })} aria-label="Align Center">
        <AlignCenter size={14} />
      </Button>
      <Button variant={layer.align === 'right' ? 'default' : 'outline'} size="icon" className="w-8 h-8"
        onClick={() => update({ align: 'right' })} aria-label="Align Right">
        <AlignRight size={14} />
      </Button>
    </div>

    <ColorPickerField label="Text Color" value={layer.fill} onChange={(v) => update({ fill: v })} />
    <ColorPickerField label="Stroke Color" value={layer.stroke} onChange={(v) => update({ stroke: v })} />
    <NumberField label="Stroke Width" value={layer.strokeWidth} onChange={(v) => update({ strokeWidth: v })} min={0} max={20} />
    <NumberField label="Letter Spacing" value={layer.letterSpacing} onChange={(v) => update({ letterSpacing: v })} min={-10} max={50} />
    <SliderField label="Line Height" value={layer.lineHeight} onChange={(v) => update({ lineHeight: v })} min={0.5} max={3} step={0.1} />
  </div>
);

const ShapeProperties: React.FC<{ layer: ShapeLayer; update: (u: Partial<ShapeLayer>) => void }> = ({ layer, update }) => (
  <div className="space-y-3">
    <h4 className="text-xs font-semibold uppercase text-muted-foreground">Shape</h4>
    <div className="flex items-center justify-between">
      <Label className="text-xs">Type</Label>
      <Select value={layer.shapeType} onValueChange={(v) => update({ shapeType: v as ShapeLayer['shapeType'] })}>
        <SelectTrigger className="h-7 text-xs w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="rectangle" className="text-xs">Rectangle</SelectItem>
          <SelectItem value="circle" className="text-xs">Circle</SelectItem>
          <SelectItem value="triangle" className="text-xs">Triangle</SelectItem>
          <SelectItem value="line" className="text-xs">Line</SelectItem>
          <SelectItem value="arrow" className="text-xs">Arrow</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <ColorPickerField label="Fill" value={layer.fill} onChange={(v) => update({ fill: v })} />
    <ColorPickerField label="Stroke" value={layer.stroke} onChange={(v) => update({ stroke: v })} />
    <NumberField label="Stroke Width" value={layer.strokeWidth} onChange={(v) => update({ strokeWidth: v })} min={0} max={50} />
    {layer.shapeType === 'rectangle' && (
      <NumberField label="Corner Radius" value={layer.cornerRadius || 0} onChange={(v) => update({ cornerRadius: v })} min={0} max={200} />
    )}
  </div>
);

const POSITION_GRID: { pos: WatermarkPosition; label: string }[] = [
  { pos: 'top-left', label: '↖' },
  { pos: 'top-center', label: '↑' },
  { pos: 'top-right', label: '↗' },
  { pos: 'center-left', label: '←' },
  { pos: 'center', label: '◉' },
  { pos: 'center-right', label: '→' },
  { pos: 'bottom-left', label: '↙' },
  { pos: 'bottom-center', label: '↓' },
  { pos: 'bottom-right', label: '↘' },
];

const WatermarkProperties: React.FC<{ layer: WatermarkLayer; update: (u: Partial<WatermarkLayer>) => void }> = ({ layer, update }) => {
  const handleWatermarkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      update({ watermarkType: 'image', src: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Watermark</h4>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Type</Label>
        <Select value={layer.watermarkType} onValueChange={(v) => update({ watermarkType: v as 'text' | 'image' })}>
          <SelectTrigger className="h-7 text-xs w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text" className="text-xs">Text</SelectItem>
            <SelectItem value="image" className="text-xs">Image</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {layer.watermarkType === 'text' ? (
        <>
          <div>
            <Label className="text-xs">Text</Label>
            <Input className="h-7 text-xs mt-0.5" value={layer.text || ''} onChange={(e) => update({ text: e.target.value })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Font</Label>
            <Select value={layer.fontFamily || 'Arial'} onValueChange={(v) => update({ fontFamily: v })}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumberField label="Font Size" value={layer.fontSize || 24} onChange={(v) => update({ fontSize: v })} min={8} max={200} />
          <ColorPickerField label="Color" value={layer.fill || '#ffffff'} onChange={(v) => update({ fill: v })} />
        </>
      ) : (
        <div>
          <Label className="text-xs">Watermark Image</Label>
          <Input type="file" accept="image/*" className="h-7 text-xs mt-0.5" onChange={handleWatermarkImageUpload} />
        </div>
      )}

      <Separator />

      <div>
        <Label className="text-xs mb-1 block">Position</Label>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {POSITION_GRID.map(({ pos, label }) => (
            <Button
              key={pos}
              variant={layer.position === pos ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => update({ position: pos })}
            >
              {label}
            </Button>
          ))}
        </div>
        <Button
          variant={layer.position === 'free' ? 'default' : 'outline'}
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => update({ position: 'free' })}
        >
          Free Position
        </Button>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Repeat X" value={layer.repeatX} onChange={(v) => update({ repeatX: Math.max(1, v) })} min={1} max={20} />
        <NumberField label="Repeat Y" value={layer.repeatY} onChange={(v) => update({ repeatY: Math.max(1, v) })} min={1} max={20} />
      </div>

      <SliderField label="Spacing X" value={layer.repeatSpacingX} onChange={(v) => update({ repeatSpacingX: v })} min={0} max={500} />
      <SliderField label="Spacing Y" value={layer.repeatSpacingY} onChange={(v) => update({ repeatSpacingY: v })} min={0} max={500} />
      <SliderField label="Rotation" value={layer.angle} onChange={(v) => update({ angle: v })} min={-180} max={180} />
      <NumberField label="Edge Padding" value={layer.padding} onChange={(v) => update({ padding: v })} min={0} max={500} />
    </div>
  );
};

// BlurProperties removed

const EmojiProperties: React.FC<{ layer: EmojiLayer; update: (u: Partial<EmojiLayer>) => void }> = ({ layer, update }) => (
  <div className="space-y-3">
    <h4 className="text-xs font-semibold uppercase text-muted-foreground">Emoji</h4>
    <NumberField label="Size" value={layer.fontSize} onChange={(v) => update({ fontSize: v })} min={12} max={500} />
    <div>
      <Label className="text-xs mb-1 block">Pick Emoji</Label>
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJI_LIST.map((emoji) => (
          <Button
            key={emoji}
            variant={layer.emoji === emoji ? 'default' : 'ghost'}
            size="sm"
            className="w-8 h-8 text-base p-0"
            onClick={() => update({ emoji, name: `Emoji ${emoji}` })}
          >
            {emoji}
          </Button>
        ))}
      </div>
    </div>
  </div>
);
