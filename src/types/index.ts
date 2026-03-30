export type LayerType = 'image' | 'text' | 'shape' | 'watermark' | 'blur' | 'emoji';

export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
}

export type WatermarkPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'free';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';

export interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  blendMode: string;
  isMask?: boolean;
  clippedToId?: string;
  cornerRadius?: number;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  originalSrc: string;
  filters: ImageFilters;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
  fill: string;
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
  lineHeight: number;
  stroke: string;
  strokeWidth: number;
}

export interface WatermarkLayer extends BaseLayer {
  type: 'watermark';
  watermarkType: 'text' | 'image';
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  fontStyle?: string;
  src?: string;
  position: WatermarkPosition;
  repeatX: number;
  repeatY: number;
  repeatSpacingX: number;
  repeatSpacingY: number;
  angle: number;
  padding: number;
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeType: ShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

// BlurLayer removed

export interface EmojiLayer extends BaseLayer {
  type: 'emoji';
  emoji: string;
  fontSize: number;
}

export type Layer = ImageLayer | TextLayer | WatermarkLayer | ShapeLayer | EmojiLayer;

export interface ImageFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  grayscale: boolean;
  sepia: boolean;
  invert: boolean;
}

export interface CanvasDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  layers: Layer[];
  guides?: Guide[];
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  version: string;
  name: string;
  description: string;
  canvasWidth: number;
  canvasHeight: number;
  background: string;
  layers: Layer[];
  exportSettings: ExportSettings;
  createdAt: string;
}

export interface ExportSettings {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  scale: number;
  includeBackground: boolean;
}

export type ToolType = 'select' | 'text' | 'shape' | 'crop' | 'pan';

export const DEFAULT_IMAGE_FILTERS: ImageFilters = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  grayscale: false,
  sepia: false,
  invert: false,
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'png',
  quality: 90,
  scale: 1,
  includeBackground: true,
};
