import type { Layer, Template, CanvasDocument, ExportSettings, ImageLayer } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const IMAGE_PLACEHOLDER = '__IMAGE_PLACEHOLDER__';

export function documentToTemplate(
  doc: CanvasDocument,
  name: string,
  description: string,
  exportSettings: ExportSettings
): Template {
  const layers = JSON.parse(JSON.stringify(doc.layers)) as Layer[];

  // Find the bottom-most image layer to use as the placeholder
  const placeholderLayer = layers.find(l => l.type === 'image');
  
  if (placeholderLayer) {
    (placeholderLayer as ImageLayer).src = IMAGE_PLACEHOLDER;
    (placeholderLayer as ImageLayer).originalSrc = IMAGE_PLACEHOLDER;
  }

  return {
    version: '1.0.0',
    name,
    description,
    canvasWidth: doc.width,
    canvasHeight: doc.height,
    background: doc.background,
    layers,
    exportSettings,
    createdAt: new Date().toISOString(),
  };
}

export function templateToDocument(template: Template): CanvasDocument {
  return {
    id: uuidv4(),
    name: template.name,
    width: template.canvasWidth,
    height: template.canvasHeight,
    background: template.background,
    layers: JSON.parse(JSON.stringify(template.layers)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getImagePlaceholderLayers(layers: Layer[]): ImageLayer[] {
  return layers.filter(
    (l): l is ImageLayer =>
      l.type === 'image' && l.src === IMAGE_PLACEHOLDER
  );
}

export function applyImagesToTemplate(
  template: Template,
  images: { src: string; originalSrc: string; width?: number; height?: number }[],
  mode?: 'fit' | 'fill'
): Layer[] {
  const layers = JSON.parse(JSON.stringify(template.layers)) as Layer[];
  let imageIndex = 0;

  layers.forEach((l) => {
    if (
      l.type === 'image' &&
      (l as ImageLayer).src === IMAGE_PLACEHOLDER &&
      imageIndex < images.length
    ) {
      const layer = l as ImageLayer;
      const imgData = images[imageIndex];
      layer.src = imgData.src;
      layer.originalSrc = imgData.originalSrc;

      if (mode && imgData.width && imgData.height) {
        const aspectTarget = layer.width / layer.height;
        const aspectSrc = imgData.width / imgData.height;
        let targetW = layer.width;
        let targetH = layer.height;

        if (mode === 'fit') {
          if (aspectSrc > aspectTarget) {
            targetW = layer.width;
            targetH = layer.width / aspectSrc;
          } else {
            targetH = layer.height;
            targetW = layer.height * aspectSrc;
          }
        } else if (mode === 'fill') {
          if (aspectSrc > aspectTarget) {
            targetH = layer.height;
            targetW = layer.height * aspectSrc;
          } else {
            targetW = layer.width;
            targetH = layer.width / aspectSrc;
          }
        }

        layer.x += (layer.width - targetW) / 2;
        layer.y += (layer.height - targetH) / 2;
        layer.width = targetW;
        layer.height = targetH;
      }

      imageIndex++;
    }
  });

  return layers;
}

export function exportTemplateAsJSON(template: Template): string {
  return JSON.stringify(template, null, 2);
}

export function parseTemplateJSON(json: string): Template | null {
  try {
    const parsed = JSON.parse(json) as Template;
    if (
      !parsed.version ||
      !parsed.canvasWidth ||
      !parsed.canvasHeight ||
      !Array.isArray(parsed.layers)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveTemplateToStorage(template: Template): void {
  const stored = getStoredTemplates();
  stored.unshift(template);
  if (stored.length > 20) stored.pop();
  localStorage.setItem('stampify-templates', JSON.stringify(stored));
}

export function getStoredTemplates(): Template[] {
  try {
    const raw = localStorage.getItem('stampify-templates');
    if (!raw) return [];
    return JSON.parse(raw) as Template[];
  } catch {
    return [];
  }
}
