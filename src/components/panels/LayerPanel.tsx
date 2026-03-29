import React, { useState } from 'react';
import {
  Eye, EyeOff, Lock, Unlock, Trash2, GripVertical,
  Image, Type, Square, Droplets, Stamp, Smile, Search,
  Copy, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useCanvasStore } from '@/store/canvasStore';
import type { Layer, LayerType } from '@/types';

const layerIcons: Record<LayerType, React.ReactNode> = {
  image: <Image size={14} />,
  text: <Type size={14} />,
  shape: <Square size={14} />,
  watermark: <Stamp size={14} />,
  blur: <Droplets size={14} />,
  emoji: <Smile size={14} />,
};

export const LayerPanel: React.FC = () => {
  const {
    document: doc,
    selectedLayerIds,
    setSelectedLayers,
    toggleLayerSelection,
    updateLayer,
    removeLayer,
    duplicateLayer,
    moveLayerUp,
    moveLayerDown,
    moveLayerToTop,
    moveLayerToBottom,
    reorderLayers,
  } = useCanvasStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Reverse layers for display (top layer first)
  const displayLayers = [...doc.layers].reverse();
  const filteredLayers = displayLayers.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragStart = (e: React.DragEvent, displayIndex: number) => {
    setDraggedIndex(displayIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDisplayIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetDisplayIndex) return;

    const fromActual = doc.layers.length - 1 - draggedIndex;
    const toActual = doc.layers.length - 1 - targetDisplayIndex;
    reorderLayers(fromActual, toActual);
    setDraggedIndex(null);
  };

  const renderLayerItem = (layer: Layer, displayIndex: number) => {
    const isSelected = selectedLayerIds.includes(layer.id);

    return (
      <ContextMenu key={layer.id}>
        <ContextMenuTrigger>
          <div
            className={`group flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer transition-colors text-xs
              ${isSelected ? 'bg-primary/20 border border-primary/40' : 'hover:bg-accent border border-transparent'}
              ${!layer.visible ? 'opacity-50' : ''}`}
            onClick={(e) => {
              if (e.ctrlKey) {
                toggleLayerSelection(layer.id);
              } else {
                setSelectedLayers([layer.id]);
              }
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, displayIndex)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, displayIndex)}
          >
            <GripVertical size={12} className="text-muted-foreground cursor-grab flex-shrink-0" />

            <span className="flex-shrink-0 text-muted-foreground">
              {layerIcons[layer.type]}
            </span>

            {editingNameId === layer.id ? (
              <Input
                className="h-5 text-xs px-1 py-0 flex-1"
                defaultValue={layer.name}
                autoFocus
                onBlur={(e) => {
                  updateLayer(layer.id, { name: e.target.value });
                  setEditingNameId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateLayer(layer.id, { name: (e.target as HTMLInputElement).value });
                    setEditingNameId(null);
                  }
                  if (e.key === 'Escape') setEditingNameId(null);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="flex-1 truncate"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingNameId(layer.id);
                }}
              >
                {layer.name}
              </span>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(layer.id, { visible: !layer.visible });
              }}
              aria-label={`Toggle visibility for ${layer.name}`}
            >
              {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(layer.id, { locked: !layer.locked });
              }}
              aria-label={`Toggle lock for ${layer.name}`}
            >
              {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                removeLayer(layer.id);
              }}
              aria-label={`Delete ${layer.name}`}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={() => duplicateLayer(layer.id)}>
            <Copy size={14} className="mr-2" /> Duplicate
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setEditingNameId(layer.id)}>
            <Type size={14} className="mr-2" /> Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => updateLayer(layer.id, { locked: !layer.locked })}>
            {layer.locked ? <Unlock size={14} className="mr-2" /> : <Lock size={14} className="mr-2" />}
            {layer.locked ? 'Unlock' : 'Lock'}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => moveLayerToTop(layer.id)}>
            <ChevronsUp size={14} className="mr-2" /> Move to Top
          </ContextMenuItem>
          <ContextMenuItem onClick={() => moveLayerUp(layer.id)}>
            <ArrowUp size={14} className="mr-2" /> Move Up
          </ContextMenuItem>
          <ContextMenuItem onClick={() => moveLayerDown(layer.id)}>
            <ArrowDown size={14} className="mr-2" /> Move Down
          </ContextMenuItem>
          <ContextMenuItem onClick={() => moveLayerToBottom(layer.id)}>
            <ChevronsDown size={14} className="mr-2" /> Move to Bottom
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive"
            onClick={() => removeLayer(layer.id)}
          >
            <Trash2 size={14} className="mr-2" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1.5 border-b border-border">
        <div className="flex items-center gap-1">
          <Search size={12} className="text-muted-foreground" />
          <Input
            placeholder="Search layers..."
            className="h-6 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {filteredLayers.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8">
              {doc.layers.length === 0 ? (
                <div>
                  <p className="mb-1">No layers yet</p>
                  <p className="text-[10px]">Import an image or add a layer to start</p>
                </div>
              ) : (
                <p>No matching layers</p>
              )}
            </div>
          ) : (
            filteredLayers.map((layer, i) => renderLayerItem(layer, i))
          )}
        </div>
      </ScrollArea>

      <div className="px-2 py-1 border-t border-border text-[10px] text-muted-foreground text-center">
        {doc.layers.length} layer{doc.layers.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
