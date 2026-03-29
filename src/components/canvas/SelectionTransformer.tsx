import React, { useRef, useEffect } from 'react';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import { useCanvasStore } from '@/store/canvasStore';

interface SelectionTransformerProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export const SelectionTransformer: React.FC<SelectionTransformerProps> = ({ stageRef }) => {
  const trRef = useRef<Konva.Transformer>(null);
  const { selectedLayerIds, document: doc, saveToHistory } = useCanvasStore();

  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    const layer = stage.findOne('Layer');
    if (!layer) return;

    const nodes = selectedLayerIds
      .map((id) => stage.findOne(`#${id}`))
      .filter((n): n is Konva.Node => n !== undefined && n !== null);

    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedLayerIds, doc.layers, stageRef]);

  if (selectedLayerIds.length === 0) return null;

  return (
    <Transformer
      ref={trRef}
      flipEnabled={false}
      boundBoxFunc={(oldBox, newBox) => {
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
          return oldBox;
        }
        return newBox;
      }}
      onTransformStart={() => saveToHistory()}
      anchorFill="#4f8ef7"
      anchorStroke="#2563eb"
      borderStroke="#4f8ef7"
      borderStrokeWidth={1.5}
      anchorSize={8}
      anchorCornerRadius={2}
      enabledAnchors={[
        'top-left',
        'top-center',
        'top-right',
        'middle-left',
        'middle-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ]}
      rotateEnabled={true}
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      rotationSnapTolerance={5}
    />
  );
};
