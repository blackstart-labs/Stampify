import React, { useState, useEffect, useRef } from 'react';
import { Group, Circle, Text, Label, Tag } from 'react-konva';
import { useCanvasStore } from '@/store/canvasStore';
import type { BaseLayer, ShapeLayer } from '@/types';
import type Konva from 'konva';

interface RadiusHandlesProps {
  zoom: number;
  stageRef: React.RefObject<Konva.Stage | null>;
}

export const RadiusHandles: React.FC<RadiusHandlesProps> = ({ zoom, stageRef }) => {
  const { selectedLayerIds, document: doc, updateLayer, activeTool, saveToHistory } = useCanvasStore();
  
  if (selectedLayerIds.length !== 1 || activeTool === 'pan') return null;

  const layer = doc.layers.find(l => l.id === selectedLayerIds[0]);
  if (!layer || layer.locked) return null;

  const isImage = layer.type === 'image';
  const isRect = layer.type === 'shape' && (layer as ShapeLayer).shapeType === 'rectangle';
  if (!isImage && !isRect) return null;

  return <LayerRadiusHandles layer={layer} zoom={zoom} updateLayer={updateLayer} saveToHistory={saveToHistory} stageRef={stageRef} />;
};

const LayerRadiusHandles: React.FC<{ layer: BaseLayer, zoom: number, updateLayer: any, saveToHistory: any, stageRef: React.RefObject<Konva.Stage | null> }> = ({ layer, zoom, updateLayer, saveToHistory, stageRef }) => {
  const groupRef = useRef<Konva.Group>(null);
  
  // Create a fast local state cache precisely for tracking 144hz node transformations
  const [bounds, setBounds] = useState({
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
  });

  const maxRadius = Math.min(bounds.width, bounds.height) / 2;
  const initialRadius = Math.max(0, Math.min(layer.cornerRadius || 0, maxRadius));

  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  const [localRadius, setLocalRadius] = useState<number>(0);

  const displayRadius = activeHandle !== null ? localRadius : initialRadius;

  // Track the actual node layout to snap handles while the node is dragging/resizing globally
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const targetNode = stage.findOne(`#${layer.id}`);
    if (!targetNode) return;

    const updateBounds = () => {
      // Calculate true width and height considering scale (since Transformer mutates scaleX/scaleY)
      const absScaleX = targetNode.scaleX();
      const absScaleY = targetNode.scaleY();
      setBounds({
        x: targetNode.x(),
        y: targetNode.y(),
        width: Math.max(5, targetNode.width() * absScaleX),
        height: Math.max(5, targetNode.height() * absScaleY),
        rotation: targetNode.rotation(),
      });
    };

    // Attach passive listeners to the node so the handles chase it smoothly
    targetNode.on('dragmove.radius', updateBounds);
    targetNode.on('transform.radius', updateBounds);
    
    // Also update if the store itself changed the layer unexpectedly
    updateBounds();

    return () => {
      targetNode.off('dragmove.radius');
      targetNode.off('transform.radius');
    };
  }, [layer.id, layer.x, layer.y, layer.width, layer.height, layer.rotation]); // Re-bind if store explicitly alters source properties

  const corners = [
    { id: 0, signX: 1, signY: 1 },
    { id: 1, signX: -1, signY: 1 },
    { id: 2, signX: -1, signY: -1 },
    { id: 3, signX: 1, signY: -1 },
  ];

  const handleSize = 10 / zoom;
  const visualInset = Math.max(14 / zoom, displayRadius);

  return (
    <Group ref={groupRef} x={bounds.x} y={bounds.y} rotation={bounds.rotation}>
      {corners.map((corner) => {
        const cx = corner.id === 0 || corner.id === 3 ? visualInset : bounds.width - visualInset;
        const cy = corner.id === 0 || corner.id === 1 ? visualInset : bounds.height - visualInset;

        return (
          <Group key={corner.id} x={cx} y={cy}>
            <Circle
              radius={handleSize * 1.5}
              fill="transparent"
              draggable
              onDragStart={(e) => {
                setActiveHandle(corner.id);
                setLocalRadius(initialRadius);
                saveToHistory();
                e.cancelBubble = true;
              }}
              onDragEnd={() => {
                setActiveHandle(null);
                updateLayer(layer.id, { cornerRadius: localRadius });
              }}
              dragBoundFunc={(pos) => pos} // Allows free drag
              onDragMove={(e) => {
                const stage = e.target.getStage();
                if (!stage) return;
                
                // Read exact pointer position through the reverse transform
                const transform = e.target.getParent()?.getParent()?.getAbsoluteTransform().copy().invert();
                const pos = transform?.point(stage.getPointerPosition() || {x: 0, y: 0}) || {x: 0, y: 0};

                let newR = 0;
                if (corner.id === 0) newR = Math.max(pos.x, pos.y);
                else if (corner.id === 1) newR = Math.max(bounds.width - pos.x, pos.y);
                else if (corner.id === 2) newR = Math.max(bounds.width - pos.x, bounds.height - pos.y);
                else if (corner.id === 3) newR = Math.max(pos.x, bounds.height - pos.y);

                newR = Math.max(0, Math.min(newR, maxRadius));
                setLocalRadius(newR);

                // Directly mutate the tracked node for instantaneous zero-lag preview
                const targetNode = stage.findOne(`#${layer.id}`);
                if (targetNode) {
                  // For shapes executing natively
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  if (typeof (targetNode as any).cornerRadius === 'function') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (targetNode as any).cornerRadius(newR);
                  }
                  // For images driving our hardware accelerated clipFunc
                  targetNode.setAttr('dynamicRadius', newR);
                  targetNode.getLayer()?.batchDraw();
                }

                // Snap the visual hit target back so it doesn't float away
                e.target.position({ x: 0, y: 0 });
              }}
              onMouseEnter={(e) => {
                 const stage = e.target.getStage();
                 if(stage) stage.container().style.cursor = 'crosshair';
              }}
              onMouseLeave={(e) => {
                 const stage = e.target.getStage();
                 if(stage) stage.container().style.cursor = 'default';
              }}
            />
            <Circle
              radius={handleSize / 2}
              fill="white"
              stroke="#18a0fb"
              strokeWidth={1.5 / zoom}
              listening={false}
            />
          </Group>
        );
      })}

      {/* Dynamic numeric tooltip */}
      {activeHandle !== null && (
        <Label x={bounds.width / 2} y={-30 / zoom} opacity={0.9}>
          <Tag fill="#18a0fb" cornerRadius={4 / zoom} pointerDirection="down" pointerWidth={6 / zoom} pointerHeight={6 / zoom} />
          <Text
            text={`Radius ${Math.round(displayRadius)}`}
            fontFamily="sans-serif"
            fontSize={12 / zoom}
            padding={6 / zoom}
            fill="white"
          />
        </Label>
      )}
    </Group>
  );
};
