/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect, useState } from 'react';
import { Image as KonvaImage, Text as KonvaText, Rect, Ellipse, Line, Group, Arrow } from 'react-konva';
import Konva from 'konva';
import type { Layer, ImageLayer, TextLayer, ShapeLayer, WatermarkLayer, EmojiLayer } from '@/types';
import { useCanvasStore } from '@/store/canvasStore';
import { loadImage } from '@/utils/imageUtils';
import { getSnappingEdges, getSnappedPosition } from '@/utils/snapping';

function useLayerDrag(layerId: string) {
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const snappingEdgesRef = useRef<any>(null);
  
  const onDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    dragStartPosRef.current = e.target.absolutePosition();
    const state = useCanvasStore.getState();
    if (e.evt.altKey) {
      state.duplicateLayerExact(layerId);
    }
    snappingEdgesRef.current = getSnappingEdges(state.document, layerId, state.showGrid);
    state.saveToHistory();
  };

  // eslint-disable-next-line react-hooks/unsupported-syntax
  const dragBoundFunc = function(this: Konva.Node, pos: { x: number; y: number }) {
    // In React-Konva the second argument is the mouse event, but types don't always reflect it
    const e = window.event as MouseEvent | undefined;
    let newPos = { ...pos };
    if (e?.shiftKey) {
      const start = dragStartPosRef.current;
      const dx = Math.abs(pos.x - start.x);
      const dy = Math.abs(pos.y - start.y);
      newPos = dx > dy ? { x: pos.x, y: start.y } : { x: start.x, y: pos.y };
      useCanvasStore.getState().setSnapLines([]); // clear snaps if shifting
      return newPos;
    }

    if (snappingEdgesRef.current) {
      const stage = this.getStage();
      if (!stage) return newPos;
      const zoom = stage.scaleX();
      const stagePos = stage.position();
      
      const docPos = {
        x: (newPos.x - stagePos.x) / zoom,
        y: (newPos.y - stagePos.y) / zoom,
      };

      const box = {
        width: this.width() * Math.abs(this.scaleX()),
        height: this.height() * Math.abs(this.scaleY()),
      };

      const { position: snappedDocPos, snapLines } = getSnappedPosition(
        docPos,
        box,
        snappingEdgesRef.current,
        zoom
      );

      useCanvasStore.getState().setSnapLines(snapLines);

      newPos = {
        x: snappedDocPos.x * zoom + stagePos.x,
        y: snappedDocPos.y * zoom + stagePos.y,
      };
    }
    return newPos;
  };
  
  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const store = useCanvasStore.getState();
    store.updateLayer(layerId, { x: e.target.x(), y: e.target.y() });
    store.setSnapLines([]); // ensure snap lines vanish upon drop
  };

  return { onDragStart, dragBoundFunc, onDragEnd, dragStartPosRef };
}

interface CanvasLayerProps {
  layer: Layer;
}

const ImageLayerRenderer: React.FC<{ layer: ImageLayer }> = ({ layer }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<Konva.Image>(null);
  const { setSelectedLayers, selectedLayerIds, updateLayer, activeTool } = useCanvasStore();
  const { onDragStart, dragBoundFunc, onDragEnd } = useLayerDrag(layer.id);

  useEffect(() => {
    if (layer.src && layer.src !== '__IMAGE_PLACEHOLDER__') {
      loadImage(layer.src).then(setImage).catch(console.error);
    }
  }, [layer.src]);

  useEffect(() => {
    if (!imageRef.current || !image) return;
    const node = imageRef.current;

    node.clearCache();

    // Build filter pipeline
    const filters: (typeof Konva.Filters.Brighten)[] = [];
    if (layer.filters.brightness !== 0) filters.push(Konva.Filters.Brighten);
    if (layer.filters.contrast !== 0) filters.push(Konva.Filters.Contrast);
    if (layer.filters.blur > 0) filters.push(Konva.Filters.Blur);
    if (layer.filters.grayscale) filters.push(Konva.Filters.Grayscale);
    if (layer.filters.sepia) filters.push(Konva.Filters.Sepia);
    if (layer.filters.saturation !== 0 || layer.filters.hue !== 0) filters.push(Konva.Filters.HSL);
    if (layer.filters.invert) filters.push(Konva.Filters.Invert);

    node.filters(filters);
    node.brightness(layer.filters.brightness / 100);
    node.contrast(layer.filters.contrast);
    node.blurRadius(layer.filters.blur);
    if (layer.filters.saturation !== 0 || layer.filters.hue !== 0) {
      node.saturation(layer.filters.saturation / 100);
      node.hue(layer.filters.hue);
    }
    node.cache();
  }, [image, layer.filters, layer.width, layer.height]);

  if (layer.src === '__IMAGE_PLACEHOLDER__') {
    return (
      <Group
        x={layer.x}
        y={layer.y}
        rotation={layer.rotation}
        opacity={layer.opacity / 100}
        globalCompositeOperation={(layer.blendMode && layer.blendMode !== 'normal') ? layer.blendMode as GlobalCompositeOperation : 'source-over'}
        id={layer.id}
        name="layer-node"
        draggable={!layer.locked && activeTool === 'select'}
        onClick={(e) => {
          if (activeTool !== 'select') return;
          if (e.evt.ctrlKey) {
            useCanvasStore.getState().toggleLayerSelection(layer.id);
          } else {
            setSelectedLayers([layer.id]);
          }
        }}
        onDragStart={(e) => {
          onDragStart(e);
        }}
        dragBoundFunc={dragBoundFunc as any}
        onDragEnd={onDragEnd}
      >
        <Rect
          width={layer.width}
          height={layer.height}
          stroke="#666"
          strokeWidth={2}
          dash={[10, 5]}
          fill="rgba(128,128,128,0.1)"
        />
        <KonvaText
          text="Image Placeholder"
          width={layer.width}
          height={layer.height}
          align="center"
          verticalAlign="middle"
          fontSize={20}
          fill="#888"
        />
      </Group>
    );
  }

  if (!image) return null;

  return (
    <KonvaImage
      ref={imageRef}
      id={layer.id}
      name="layer-node"
      image={image}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      opacity={layer.opacity / 100}
      globalCompositeOperation={(layer.blendMode && layer.blendMode !== 'normal') ? layer.blendMode as GlobalCompositeOperation : 'source-over'}
      draggable={!layer.locked && activeTool === 'select'}
      visible={layer.visible}
      onClick={(e) => {
        if (activeTool !== 'select') return;
        if (e.evt.ctrlKey) {
          useCanvasStore.getState().toggleLayerSelection(layer.id);
        } else {
          setSelectedLayers([layer.id]);
        }
      }}
      onDragStart={(e) => {
        if (!selectedLayerIds.includes(layer.id)) {
          setSelectedLayers([layer.id]);
        }
        onDragStart(e);
      }}
      dragBoundFunc={dragBoundFunc as any}
      onDragEnd={onDragEnd}
      onTransformEnd={(e) => {
        const node = e.target;
        updateLayer(layer.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * node.scaleX()),
          height: Math.max(5, node.height() * node.scaleY()),
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );
};

const TextLayerRenderer: React.FC<{ layer: TextLayer }> = ({ layer }) => {
  const { setSelectedLayers, updateLayer, saveToHistory, activeTool } = useCanvasStore();
  const textRef = useRef<Konva.Text>(null);
  const { onDragStart, dragBoundFunc, onDragEnd } = useLayerDrag(layer.id);

  const handleDblClick = () => {
    const node = textRef.current;
    if (!node) return;
    const stage = node.getStage();
    if (!stage) return;
    const container = stage.container();
    const stageBox = container.getBoundingClientRect();
    const textPos = node.getAbsolutePosition();
    const areaPosition = {
      x: stageBox.left + textPos.x,
      y: stageBox.top + textPos.y,
    };

    const textarea = window.document.createElement('textarea');
    window.document.body.appendChild(textarea);
    textarea.value = layer.text;
    textarea.style.position = 'fixed';
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.width = `${layer.width * stage.scaleX()}px`;
    textarea.style.height = `${layer.height * stage.scaleY()}px`;
    textarea.style.fontSize = `${layer.fontSize * stage.scaleX()}px`;
    textarea.style.fontFamily = layer.fontFamily;
    textarea.style.color = layer.fill;
    textarea.style.border = '2px solid #4f8ef7';
    textarea.style.padding = '4px';
    textarea.style.margin = '0';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'rgba(0,0,0,0.8)';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.zIndex = '1000';
    textarea.style.lineHeight = String(layer.lineHeight);
    textarea.style.textAlign = layer.align;
    textarea.focus();

    const removeTextarea = () => {
      updateLayer(layer.id, { text: textarea.value });
      window.document.body.removeChild(textarea);
    };

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        removeTextarea();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        removeTextarea();
      }
    });
    textarea.addEventListener('blur', removeTextarea);
  };

  return (
    <KonvaText
      ref={textRef}
      id={layer.id}
      name="layer-node"
      text={layer.text}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      fontSize={layer.fontSize}
      fontFamily={layer.fontFamily}
      fontStyle={layer.fontStyle}
      fill={layer.fill}
      align={layer.align}
      letterSpacing={layer.letterSpacing}
      lineHeight={layer.lineHeight}
      stroke={layer.stroke}
      strokeWidth={layer.strokeWidth}
      rotation={layer.rotation}
      opacity={layer.opacity / 100}
      globalCompositeOperation={(layer.blendMode && layer.blendMode !== 'normal') ? layer.blendMode as GlobalCompositeOperation : 'source-over'}
      draggable={!layer.locked && activeTool === 'select'}
      visible={layer.visible}
      onClick={(e) => {
        if (activeTool !== 'select') return;
        if (e.evt.ctrlKey) {
          useCanvasStore.getState().toggleLayerSelection(layer.id);
        } else {
          setSelectedLayers([layer.id]);
        }
      }}
      onDblClick={handleDblClick}
      onDragStart={(e) => {
        onDragStart(e);
        saveToHistory();
      }}
      dragBoundFunc={dragBoundFunc as any}
      onDragEnd={onDragEnd}
      onTransformEnd={(e) => {
        const node = e.target;
        updateLayer(layer.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * node.scaleX()),
          height: Math.max(5, node.height() * node.scaleY()),
          fontSize: Math.max(1, Math.round(layer.fontSize * node.scaleY())),
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );
};

const ShapeLayerRenderer: React.FC<{ layer: ShapeLayer }> = ({ layer }) => {
  const { setSelectedLayers, updateLayer, activeTool } = useCanvasStore();
  const { onDragStart, dragBoundFunc, onDragEnd } = useLayerDrag(layer.id);

  const commonProps = {
    id: layer.id,
    name: 'layer-node' as const,
    x: layer.x,
    y: layer.y,
    rotation: layer.rotation,
    opacity: layer.opacity / 100,
    globalCompositeOperation: (layer.blendMode && layer.blendMode !== 'normal') ? layer.blendMode as GlobalCompositeOperation : 'source-over',
    draggable: !layer.locked && activeTool === 'select',
    visible: layer.visible,
    hitStrokeWidth: 20,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool !== 'select') return;
      if (e.evt.ctrlKey) {
        useCanvasStore.getState().toggleLayerSelection(layer.id);
      } else {
        setSelectedLayers([layer.id]);
      }
    },
    onDragStart,
    dragBoundFunc: dragBoundFunc as any,
    onDragEnd,
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      updateLayer(layer.id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * node.scaleX()),
        height: Math.max(5, node.height() * node.scaleY()),
        rotation: node.rotation(),
      });
      node.scaleX(1);
      node.scaleY(1);
    },
  };

  switch (layer.shapeType) {
    case 'rectangle':
      return (
        <Rect
          {...commonProps}
          width={layer.width}
          height={layer.height}
          fill={layer.fill}
          stroke={layer.stroke}
          strokeWidth={layer.strokeWidth}
          cornerRadius={layer.cornerRadius || 0}
        />
      );
    case 'circle':
      return (
        <Group {...commonProps} width={layer.width} height={layer.height}>
          <Ellipse
            x={layer.width / 2}
            y={layer.height / 2}
            radiusX={layer.width / 2}
            radiusY={layer.height / 2}
            fill={layer.fill}
            stroke={layer.stroke}
            strokeWidth={layer.strokeWidth}
          />
        </Group>
      );
    case 'triangle':
      return (
        <Line
          {...commonProps}
          points={[
            layer.width / 2, 0,
            layer.width, layer.height,
            0, layer.height,
          ]}
          closed
          fill={layer.fill}
          stroke={layer.stroke}
          strokeWidth={layer.strokeWidth}
        />
      );
    case 'line':
      return (
        <Line
          {...commonProps}
          points={[0, 0, layer.width, layer.height]}
          stroke={layer.stroke}
          strokeWidth={layer.strokeWidth}
        />
      );
    case 'arrow':
      return (
        <Arrow
          {...commonProps}
          points={[0, 0, layer.width, layer.height]}
          fill={layer.fill}
          stroke={layer.stroke}
          strokeWidth={layer.strokeWidth}
          pointerLength={10}
          pointerWidth={10}
        />
      );
    default:
      return null;
  }
};

const WatermarkLayerRenderer: React.FC<{ layer: WatermarkLayer }> = ({ layer }) => {
  const { setSelectedLayers, updateLayer, saveToHistory, activeTool } = useCanvasStore();
  const doc = useCanvasStore((s) => s.document);
  const [patternImage, setPatternImage] = useState<HTMLCanvasElement | null>(null);
  const { onDragStart, dragBoundFunc, onDragEnd } = useLayerDrag(layer.id);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tileW = Math.max(10, layer.width + layer.repeatSpacingX);
    const tileH = Math.max(10, layer.height + layer.repeatSpacingY);

    canvas.width = tileW;
    canvas.height = tileH;

    if (layer.watermarkType === 'text') {
      ctx.fillStyle = layer.fill || 'rgba(0,0,0,0.2)';
      ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontSize || 24}px ${layer.fontFamily || 'Arial'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(layer.text || 'Watermark', layer.width / 2, layer.height / 2);
      setTimeout(() => setPatternImage(canvas), 0);
    } else if (layer.watermarkType === 'image' && layer.src) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, layer.width, layer.height);
        setTimeout(() => setPatternImage(canvas), 0);
      };
      img.src = layer.src;
    }
  }, [
    layer.watermarkType, layer.text, layer.fontSize, layer.fontFamily, 
    layer.fontStyle, layer.fill, layer.width, layer.height, 
    layer.repeatSpacingX, layer.repeatSpacingY, layer.src
  ]);

  const tileW = Math.max(10, layer.width + layer.repeatSpacingX);
  const tileH = Math.max(10, layer.height + layer.repeatSpacingY);
  const totalW = tileW * layer.repeatX - layer.repeatSpacingX;
  const totalH = tileH * layer.repeatY - layer.repeatSpacingY;

  const calcPosition = () => {
    if (layer.position === 'free') return { x: layer.x, y: layer.y };
    // Assuming padding as 0 if undefined since type says it's not standard
    const pad = (layer as any).padding || 0; 
    const positions: Record<string, { x: number; y: number }> = {
      'top-left': { x: pad, y: pad },
      'top-center': { x: (doc.width - totalW) / 2, y: pad },
      'top-right': { x: doc.width - totalW - pad, y: pad },
      'center-left': { x: pad, y: (doc.height - totalH) / 2 },
      'center': { x: (doc.width - totalW) / 2, y: (doc.height - totalH) / 2 },
      'center-right': { x: doc.width - totalW - pad, y: (doc.height - totalH) / 2 },
      'bottom-left': { x: pad, y: doc.height - totalH - pad },
      'bottom-center': { x: (doc.width - totalW) / 2, y: doc.height - totalH - pad },
      'bottom-right': { x: doc.width - totalW - pad, y: doc.height - totalH - pad },
    };
    return positions[layer.position] || { x: layer.x, y: layer.y };
  };

  const pos = calcPosition();

  if (!patternImage) return null;

  return (
    <Rect
      id={layer.id}
      name="layer-node"
      x={pos.x}
      y={pos.y}
      width={Math.max(10, totalW)}
      height={Math.max(10, totalH)}
      rotation={layer.rotation || 0}
      opacity={layer.opacity / 100}
      globalCompositeOperation={(layer.blendMode && layer.blendMode !== 'normal') ? layer.blendMode as GlobalCompositeOperation : 'source-over'}
      visible={layer.visible}
      draggable={!layer.locked && layer.position === 'free' && activeTool === 'select'}
      fillPatternImage={patternImage as any}
      fillPatternRepeat="repeat"
      hitStrokeWidth={20}
      onClick={(e) => {
        if (activeTool !== 'select') return;
        if (e.evt.ctrlKey) {
          useCanvasStore.getState().toggleLayerSelection(layer.id);
        } else {
          setSelectedLayers([layer.id]);
        }
      }}
      onDragStart={(e) => {
        onDragStart(e);
        saveToHistory();
      }}
      dragBoundFunc={dragBoundFunc as any}
      onDragEnd={(e) => {
        if (layer.position === 'free') onDragEnd(e);
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        
        updateLayer(layer.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(10, layer.width * scaleX),
          height: Math.max(10, layer.height * scaleY),
          fontSize: layer.fontSize ? layer.fontSize * scaleY : undefined
        });
      }}
    />
  );
};

// Removed BlurLayerRenderer

const EmojiLayerRenderer: React.FC<{ layer: EmojiLayer }> = ({ layer }) => {
  const { setSelectedLayers, updateLayer, activeTool } = useCanvasStore();
  const { onDragStart, dragBoundFunc, onDragEnd } = useLayerDrag(layer.id);

  return (
    <KonvaText
      id={layer.id}
      name="layer-node"
      text={layer.emoji}
      x={layer.x}
      y={layer.y}
      fontSize={layer.fontSize}
      rotation={layer.rotation}
      opacity={layer.opacity / 100}
      globalCompositeOperation={(layer.blendMode && layer.blendMode !== 'normal') ? layer.blendMode as GlobalCompositeOperation : 'source-over'}
      draggable={!layer.locked && activeTool === 'select'}
      visible={layer.visible}
      align="center"
      verticalAlign="middle"
      onClick={(e) => {
        if (activeTool !== 'select') return;
        if (e.evt.ctrlKey) {
          useCanvasStore.getState().toggleLayerSelection(layer.id);
        } else {
          setSelectedLayers([layer.id]);
        }
      }}
      onDragStart={onDragStart}
      dragBoundFunc={dragBoundFunc}
      onDragEnd={onDragEnd}
      onTransformEnd={(e) => {
        const node = e.target;
        // Increase font size according to the vertical scale
        const scaleFactor = node.scaleY();
        const newFontSize = Math.max(1, Math.round(layer.fontSize * scaleFactor));
        updateLayer(layer.id, {
          x: node.x(),
          y: node.y(),
          fontSize: newFontSize,
          width: node.width() * scaleFactor,     // keep sync for base layer state
          height: node.height() * scaleFactor,   // keep sync for base layer state
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );
};

export const CanvasLayer: React.FC<CanvasLayerProps> = ({ layer }) => {
  if (!layer.visible) return null;

  switch (layer.type) {
    case 'image':
      return <ImageLayerRenderer layer={layer} />;
    case 'text':
      return <TextLayerRenderer layer={layer} />;
    case 'shape':
      return <ShapeLayerRenderer layer={layer} />;
    case 'watermark':
      return <WatermarkLayerRenderer layer={layer} />;
    case 'emoji':
      return <EmojiLayerRenderer layer={layer} />;
    default:
      return null;
  }
};
