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
          case 'd':
            e.preventDefault();
            selectedLayerIds.forEach((id) => duplicateLayer(id));
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
              selectedLayerIds.forEach((id) => moveLayerToBottom(id));
            } else {
              selectedLayerIds.forEach((id) => moveLayerDown(id));
            }
            return;
          case ']':
            e.preventDefault();
            if (e.shiftKey) {
              selectedLayerIds.forEach((id) => moveLayerToTop(id));
            } else {
              selectedLayerIds.forEach((id) => moveLayerUp(id));
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
    importFromClipboard, triggerFitToScreen,
  ]);
}
