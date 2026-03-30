import { useEffect } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useImageImport } from './useImageImport';

export function useKeyboardShortcuts() {
  const {
    selectedLayerIds,
    activeTool,
    undo,
    redo,
    removeLayer,
    duplicateLayer,
    setActiveTool,
    setSelectedLayers,
    setZoom,
    zoom,
    document,
    moveLayerUp,
    moveLayerDown,
    moveLayerToTop,
    moveLayerToBottom,
    triggerFitToScreen,
    showRulers,
    setShowRulers,
  } = useCanvasStore();

  const { importFromClipboard } = useImageImport();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Clipboard paste always works
      if (e.ctrlKey && e.key === 'v') {
        // Handled by paste event listener
        return;
      }

      // Ctrl shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
          case 'Z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            return;
          case 'y':
            e.preventDefault();
            redo();
            return;
          case 'r':
            e.preventDefault();
            setShowRulers(!showRulers);
            return;
          case 'd':
            e.preventDefault();
            useCanvasStore.getState().duplicateLayers(selectedLayerIds);
            return;
          case 'a':
            if (!isInput) {
              e.preventDefault();
              setSelectedLayers(document.layers.map((l) => l.id));
            }
            return;
          case 'e':
            e.preventDefault();
            // Export handled by toolbar
            return;
          case '[':
            e.preventDefault();
            if (e.shiftKey) {
              useCanvasStore.getState().moveLayers(selectedLayerIds, 'bottom');
            } else {
              useCanvasStore.getState().moveLayers(selectedLayerIds, 'down');
            }
            return;
          case ']':
            e.preventDefault();
            if (e.shiftKey) {
              useCanvasStore.getState().moveLayers(selectedLayerIds, 'top');
            } else {
              useCanvasStore.getState().moveLayers(selectedLayerIds, 'up');
            }
            return;
          case '0':
            e.preventDefault();
            triggerFitToScreen();
            return;
          case '1':
            e.preventDefault();
            setZoom(1);
            return;
        }
      }

      if (isInput) return;

      // Tool shortcuts
      switch (e.key) {
        case 'v':
        case 'V':
          setActiveTool('select');
          break;
        case 't':
        case 'T':
          setActiveTool('text');
          break;
        case 'h':
        case 'H':
          setActiveTool('pan');
          break;
        case 'Delete':
        case 'Backspace':
          selectedLayerIds.forEach((id) => removeLayer(id));
          break;
        case 'Escape':
          setSelectedLayers([]);
          setActiveTool('select');
          break;
        case '=':
        case '+':
          setZoom(zoom + 0.1);
          break;
        case '-':
          setZoom(zoom - 0.1);
          break;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      importFromClipboard(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [
    selectedLayerIds, activeTool, undo, redo, removeLayer, duplicateLayer,
    setActiveTool, setSelectedLayers, setZoom, zoom, document.layers,
    moveLayerUp, moveLayerDown, moveLayerToTop, moveLayerToBottom,
    importFromClipboard, triggerFitToScreen, showRulers, setShowRulers,
  ]);
}
