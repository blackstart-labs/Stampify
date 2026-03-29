import Konva from 'konva';
import { saveAs } from 'file-saver';
import type { ExportSettings, Layer, ImageLayer } from '@/types';
import { loadImage } from './imageUtils';

export function exportStage(
  stage: Konva.Stage,
  settings: ExportSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const mimeType =
        settings.format === 'jpeg'
          ? 'image/jpeg'
          : settings.format === 'webp'
          ? 'image/webp'
          : 'image/png';

      const dataUrl = stage.toDataURL({
        pixelRatio: settings.scale,
        mimeType,
        quality: settings.quality / 100,
      });

      fetch(dataUrl)
        .then((res) => res.blob())
        .then(resolve)
        .catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

export async function downloadExport(
  stage: Konva.Stage,
  settings: ExportSettings,
  filename: string
): Promise<void> {
  const blob = await exportStage(stage, settings);
  const ext = settings.format;
  saveAs(blob, `${filename}.${ext}`);
}

/**
 * Extracts a pixel-perfect image from the visible React-Konva stage.
 * It perfectly sizes the viewport, removes UI elements, captures, and restores.
 */
export async function exportVisibleStage(
  stage: Konva.Stage,
  docWidth: number,
  docHeight: number,
  settings: ExportSettings
): Promise<Blob> {
  // 1. Save original viewport state
  const oldWidth = stage.width();
  const oldHeight = stage.height();
  const oldScaleX = stage.scaleX();
  const oldScaleY = stage.scaleY();
  const oldPosition = stage.position();

  // 2. Hide UI elements (Shadow, Grid, Checkerboard, Transformers)
  const nodesToHide = stage.find('.canvas-shadow, .checkerboard, .grid-line, Transformer');
  const visibilityMap = new Map<Konva.Node, boolean>();
  
  nodesToHide.forEach(node => {
    visibilityMap.set(node, node.visible());
    node.hide();
  });

  // 3. Temporarily set Stage to exact Document Size
  stage.width(docWidth);
  stage.height(docHeight);
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });

  // 4. Force redraw and wait a tiny bit to ensure frames compute
  stage.draw();
  await new Promise(r => setTimeout(r, 100));

  const mimeType =
    settings.format === 'jpeg'
      ? 'image/jpeg'
      : settings.format === 'webp'
      ? 'image/webp'
      : 'image/png';

  try {
    // 5. Capture Data URL
    const dataUrl = stage.toDataURL({
      pixelRatio: settings.scale,
      mimeType,
      quality: settings.quality / 100,
    });

    // 6. Restore viewport immediately
    stage.width(oldWidth);
    stage.height(oldHeight);
    stage.scale({ x: oldScaleX, y: oldScaleY });
    stage.position(oldPosition);
    
    nodesToHide.forEach(node => {
      const wasVisible = visibilityMap.get(node);
      if (wasVisible !== false) node.show();
    });
    stage.draw();

    // 7. Convert to Blob
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch (err) {
    // Make sure we always restore even if CORS fails
    stage.width(oldWidth);
    stage.height(oldHeight);
    stage.scale({ x: oldScaleX, y: oldScaleY });
    stage.position(oldPosition);
    nodesToHide.forEach(node => node.show());
    stage.draw();
    throw err;
  }
}
