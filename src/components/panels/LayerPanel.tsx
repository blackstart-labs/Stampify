import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { Search, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCanvasStore } from '@/store/canvasStore';
import { SortableLayerItem } from './SortableLayerItem';
import type { Layer } from '@/types';

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
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Layers are stored bottom-to-top in state, but displayed top-to-bottom in UI
  // UI Index 0 = Top Layer = last in doc.layers array
  const displayLayers = useMemo(() => {
    return [...doc.layers].reverse();
  }, [doc.layers]);

  const filteredLayers = useMemo(() => {
    return displayLayers.filter((l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [displayLayers, searchQuery]);

  const activeLayer = useMemo(() => 
    filteredLayers.find((l) => l.id === activeId),
    [filteredLayers, activeId]
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = displayLayers.findIndex((l) => l.id === active.id);
      const newIndex = displayLayers.findIndex((l) => l.id === over.id);

      // Convert UI indices (top-down) back to doc.layers indices (bottom-up)
      const fromActual = doc.layers.length - 1 - oldIndex;
      const toActual = doc.layers.length - 1 - newIndex;

      // If multiple layers are selected, we move all of them
      const selectedToMove = selectedLayerIds.includes(active.id as string) 
        ? selectedLayerIds 
        : [active.id as string];
      
      reorderLayers(selectedToMove, toActual);
    }

    setActiveId(null);
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      <div className="px-2 py-2 border-b border-border">
        <div className="relative group">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="Search layers..."
            className="h-7 text-xs pl-7 bg-muted/30 border-transparent focus-visible:bg-muted/50 transition-all font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          >
            <SortableContext
              items={filteredLayers.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredLayers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <Layers size={18} className="text-muted-foreground" />
                  </div>
                  <p className="text-xs font-semibold text-foreground/80">No layers found</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {doc.layers.length === 0 ? 'Start by adding a shape or text' : 'Try a different search term'}
                  </p>
                </div>
              ) : (
                filteredLayers.map((layer) => (
                  <SortableLayerItem
                    key={layer.id}
                    layer={layer}
                    isSelected={selectedLayerIds.includes(layer.id)}
                    editingNameId={editingNameId}
                    setEditingNameId={setEditingNameId}
                    toggleLayerSelection={toggleLayerSelection}
                    setSelectedLayers={setSelectedLayers}
                    updateLayer={updateLayer}
                    removeLayer={removeLayer}
                    duplicateLayer={duplicateLayer}
                    moveLayerUp={moveLayerUp}
                    moveLayerDown={moveLayerDown}
                    moveLayerToTop={moveLayerToTop}
                    moveLayerToBottom={moveLayerToBottom}
                  />
                ))
              )}
            </SortableContext>

            <DragOverlay dropAnimation={dropAnimation}>
              {activeLayer ? (
                <div className="w-[calc(var(--radix-scroll-area-viewport-width)-1.5rem)] shadow-2xl scale-[1.02] transition-transform">
                   <SortableLayerItem
                    layer={activeLayer}
                    isSelected={selectedLayerIds.includes(activeLayer.id)}
                    editingNameId={null}
                    setEditingNameId={() => {}}
                    toggleLayerSelection={() => {}}
                    setSelectedLayers={() => {}}
                    updateLayer={() => {}}
                    removeLayer={() => {}}
                    duplicateLayer={() => {}}
                    moveLayerUp={() => {}}
                    moveLayerDown={() => {}}
                    moveLayerToTop={() => {}}
                    moveLayerToBottom={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </ScrollArea>

      <div className="px-3 py-1.5 border-t border-border bg-muted/10 flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
          {doc.layers.length} Layers
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {selectedLayerIds.length} Selected
        </span>
      </div>
    </div>
  );
};
