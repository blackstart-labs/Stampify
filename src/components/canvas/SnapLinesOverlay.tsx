import React from 'react';
import { Group, Line } from 'react-konva';
import { useCanvasStore } from '@/store/canvasStore';

export const SnapLinesOverlay: React.FC = () => {
  const snapLines = useCanvasStore((s) => s.snapLines);
  const zoom = useCanvasStore((s) => s.zoom);

  // We optimize performance by returning nothing if no snap lines are active.
  if (!snapLines || snapLines.length === 0) return null;

  return (
    <Group listening={false} name="snap-overlay">
      {snapLines.map((snap) => (
        <Line
          key={snap.id}
          points={
            snap.orientation === 'H'
              ? [-100000, snap.guide, 100000, snap.guide]
              : [snap.guide, -100000, snap.guide, 100000]
          }
          stroke="#ff007f" // Figma pink
          strokeWidth={1 / zoom}
          dash={[5 / zoom, 5 / zoom]}
          listening={false}
        />
      ))}
    </Group>
  );
};
