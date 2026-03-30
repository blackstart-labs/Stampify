import React, { useEffect, useRef } from 'react';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  width: number;
  height: number;
  zoom: number;
  offset: number;
  onPointerDown?: (e: React.PointerEvent<HTMLCanvasElement>, orientation: 'horizontal' | 'vertical') => void;
}

export const Ruler: React.FC<RulerProps> = ({ orientation, width, height, zoom, offset, onPointerDown }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support high DPI displays
    const dpr = window.devicePixelRatio || 1;
    // We only need to set logical size once (handled by React width/height props), 
    // but actual internal resolution needs to match DPR
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Ruler background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.beginPath();
    ctx.strokeStyle = '#2e2e2e';
    ctx.lineWidth = 1;
    const isH = orientation === 'horizontal';
    
    if (isH) {
      ctx.moveTo(0, height);
      ctx.lineTo(width, height);
    } else {
      ctx.moveTo(width, 0);
      ctx.lineTo(width, height);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#666688';
    ctx.fillStyle = '#8888aa';
    ctx.font = '10px sans-serif';

    // Rulers indicate document space.
    // Document coordinate X = (ScreenX - offset) / zoom
    // We want ticks every round number Document Space.
    let step = 100;
    while (step * zoom < 60) step *= 2;
    while (step * zoom > 150) step /= 2;

    const subTicks = 10;
    const subStep = step / subTicks;

    const maxScreen = isH ? width : height;
    
    const startDoc = (-offset) / zoom;
    const endDoc = (maxScreen - offset) / zoom;
    
    const startTick = Math.floor(startDoc / subStep) * subStep;

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (let docPos = startTick; docPos <= endDoc; docPos += subStep) {
      const screenPos = docPos * zoom + offset;
      if (screenPos < 0 || screenPos > maxScreen) continue;

      const isPrimary = Math.abs(docPos % step) < 0.001;
      const isMid = Math.abs(docPos % (step / 2)) < 0.001;

      let tickLength = 4;
      if (isPrimary) tickLength = height;
      else if (isMid) tickLength = Math.floor(height * 0.6);

      // Add half pixel to avoid line blurring
      const x = isH ? Math.floor(screenPos) + 0.5 : 0;
      const y = isH ? height - tickLength : Math.floor(screenPos) + 0.5;

      if (isH) {
        ctx.moveTo(x, height);
        ctx.lineTo(x, height - tickLength);
      } else {
        ctx.moveTo(width, y);
        ctx.lineTo(width - tickLength, y);
      }

      if (isPrimary) {
        if (isH) {
          ctx.fillText(Math.round(docPos).toString(), x + 3, height - 12);
        } else {
          ctx.save();
          ctx.translate(width - 4, y);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(Math.round(docPos).toString(), -10, 0);
          ctx.restore();
        }
      }
    }
    
    ctx.stroke();

  }, [width, height, zoom, offset, orientation]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={(e) => onPointerDown?.(e, orientation)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: width + 'px',
        height: height + 'px',
        pointerEvents: 'auto',
        cursor: orientation === 'horizontal' ? 'row-resize' : 'col-resize',
        zIndex: 10,
        display: 'block'
      }}
    />
  );
};
