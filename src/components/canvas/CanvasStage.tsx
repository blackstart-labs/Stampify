import React, { useRef, useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Rect, Group, Line } from 'react-konva';
import Konva from 'konva';
import { useCanvasStore } from '@/store/canvasStore';
import { CanvasLayer } from './CanvasLayer';
import { SelectionTransformer } from './SelectionTransformer';
import { RadiusHandles } from './RadiusHandles';
import { Ruler } from './Ruler';
import { SnapLinesOverlay } from './SnapLinesOverlay';
import { useDropzone } from 'react-dropzone';
import { useImageImport } from '@/hooks/useImageImport';
import { v4 as uuidv4 } from 'uuid';

const CHECKERBOARD_SIZE = 16;

export interface CanvasStageHandle {
  getStage: () => Konva.Stage | null;
  fitToScreen: () => void;
}

export const CanvasStage = forwardRef<CanvasStageHandle>((_props, ref) => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roundedRectClip = useCallback((ctx: any, layer: any) => {
    ctx.save();
    ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-(layer.width / 2), -(layer.height / 2));

    const w = layer.width;
    const h = layer.height;
    const r = layer.cornerRadius || 0;

    ctx.beginPath();
    if (layer.type === 'shape' && layer.shapeType === 'circle') {
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (layer.type === 'shape' && layer.shapeType === 'triangle') {
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
    } else {
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.quadraticCurveTo(w, 0, w, r);
      ctx.lineTo(w, h - r);
      ctx.quadraticCurveTo(w, h, w - r, h);
      ctx.lineTo(r, h);
      ctx.quadraticCurveTo(0, h, 0, h - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
    }
    ctx.closePath();
    ctx.restore();
  }, []);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const hasInitialZoom = useRef(false);
  const [measureCount, setMeasureCount] = useState(0);

  const {
    document: doc,
    zoom,
    setZoom,
    setSelectedLayers,
    activeTool,
    showGrid,
    showRulers,
    addGuide,
    updateGuide,
    removeGuide,
    setIsPanning,
    fitToScreenTrigger,
  } = useCanvasStore();

  const { importFromFiles } = useImageImport();

  // Expose the stage ref to parent
  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    fitToScreen: () => {
      const cw = containerSize.width;
      const ch = containerSize.height;
      if (cw < 100 || ch < 100) return;
      const padding = 80;
      const fitZoomX = (cw - padding) / doc.width;
      const fitZoomY = (ch - padding) / doc.height;
      const fitZoom = Math.min(fitZoomX, fitZoomY, 1);
      const clampedZoom = Math.max(0.1, Math.min(5, fitZoom));
      setZoom(clampedZoom);
      setStagePos({
        x: (cw - doc.width * clampedZoom) / 2,
        y: (ch - doc.height * clampedZoom) / 2,
      });
    },
  }));

  // Checkerboard pattern image (created once, not 8000+ Rect nodes)
  const checkerPattern = useMemo(() => {
    const size = CHECKERBOARD_SIZE * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(CHECKERBOARD_SIZE, 0, CHECKERBOARD_SIZE, CHECKERBOARD_SIZE);
    ctx.fillRect(0, CHECKERBOARD_SIZE, CHECKERBOARD_SIZE, CHECKERBOARD_SIZE);
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'],
    },
    noClick: true,
    noKeyboard: true,
    onDrop: (files) => importFromFiles(files),
  });

  // Merge containerRef with dropzone's ref (dropzone's getRootProps returns a ref
  // that would overwrite ours if spread after ref={containerRef})
  const dropzoneProps = getRootProps();
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      const dzRef = dropzoneProps.ref;
      if (typeof dzRef === 'function') {
        dzRef(node);
      } else if (dzRef && typeof dzRef === 'object') {
        (dzRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [dropzoneProps.ref]
  );

  // Resize observer - tracks container dimensions and increments measureCount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
        setMeasureCount((c) => c + 1);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Auto-fit canvas zoom + center after first real container measurement
  useEffect(() => {
    if (hasInitialZoom.current) return;
    if (measureCount === 0) return;
    if (containerSize.width < 100 || containerSize.height < 100) return;
    hasInitialZoom.current = true;

    const padding = 80;
    const cw = containerSize.width;
    const ch = containerSize.height;
    const fitZoomX = (cw - padding) / doc.width;
    const fitZoomY = (ch - padding) / doc.height;
    const fitZoom = Math.min(fitZoomX, fitZoomY, 1);
    const clampedZoom = Math.max(0.1, Math.min(5, fitZoom));
    setZoom(clampedZoom);

    const offsetX = (cw - doc.width * clampedZoom) / 2;
    const offsetY = (ch - doc.height * clampedZoom) / 2;
    setStagePos({ x: offsetX, y: offsetY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureCount]);

  // Reset auto-fit when document changes (new project / load document)
  const [selectionBox, setSelectionBox] = useState({
    active: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });

  const docIdRef = useRef(doc.id);

  const manualRotateRef = useRef<{
    active: boolean;
    nodes: Array<{ id: string; x: number; y: number; rotation: number }>;
    center: { x: number; y: number };
    startAngleRaw: number;
  }>({ active: false, nodes: [], center: { x: 0, y: 0 }, startAngleRaw: 0 });
  const [isHoveringRotate, setIsHoveringRotate] = useState(false);

  useEffect(() => {
    if (docIdRef.current !== doc.id) {
      docIdRef.current = doc.id;
      hasInitialZoom.current = false;
      setMeasureCount((c) => c + 1); // trigger auto-fit
    }
  }, [doc.id]);

  // Fit to screen triggered externally
  useEffect(() => {
    if (fitToScreenTrigger > 0) {
      const cw = containerSize.width;
      const ch = containerSize.height;
      if (cw < 100 || ch < 100) return;
      const padding = 80;
      const fitZoomX = (cw - padding) / doc.width;
      const fitZoomY = (ch - padding) / doc.height;
      const fitZoom = Math.min(fitZoomX, fitZoomY, 1);
      const clampedZoom = Math.max(0.1, Math.min(5, fitZoom));
      setZoom(clampedZoom);
      setStagePos({
        x: (cw - doc.width * clampedZoom) / 2,
        y: (ch - doc.height * clampedZoom) / 2,
      });
    }
  }, [fitToScreenTrigger, containerSize.width, containerSize.height, doc.width, doc.height, setZoom]);

  // Scroll to zoom
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const scaleBy = 1.08;
      const oldZoom = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const newZoom = e.evt.deltaY < 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
      const clampedZoom = Math.max(0.1, Math.min(5, newZoom));

      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldZoom,
        y: (pointer.y - stagePos.y) / oldZoom,
      };

      setZoom(clampedZoom);
      setStagePos({
        x: pointer.x - mousePointTo.x * clampedZoom,
        y: pointer.y - mousePointTo.y * clampedZoom,
      });
    },
    [zoom, stagePos, setZoom]
  );

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Middle mouse button or pan tool
      if (e.evt.button === 1 || activeTool === 'pan') {
        isPanningRef.current = true;
        setIsPanning(true);
        lastPointerPos.current = { x: e.evt.clientX, y: e.evt.clientY };
        e.evt.preventDefault();
        return;
      }

      if (isHoveringRotate && activeTool === 'select') {
        e.evt.preventDefault();
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition();
        if (stage && pointer) {
          const tr = stage.findOne('Transformer') as Konva.Transformer | undefined;
          if (tr && tr.nodes().length > 0) {
            const nodes = tr.nodes();
            const transform = tr.getAbsoluteTransform();
            const center = transform.point({ x: tr.width() / 2, y: tr.height() / 2 });
            manualRotateRef.current = {
              active: true,
              nodes: nodes.map((n) => ({ id: n.id(), x: n.x(), y: n.y(), rotation: n.rotation() })),
              center,
              startAngleRaw: Math.atan2(pointer.y - center.y, pointer.x - center.x) * (180 / Math.PI),
            };
            return;
          }
        }
      }

      // Click on empty area -> deselect
      const target = e.target;
      const clickedOnEmpty =
        target === target.getStage() ||
        target.name() === 'canvas-bg' ||
        target.name() === 'checkerboard' ||
        target.name() === 'canvas-shadow' ||
        target.name() === 'grid-line';

      if (clickedOnEmpty && activeTool === 'select') {
        // Only deselect if selection box is just clicked (handled via mouseup) or we drag-start new box
        setSelectedLayers([]);
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition();
        if (pointer && stage) {
          const docX = (pointer.x - stagePos.x) / zoom;
          const docY = (pointer.y - stagePos.y) / zoom;
          setSelectionBox({
            active: true,
            startX: docX,
            startY: docY,
            endX: docX,
            endY: docY,
          });
        }
      }
    },
    [activeTool, setSelectedLayers, setIsPanning, stagePos, zoom, isHoveringRotate]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (manualRotateRef.current.active) {
        const state = manualRotateRef.current;
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition();
        if (!pointer || !stage) return;

        const currentAngleRaw = Math.atan2(pointer.y - state.center.y, pointer.x - state.center.x) * (180 / Math.PI);
        let delta = currentAngleRaw - state.startAngleRaw;

        if (e.evt.shiftKey) {
          delta = Math.round(delta / 45) * 45;
        }

        const rad = (delta * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const centerDoc = {
          x: (state.center.x - stagePos.x) / zoom,
          y: (state.center.y - stagePos.y) / zoom,
        };

        state.nodes.forEach((nData) => {
          const node = stage.findOne(`#${nData.id}`);
          if (node) {
            const dx = nData.x - centerDoc.x;
            const dy = nData.y - centerDoc.y;
            const newX = centerDoc.x + dx * cos - dy * sin;
            const newY = centerDoc.y + dx * sin + dy * cos;
            node.x(newX);
            node.y(newY);
            node.rotation(nData.rotation + delta);
          }
        });

        const tr = stage.findOne('Transformer');
        if (tr) tr.getLayer()?.batchDraw();
        return;
      }

      if (isPanningRef.current) {
        const dx = e.evt.clientX - lastPointerPos.current.x;
        const dy = e.evt.clientY - lastPointerPos.current.y;
        lastPointerPos.current = { x: e.evt.clientX, y: e.evt.clientY };
        setStagePos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      } else if (selectionBox.active) {
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition();
        if (pointer) {
          const docX = (pointer.x - stagePos.x) / zoom;
          const docY = (pointer.y - stagePos.y) / zoom;
          setSelectionBox((prev) => ({
            ...prev,
            endX: docX,
            endY: docY,
          }));
        }
      } else if (activeTool === 'select' && doc.layers.length > 0) {
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition();
        let hovering = false;
        if (pointer && stage) {
          const tr = stage.findOne('Transformer') as Konva.Transformer | undefined;
          if (tr && tr.isVisible() && tr.nodes().length > 0) {
            const transform = tr.getAbsoluteTransform().copy();
            transform.invert();
            const p = transform.point(pointer);
            const w = tr.width();
            const h = tr.height();
            const pad = 24;

            const dx = p.x < 0 ? -p.x : p.x > w ? p.x - w : 0;
            const dy = p.y < 0 ? -p.y : p.y > h ? p.y - h : 0;

            if (dx > 0 && dy > 0 && dx < pad && dy < pad) {
              hovering = true;
            }
          }
        }
        if (isHoveringRotate !== hovering) {
          setIsHoveringRotate(hovering);
        }
      }
    },
    [selectionBox.active, stagePos, zoom, activeTool, doc.layers.length, isHoveringRotate]
  );

  const handleMouseUp = useCallback(() => {
    if (manualRotateRef.current.active) {
      manualRotateRef.current.active = false;
      const state = manualRotateRef.current;
      const stage = stageRef.current;
      useCanvasStore.getState().saveToHistory();

      state.nodes.forEach((nData) => {
        const node = stage?.findOne(`#${nData.id}`);
        if (node) {
          useCanvasStore.getState().updateLayer(nData.id, {
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
          });
        }
      });
      return;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
    }

    if (selectionBox.active) {
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);

      const selectedIds: string[] = [];
      const thresholdArea = 10; // If they just clicked (0 width), skip marquee logic.
      const boxArea = (maxX - minX) * (maxY - minY);

      if (boxArea > thresholdArea) {
        for (const layer of doc.layers) {
          // Avoid overlapping tests for locked items
          if (layer.locked) continue;

          const ldx = layer.width || 0;
          const ldy = layer.height || 0;

          // Fast AABB intersection
          const overlap =
            maxX > layer.x &&
            minX < (layer.x + ldx) &&
            maxY > layer.y &&
            minY < (layer.y + ldy);

          if (overlap) {
            selectedIds.push(layer.id);
          }
        }
        setSelectedLayers(selectedIds);
      }
      setSelectionBox((prev) => ({ ...prev, active: false }));
    }
  }, [selectionBox, doc.layers, setSelectedLayers, setIsPanning]);



  const [draggingNewGuide, setDraggingNewGuide] = useState<{ orientation: 'horizontal' | 'vertical', position: number } | null>(null);

  const handleRulerPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>, orientation: 'horizontal' | 'vertical') => {
    e.preventDefault();
    const isH = orientation === 'horizontal';
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenPos = isH ? e.clientY - rect.top : e.clientX - rect.left;
    const docPos = isH ? (screenPos - stagePos.y) / zoom : (screenPos - stagePos.x) / zoom;
    setDraggingNewGuide({ orientation, position: docPos });
  }, [stagePos, zoom]);

  useEffect(() => {
    if (!draggingNewGuide) return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const isH = draggingNewGuide.orientation === 'horizontal';
      const screenPos = isH ? e.clientY - rect.top : e.clientX - rect.left;
      const docPos = isH ? (screenPos - stagePos.y) / zoom : (screenPos - stagePos.x) / zoom;
      setDraggingNewGuide(prev => prev ? { ...prev, position: docPos } : null);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const isH = draggingNewGuide.orientation === 'horizontal';
        const screenPos = isH ? e.clientY - rect.top : e.clientX - rect.left;
        if (screenPos > 24) { // Only add if dropped into canvas area
          addGuide({ id: uuidv4(), orientation: draggingNewGuide.orientation, position: draggingNewGuide.position });
        }
      }
      setDraggingNewGuide(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingNewGuide, stagePos, zoom, addGuide]);

  const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M16 8C16 12.4183 12.4183 16 8 16V13L3 17.5L8 22V19C14.0751 19 19 14.0751 19 8H16Z" fill="black" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>'
  )}") 16 8, auto`;

  const isPanning_ = isPanningRef.current || activeTool === 'pan';
  let cursorStyle = isPanning_ ? 'grab' : activeTool === 'text' ? 'text' : 'default';
  if (isPanning_) cursorStyle = 'grabbing';
  else if (activeTool === 'shape') cursorStyle = 'crosshair';
  else if (isHoveringRotate) cursorStyle = ROTATE_CURSOR;
  if (selectionBox.active) cursorStyle = 'crosshair';

  return (
    <div
      {...dropzoneProps}
      ref={mergedRef}
      className="relative flex-1 overflow-hidden bg-[#141414]"
      style={{ cursor: cursorStyle }}
    >
      <input {...getInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">Drop images here</p>
            <p className="text-sm text-muted-foreground mt-1">
              PNG, JPG, WebP, GIF, SVG
            </p>
          </div>
        </div>
      )}

      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Layer>
          {/* Canvas shadow */}
          <Rect
            x={-4}
            y={-4}
            width={doc.width + 8}
            height={doc.height + 8}
            fill="transparent"
            shadowBlur={20}
            shadowColor="rgba(0,0,0,0.5)"
            shadowOffsetX={0}
            shadowOffsetY={4}
            listening={false}
            name="canvas-shadow"
          />

          {/* Clipped canvas content */}
          <Group
            clipX={0}
            clipY={0}
            clipWidth={doc.width}
            clipHeight={doc.height}
          >
            {/* Canvas background */}
            {doc.background === 'transparent' ? (
              <Rect
                x={0}
                y={0}
                width={doc.width}
                height={doc.height}
                fillPatternImage={checkerPattern}
                fillPatternRepeat="repeat"
                listening={false}
                perfectDrawEnabled={false}
                name="canvas-bg"
              />
            ) : (
              <Rect
                x={0}
                y={0}
                width={doc.width}
                height={doc.height}
                fill={doc.background}
                name="canvas-bg"
              />
            )}

            {/* Render layers (hierarchically resolving masks) */}
            {doc.layers.filter(l => !l.clippedToId).map((layer) => {
              if (layer.isMask) {
                const clippedLayers = doc.layers.filter(l => l.clippedToId === layer.id);
                return (
                  <Group
                    key={`mask-group-${layer.id}`}
                    clipFunc={(ctx) => roundedRectClip(ctx, layer)}
                  >
                    <CanvasLayer key={layer.id} layer={layer} />
                    {clippedLayers.map(cl => (
                      <CanvasLayer key={cl.id} layer={cl} />
                    ))}
                  </Group>
                );
              }
              return <CanvasLayer key={layer.id} layer={layer} />;
            })}

            {/* Grid overlay */}
            {showGrid && (
              <Group listening={false}>
                {Array.from({ length: Math.ceil(doc.width / 50) + 1 }).map((_, i) => (
                  <Rect
                    key={`gv-${i}`}
                    x={i * 50}
                    y={0}
                    width={1}
                    height={doc.height}
                    fill="rgba(128,128,128,0.4)"
                    name="grid-line"
                  />
                ))}
                {Array.from({ length: Math.ceil(doc.height / 50) + 1 }).map((_, i) => (
                  <Rect
                    key={`gh-${i}`}
                    x={0}
                    y={i * 50}
                    width={doc.width}
                    height={1}
                    fill="rgba(128,128,128,0.4)"
                    name="grid-line"
                  />
                ))}
              </Group>
            )}

            {/* Selection Box */}
            {selectionBox.active && (
              <Rect
                x={Math.min(selectionBox.startX, selectionBox.endX)}
                y={Math.min(selectionBox.startY, selectionBox.endY)}
                width={Math.abs(selectionBox.endX - selectionBox.startX)}
                height={Math.abs(selectionBox.endY - selectionBox.startY)}
                fill="rgba(24, 160, 251, 0.15)"
                stroke="#18a0fb"
                strokeWidth={1 / zoom}
                listening={false}
              />
            )}
          </Group>

          {/* Selection transformer (outside clip so handles are visible) */}
          <SelectionTransformer stageRef={stageRef} />
          <RadiusHandles zoom={zoom} stageRef={stageRef} />

          {/* Figma-style Snapping Grid Overlay */}
          <SnapLinesOverlay />

          {/* Guides */}
          {showRulers && (
            <Group>
              {doc.guides?.map(guide => (
                <Line
                  key={guide.id}
                  points={
                    guide.orientation === 'horizontal'
                      ? [-100000, guide.position, 100000, guide.position]
                      : [guide.position, -100000, guide.position, 100000]
                  }
                  stroke="rgba(0, 255, 255, 0.8)"
                  strokeWidth={1 / zoom}
                  hitStrokeWidth={15 / zoom}
                  draggable={activeTool === 'select'}
                  dragBoundFunc={(pos) => {
                    return guide.orientation === 'horizontal'
                      ? { x: 0, y: pos.y }
                      : { x: pos.x, y: 0 };
                  }}
                  onDragEnd={(e) => {
                    const node = e.target;
                    const newPos = guide.orientation === 'horizontal' ? node.y() : node.x();
                    const screenPos = guide.orientation === 'horizontal'
                      ? newPos * zoom + stagePos.y
                      : newPos * zoom + stagePos.x;

                    if (screenPos < 24) {
                      removeGuide(guide.id);
                    } else {
                      updateGuide(guide.id, newPos);
                    }
                    node.position({ x: 0, y: 0 }); // reset absolute position mutation
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) {
                      container.style.cursor = guide.orientation === 'horizontal' ? 'row-resize' : 'col-resize';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) {
                      container.style.cursor = cursorStyle;
                    }
                  }}
                />
              ))}

              {/* Ghost Guide for dropping */}
              {draggingNewGuide && (
                <Line
                  points={
                    draggingNewGuide.orientation === 'horizontal'
                      ? [-100000, draggingNewGuide.position, 100000, draggingNewGuide.position]
                      : [draggingNewGuide.position, -100000, draggingNewGuide.position, 100000]
                  }
                  stroke="rgba(0, 255, 255, 0.8)"
                  strokeWidth={1 / zoom}
                  listening={false}
                />
              )}
            </Group>
          )}
        </Layer>
      </Stage>

      {/* Rulers Overlay */}
      {showRulers && (
        <>
          <Ruler
            orientation="horizontal"
            width={containerSize.width}
            height={24}
            zoom={zoom}
            offset={stagePos.x}
            onPointerDown={handleRulerPointerDown}
          />
          <Ruler
            orientation="vertical"
            width={24}
            height={containerSize.height}
            zoom={zoom}
            offset={stagePos.y}
            onPointerDown={handleRulerPointerDown}
          />
          {/* Corner Block */}
          <div
            className="absolute top-0 left-0 w-6 h-6 z-20 bg-[#1e1e1e] border-r border-b border-[#2e2e2e]"
          />
        </>
      )}
    </div>
  );
});

CanvasStage.displayName = 'CanvasStage';
