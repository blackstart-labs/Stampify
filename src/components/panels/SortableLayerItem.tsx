import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Eye, EyeOff, Lock, Unlock, Trash2, GripVertical,
  Image as ImageIcon, Type, Square, Droplets, Stamp, Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Copy, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown
} from 'lucide-react';
import type { Layer, LayerType } from '@/types';

const layerIcons: Record<LayerType, React.ReactNode> = {
  image: <ImageIcon size={14} />,
  text: <Type size={14} />,
  shape: <Square size={14} />,
  watermark: <Stamp size={14} />,
  blur: <Droplets size={14} />,
  emoji: <Smile size={14} />,
};

interface SortableLayerItemProps {
  layer: Layer;
  isSelected: boolean;
  editingNameId: string | null;
  setEditingNameId: (id: string | null) => void;
  toggleLayerSelection: (id: string) => void;
  setSelectedLayers: (ids: string[]) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  moveLayerToTop: (id: string) => void;
  moveLayerToBottom: (id: string) => void;
}

export const SortableLayerItem: React.FC<SortableLayerItemProps> = ({
  layer,
  isSelected,
  editingNameId,
  setEditingNameId,
  toggleLayerSelection,
  setSelectedLayers,
  updateLayer,
  removeLayer,
  duplicateLayer,
  moveLayerUp,
  moveLayerDown,
  moveLayerToTop,
  moveLayerToBottom,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            {...attributes}
            {...listeners}
            className={`group grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 px-1 py-1 rounded-md cursor-grab active:cursor-grabbing transition-colors text-xs w-full overflow-hidden
              ${isSelected ? 'bg-blue-600/20 border border-blue-500/40' : 'hover:bg-accent border border-transparent'}
              ${!layer.visible ? 'opacity-50' : ''}`}
            onClick={(e) => {
              // Only trigger selection if not dragging
              if (e.ctrlKey) {
                toggleLayerSelection(layer.id);
              } else {
                setSelectedLayers([layer.id]);
              }
            }}
          >
            <div className="w-4 flex items-center justify-center text-muted-foreground group-hover:text-foreground">
              <GripVertical size={12} className="flex-shrink-0" />
            </div>

            <div className="w-6 h-6 flex-shrink-0 rounded flex items-center justify-center bg-muted/50 border border-border/50 text-muted-foreground overflow-hidden">
              {layer.type === 'image' && (layer as any).src ? (
                <img src={(layer as any).src} className="w-full h-full object-cover" alt="" />
              ) : (
                layerIcons[layer.type]
              )}
            </div>

            {editingNameId === layer.id ? (
              <Input
                className="h-5 text-xs px-1 py-0 flex-1 bg-background border-primary focus-visible:ring-0"
                defaultValue={layer.name}
                autoFocus
                onPointerDown={(e) => e.stopPropagation()}
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
                className="truncate select-none font-medium min-w-0"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingNameId(layer.id);
                }}
              >
                {layer.name}
              </span>
            )}

            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className={`w-6 h-6 flex-shrink-0 rounded transition-opacity ${layer.locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layer.id, { locked: !layer.locked });
                }}
              >
                {layer.locked ? <Lock size={12} className="text-amber-500" /> : <Unlock size={12} />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={`w-6 h-6 flex-shrink-0 rounded transition-opacity ${layer.visible ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layer.id, { visible: !layer.visible });
                }}
              >
                {layer.visible ? <Eye size={12} /> : <EyeOff size={12} className="text-blue-500" />}
              </Button>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => duplicateLayer(layer.id)} className="gap-2">
            <Copy size={14} /> Duplicate <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+D</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setEditingNameId(layer.id)} className="gap-2">
            <Type size={14} /> Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => updateLayer(layer.id, { locked: !layer.locked })} className="gap-2">
            {layer.locked ? <Unlock size={14} /> : <Lock size={14} />}
            {layer.locked ? 'Unlock' : 'Lock'}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => moveLayerToTop(layer.id)} className="gap-2">
            <ChevronsUp size={14} /> Bring to Front <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+]</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => moveLayerUp(layer.id)} className="gap-2">
            <ArrowUp size={14} /> Bring Forward <span className="ml-auto text-[10px] text-muted-foreground">]</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => moveLayerDown(layer.id)} className="gap-2">
            <ArrowDown size={14} /> Send Backward <span className="ml-auto text-[10px] text-muted-foreground">[</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => moveLayerToBottom(layer.id)} className="gap-2">
            <ChevronsDown size={14} /> Send to Back <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+[</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive gap-2"
            onClick={() => removeLayer(layer.id)}
          >
            <Trash2 size={14} /> Delete <span className="ml-auto text-[10px] text-muted-foreground">Del</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};
