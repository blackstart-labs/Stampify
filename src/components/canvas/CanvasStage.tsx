import React, { useRef, useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Rect, Group } from 'react-konva';
import Konva from 'konva';
import { useCanvasStore } from '@/store/canvasStore';
import { CanvasLayer } from './CanvasLayer';
import { SelectionTransformer } from './SelectionTransformer';
import { useDropzone } from 'react-dropzone';
import { useImageImport } from '@/hooks/useImageImport';

const CHECKERBOARD_SIZE = 16;

export interface CanvasStageHandle {
  getStage: () => Konva.Stage | null;
  fitToScreen: () => void;
}

export const CanvasStage = forwardRef<CanvasStageHandle>((_props, ref) => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const hasInitialZoom = useRef(false);
  const [measureCount, setMeasureCount] = useState(0);

  const {
    document: doc,
    zoom,
    setZoom,
    selectedLayerIds,
    setSelectedLayers,
    activeTool,
    showGrid,
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
  const docIdRef = useRef(doc.id);
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

      // Click on empty area -> deselect
      const target = e.target;
      const clickedOnEmpty =
        target === target.getStage() ||
        target.name() === 'canvas-bg' ||
        target.name() === 'checkerboard' ||
        target.name() === 'canvas-shadow' ||
        target.name() === 'grid-line';

      if (clickedOnEmpty && activeTool === 'select') {
        setSelectedLayers([]);
      }
    },
    [activeTool, setSelectedLayers, setIsPanning]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isPanningRef.current) return;
      const dx = e.evt.clientX - lastPointerPos.current.x;
      const dy = e.evt.clientY - lastPointerPos.current.y;
      lastPointerPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      setStagePos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
    }
  }, [setIsPanning]);



  const isPanning_ = isPanningRef.current || activeTool === 'pan';
  const cursorStyle = isPanning_
    ? 'grab'
    : activeTool === 'text'
    ? 'text'
    : 'default';

  return (
    <div
      {...dropzoneProps}
      ref={mergedRef}
      className="relative flex-1 overflow-hidden bg-[#1a1a2e]"
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
                    fill="rgba(255,255,255,0.1)"
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
                    fill="rgba(255,255,255,0.1)"
                    name="grid-line"
                  />
                ))}
              </Group>
            )}

            {/* Render layers */}
            {doc.layers.map((layer) => (
              <CanvasLayer key={layer.id} layer={layer} />
            ))}
          </Group>

          {/* Selection transformer (outside clip so handles are visible) */}
          <SelectionTransformer stageRef={stageRef} />
        </Layer>
      </Stage>
    </div>
  );
});

CanvasStage.displayName = 'CanvasStage';
