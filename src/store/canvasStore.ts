import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { SnapLine } from '@/utils/snapping';
import type {
  CanvasDocument,
  Layer,
  ExportSettings,
  ToolType,
  ShapeType,
  Guide,
} from '@/types';

import type { Template } from '@/types';

export interface PendingBatchJob {
  template: Template;
  images: { name: string; src: string; width: number; height: number }[];
  scaleMode: 'stretch' | 'fit' | 'fill';
  format: 'png' | 'jpeg' | 'webp';
}

interface CanvasState {
  document: CanvasDocument;
  selectedLayerIds: string[];
  activeTool: ToolType;
  activeShapeType: ShapeType;
  history: CanvasDocument[];
  historyIndex: number;
  exportSettings: ExportSettings;
  zoom: number;
  showGrid: boolean;
  showRulers: boolean;
  isPanning: boolean;
  fitToScreenTrigger: number;
  hasActiveProject: boolean;
  pendingBatchJob: PendingBatchJob | null;
  snapLines: SnapLine[];

  // Actions
  setSnapLines: (lines: SnapLine[]) => void;
  setPendingBatchJob: (job: PendingBatchJob | null) => void;
  initFromImage: (src: string, width: number, height: number, name: string) => void;
  triggerFitToScreen: () => void;
  addLayer: (layer: Layer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  reorderLayers: (ids: string[], targetIndex: number) => void;
  moveLayers: (ids: string[], direction: 'up' | 'down' | 'top' | 'bottom') => void;
  duplicateLayer: (id: string) => void;
  duplicateLayers: (ids: string[]) => void;
  duplicateLayerExact: (id: string) => void;
  setSelectedLayers: (ids: string[]) => void;
  toggleLayerSelection: (id: string) => void;
  setActiveTool: (tool: ToolType) => void;
  setActiveShapeType: (shape: ShapeType) => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  setZoom: (zoom: number) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  resetDocument: (width: number, height: number) => void;
  loadDocument: (doc: CanvasDocument) => void;
  setDocumentBackground: (bg: string) => void;
  setDocumentName: (name: string) => void;
  setIsPanning: (val: boolean) => void;
  setShowGrid: (val: boolean) => void;
  setShowRulers: (val: boolean) => void;
  // Guides
  addGuide: (guide: Guide) => void;
  updateGuide: (id: string, position: number) => void;
  removeGuide: (id: string) => void;
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  moveLayerToTop: (id: string) => void;
  moveLayerToBottom: (id: string) => void;
  createClippingMask: () => void;
  releaseClippingMask: () => void;
}

function createDefaultDocument(): CanvasDocument {
  return {
    id: uuidv4(),
    name: 'Untitled Project',
    width: 1920,
    height: 1080,
    background: '#ffffff',
    layers: [],
    guides: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// const MAX_HISTORY = 50;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  document: createDefaultDocument(),
  hasActiveProject: false,
  pendingBatchJob: null,
  snapLines: [],
  selectedLayerIds: [],
  activeTool: 'select',
  activeShapeType: 'rectangle',
  history: [],
  historyIndex: -1,
  exportSettings: {
    format: 'png',
    quality: 90,
    scale: 1,
    includeBackground: true,
  },
  zoom: 1,
  showGrid: false,
  showRulers: false,
  isPanning: false,
  fitToScreenTrigger: 0,

  setSnapLines: (lines) => set({ snapLines: lines }),

  setPendingBatchJob: (job) => set({ pendingBatchJob: job }),

  triggerFitToScreen: () => set((s) => ({ fitToScreenTrigger: s.fitToScreenTrigger + 1 })),

  addLayer: (layer: Layer) => {
    const state = get();
    state.saveToHistory();
    set((s) => ({
      document: {
        ...s.document,
        layers: [...s.document.layers, layer],
        updatedAt: new Date().toISOString(),
      },
      selectedLayerIds: [layer.id],
    }));
  },

  removeLayer: (id: string) => {
    const state = get();
    state.saveToHistory();
    set((s) => ({
      document: {
        ...s.document,
        layers: s.document.layers.filter((l) => l.id !== id),
        updatedAt: new Date().toISOString(),
      },
      selectedLayerIds: s.selectedLayerIds.filter((sid) => sid !== id),
    }));
  },

  updateLayer: (id: string, updates: Partial<Layer>) => {
    set((s) => ({
      document: {
        ...s.document,
        layers: s.document.layers.map((l) =>
          l.id === id ? { ...l, ...updates } as Layer : l
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  reorderLayers: (ids: string[], targetIndex: number) => {
    const state = get();
    state.saveToHistory();
    set((s) => {
      const allLayers = [...s.document.layers];
      const movingLayers = allLayers.filter(l => ids.includes(l.id));
      const remainingLayers = allLayers.filter(l => !ids.includes(l.id));
      
      const newLayers = [
        ...remainingLayers.slice(0, targetIndex),
        ...movingLayers,
        ...remainingLayers.slice(targetIndex)
      ];
      
      return {
        document: { ...s.document, layers: newLayers, updatedAt: new Date().toISOString() },
      };
    });
  },

  moveLayers: (ids: string[], direction: 'up' | 'down' | 'top' | 'bottom') => {
    const state = get();
    const allLayers = state.document.layers;
    const selectedIndices = ids
      .map(id => allLayers.findIndex(l => l.id === id))
      .filter(i => i !== -1)
      .sort((a, b) => a - b);

    if (selectedIndices.length === 0) return;

    state.saveToHistory();
    set(s => {
      const layers = [...s.document.layers];
      const selectedLayers = selectedIndices.map(i => layers[i]);
      const otherLayers = layers.filter((_, i) => !selectedIndices.includes(i));

      let newLayers = [...layers];

      if (direction === 'top') {
        newLayers = [...otherLayers, ...selectedLayers];
      } else if (direction === 'bottom') {
        newLayers = [...selectedLayers, ...otherLayers];
      } else if (direction === 'up') {
        const lastIndex = selectedIndices[selectedIndices.length - 1];
        if (lastIndex < layers.length - 1) {
          // target index is one above the highest selected index's relative position
          const target = Math.min(layers.length - selectedLayers.length, selectedIndices[0] + 1);
          newLayers = [...otherLayers];
          newLayers.splice(target, 0, ...selectedLayers);
        }
      } else if (direction === 'down') {
        if (selectedIndices[0] > 0) {
          const target = Math.max(0, selectedIndices[0] - 1);
          newLayers = [...otherLayers];
          newLayers.splice(target, 0, ...selectedLayers);
        }
      }

      return {
        document: { ...s.document, layers: newLayers, updatedAt: new Date().toISOString() }
      };
    });
  },

  duplicateLayer: (id: string) => {
    get().duplicateLayers([id]);
  },

  duplicateLayers: (ids: string[]) => {
    const state = get();
    const layersToDuplicate = state.document.layers.filter(l => ids.includes(l.id));
    if (layersToDuplicate.length === 0) return;

    state.saveToHistory();
    const newLayers: Layer[] = layersToDuplicate.map(layer => ({
      ...JSON.parse(JSON.stringify(layer)),
      id: uuidv4(),
      name: `${layer.name} (copy)`,
      x: layer.x + 20,
      y: layer.y + 20,
    }));

    set((s) => ({
      document: {
        ...s.document,
        layers: [...s.document.layers, ...newLayers],
        updatedAt: new Date().toISOString(),
      },
      selectedLayerIds: newLayers.map(l => l.id),
    }));
  },

  duplicateLayerExact: (id: string) => {
    const state = get();
    const layer = state.document.layers.find((l) => l.id === id);
    if (!layer) return;
    state.saveToHistory();
    const newLayer: Layer = {
      ...JSON.parse(JSON.stringify(layer)),
      id: uuidv4(),
      name: `${layer.name} (Alt-copy)`,
      x: layer.x,
      y: layer.y,
    };
    set((s) => {
      const index = s.document.layers.findIndex((l) => l.id === id);
      const newLayers = [...s.document.layers];
      // Insert duplicate just behind the current layer so the dragged layer stays on top
      newLayers.splice(index, 0, newLayer);
      return {
        document: {
          ...s.document,
          layers: newLayers,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  setSelectedLayers: (ids: string[]) => set({ selectedLayerIds: ids }),

  toggleLayerSelection: (id: string) => {
    set((s) => {
      if (s.selectedLayerIds.includes(id)) {
        return { selectedLayerIds: s.selectedLayerIds.filter((sid) => sid !== id) };
      }
      return { selectedLayerIds: [...s.selectedLayerIds, id] };
    });
  },

  setActiveTool: (tool: ToolType) => set({ activeTool: tool }),
  setActiveShapeType: (shape: ShapeType) => set({ activeShapeType: shape }),

  undo: () => {
    set((s) => {
      if (s.historyIndex < 0) return s;
      const doc = s.history[s.historyIndex];
      return {
        document: JSON.parse(JSON.stringify(doc)),
        historyIndex: s.historyIndex - 1,
      };
    });
  },

  redo: () => {
    set((s) => {
      if (s.historyIndex >= s.history.length - 2) return s;
      const doc = s.history[s.historyIndex + 2];
      if (!doc) return s;
      return {
        document: JSON.parse(JSON.stringify(doc)),
        historyIndex: s.historyIndex + 1,
      };
    });
  },

  saveToHistory: () => {
    set((s) => {
      const newHistory = s.history.slice(0, s.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(s.document)));
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  setZoom: (zoom: number) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),

  setExportSettings: (settings: Partial<ExportSettings>) =>
    set((s) => ({ exportSettings: { ...s.exportSettings, ...settings } })),

  resetDocument: (width: number, height: number) => {
    set({
      document: {
        ...createDefaultDocument(),
        width,
        height,
      },
      hasActiveProject: true,
      selectedLayerIds: [],
      history: [],
      historyIndex: -1,
      fitToScreenTrigger: 0,
    });
  },

  loadDocument: (doc: CanvasDocument) =>
    set({
      document: doc,
      hasActiveProject: true,
      selectedLayerIds: [],
      history: [],
      historyIndex: -1,
      fitToScreenTrigger: 0,
    }),

  initFromImage: (src: string, width: number, height: number, name: string) => {
    const layerId = uuidv4();
    set({
      document: {
        id: uuidv4(),
        name,
        width,
        height,
        background: '#ffffff',
        layers: [{
          id: layerId,
          type: 'image',
          name: 'Background Image',
          visible: true,
          locked: false,
          opacity: 100,
          x: 0,
          y: 0,
          width,
          height,
          rotation: 0,
          blendMode: 'normal',
          src: src,
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
        } as never], // TypeScript will infer ImageLayer if type is strict
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      hasActiveProject: true,
      selectedLayerIds: [layerId],
      history: [],
      historyIndex: -1,
      zoom: 1,
      fitToScreenTrigger: 0,
    });
  },

  setDocumentBackground: (bg: string) =>
    set((s) => ({
      document: { ...s.document, background: bg, updatedAt: new Date().toISOString() },
    })),

  setDocumentName: (name: string) =>
    set((s) => ({
      document: { ...s.document, name, updatedAt: new Date().toISOString() },
    })),

  setIsPanning: (val: boolean) => set({ isPanning: val }),
  setShowGrid: (val: boolean) => set({ showGrid: val }),
  setShowRulers: (val: boolean) => set({ showRulers: val }),

  addGuide: (guide: Guide) => {
    const state = get();
    state.saveToHistory();
    set((s) => ({
      document: {
        ...s.document,
        guides: [...(s.document.guides || []), guide],
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  updateGuide: (id: string, position: number) => {
    set((s) => ({
      document: {
        ...s.document,
        guides: (s.document.guides || []).map((g) =>
          g.id === id ? { ...g, position } : g
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  removeGuide: (id: string) => {
    const state = get();
    state.saveToHistory();
    set((s) => ({
      document: {
        ...s.document,
        guides: (s.document.guides || []).filter((g) => g.id !== id),
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  moveLayerUp: (id: string) => {
    get().moveLayers([id], 'up');
  },
  moveLayerDown: (id: string) => {
    get().moveLayers([id], 'down');
  },
  moveLayerToTop: (id: string) => {
    get().moveLayers([id], 'top');
  },
  moveLayerToBottom: (id: string) => {
    get().moveLayers([id], 'bottom');
  },

  createClippingMask: () => {
    const state = get();
    if (state.selectedLayerIds.length < 2) return;

    state.saveToHistory();
    set((s) => {
      // Find indexes to determine the lowest layer (the mask)
      const selectedLayersWithIndex = s.selectedLayerIds.map((id) => {
        return {
          id,
          index: s.document.layers.findIndex((l) => l.id === id)
        };
      }).sort((a, b) => a.index - b.index);

      const lowestId = selectedLayersWithIndex[0].id;
      const layersToClip = selectedLayersWithIndex.slice(1).map(l => l.id);

      const updatedLayers = s.document.layers.map((l) => {
        if (l.id === lowestId) return { ...l, isMask: true };
        if (layersToClip.includes(l.id)) return { ...l, clippedToId: lowestId };
        return l;
      });

      return {
        document: { ...s.document, layers: updatedLayers, updatedAt: new Date().toISOString() },
      };
    });
  },

  releaseClippingMask: () => {
    const state = get();
    if (state.selectedLayerIds.length === 0) return;

    state.saveToHistory();
    set((s) => {
      const updatedLayers = s.document.layers.map((l) => {
        if (s.selectedLayerIds.includes(l.id)) {
          return { ...l, clippedToId: undefined, isMask: false };
        }
        return l;
      });

      // Also clean up any masks that have no children anymore
      const stillClippedToIds = updatedLayers.map(l => l.clippedToId).filter(Boolean);
      const finalLayers = updatedLayers.map(l => {
        if (l.isMask && !stillClippedToIds.includes(l.id)) return { ...l, isMask: false };
        return l;
      });

      return {
        document: { ...s.document, layers: finalLayers, updatedAt: new Date().toISOString() },
      };
    });
  },
}));
