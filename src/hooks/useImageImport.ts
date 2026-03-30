/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCanvasStore } from '@/store/canvasStore';
import { fileToBase64, urlToBase64, blobToBase64, getImageDimensions, fitImageToCanvas } from '@/utils/imageUtils';
import type { ImageLayer } from '@/types';

export function useImageImport() {
  const { document, addLayer, hasActiveProject, initFromImage } = useCanvasStore();

  const createImageLayer = useCallback(
    async (src: string, name: string = 'Image', forcedDims?: { width: number, height: number }): Promise<ImageLayer> => {
      const dims = forcedDims || await getImageDimensions(src);
      const fit = fitImageToCanvas(dims.width, dims.height, document.width, document.height);

      return {
        id: uuidv4(),
        type: 'image',
        name,
        visible: true,
        locked: false,
        opacity: 100,
        x: fit.x,
        y: fit.y,
        width: fit.width,
        height: fit.height,
        rotation: 0,
        blendMode: 'normal',
        src,
        originalSrc: src,
        filters: {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          hue: 0,
          blur: 0,
          grayscale: false,
          sepia: false,
          invert: false,
        },
      };
    },
    [document.width, document.height]
  );

  const importFromFiles = useCallback(
    async (files: File[]) => {
      let currentHasActiveProject = useCanvasStore.getState().hasActiveProject;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const base64 = await fileToBase64(file);
        const name = file.name.replace(/\.[^.]+$/, '');
        
        if (!currentHasActiveProject && i === 0) {
          const dims = await getImageDimensions(base64);
          initFromImage(base64, dims.width, dims.height, name);
          currentHasActiveProject = true;
          useCanvasStore.setState({ hasActiveProject: true });
        } else {
          // Add as layer
          const layer = await createImageLayer(base64, name);
          if (i > 0) {
            layer.x += i * 20;
            layer.y += i * 20;
          }
          addLayer(layer);
        }
      }
    },
    [createImageLayer, addLayer, initFromImage]
  );

  const importFromUrl = useCallback(
    async (url: string) => {
      const base64 = await urlToBase64(url);
      const name = url.split('/').pop()?.split('?')[0] || 'Image';
      const currentHasActiveProject = useCanvasStore.getState().hasActiveProject;
      
      if (!currentHasActiveProject) {
        const dims = await getImageDimensions(base64);
        initFromImage(base64, dims.width, dims.height, name);
      } else {
        const layer = await createImageLayer(base64, name);
        addLayer(layer);
      }
    },
    [createImageLayer, addLayer, initFromImage]
  );

  const importFromClipboard = useCallback(
    async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      let currentHasActiveProject = useCanvasStore.getState().hasActiveProject;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (!blob) continue;
          const base64 = await blobToBase64(blob);
          
          if (!currentHasActiveProject) {
            const dims = await getImageDimensions(base64);
            initFromImage(base64, dims.width, dims.height, 'Pasted Image');
            currentHasActiveProject = true;
          } else {
            const layer = await createImageLayer(base64, 'Pasted Image');
            addLayer(layer);
          }
        }
      }
    },
    [createImageLayer, addLayer, initFromImage]
  );

  return {
    importFromFiles,
    importFromUrl,
    importFromClipboard,
    createImageLayer,
  };
}
