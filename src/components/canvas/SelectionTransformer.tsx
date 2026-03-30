import React, { useRef, useEffect } from 'react';
import { Transformer, Group, Rect, Path } from 'react-konva';
import type Konva from 'konva';
import { useCanvasStore } from '@/store/canvasStore';

interface SelectionTransformerProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export const SelectionTransformer: React.FC<SelectionTransformerProps> = ({ stageRef }) => {
  const trRef = useRef<Konva.Transformer>(null);
  const { selectedLayerIds, document: doc, saveToHistory } = useCanvasStore();
  const [, forceUpdate] = React.useState({});

  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    const nodes = selectedLayerIds
      .map((id) => stage.findOne(`#${id}`))
      .filter((n): n is Konva.Node => n !== undefined && n !== null);

    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
    forceUpdate({});
  }, [selectedLayerIds, doc.layers, stageRef]);

  if (selectedLayerIds.length === 0) return null;

  const tr = trRef.current;
  const trWidth = tr?.width() || 0;
  const trHeight = tr?.height() || 0;
  const stageScale = tr?.getLayer()?.getStage()?.scaleX() || 1;
  const offset = 24 / stageScale;
  const iconSize = 16 / stageScale;
  const ROTATE_ICON_PATH = "M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.7712 3 17.2582 4.25471 18.9192 6.22222M21 3V9H15";

  const renderIcon = (x: number, y: number, key: string) => (
    <Group x={x} y={y} key={key} listening={false}>
      <Rect
        x={-iconSize/2}
        y={-iconSize/2}
        width={iconSize}
        height={iconSize}
        fill="white"
        cornerRadius={iconSize}
        stroke="#2563eb"
        strokeWidth={0.5}
        shadowBlur={2}
        shadowColor="rgba(0,0,0,0.2)"
      />
      <Path
        data={ROTATE_ICON_PATH}
        x={-iconSize/2}
        y={-iconSize/2}
        scaleX={iconSize / 24}
        scaleY={iconSize / 24}
        stroke="#2563eb"
        strokeWidth={2}
        lineCap="round"
        lineJoin="round"
      />
    </Group>
  );

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
      onTransform={() => forceUpdate({})}
      anchorFill="#FFFFFF"
      anchorStroke="#2563eb"
      anchorSize={8}
      anchorCornerRadius={10}
      borderStroke="#4f8ef7"
      borderStrokeWidth={1.5}
      enabledAnchors={[
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'top-center',
        'bottom-center',
        'middle-left',
        'middle-right'
      ]}
      rotateEnabled={false}
    >
      {/* Corner Rotation Icons */}
      {renderIcon(-offset, -offset, 'tl')}
      {renderIcon(trWidth + offset, -offset, 'tr')}
      {renderIcon(-offset, trHeight + offset, 'bl')}
      {renderIcon(trWidth + offset, trHeight + offset, 'br')}
    </Transformer>
  );
};
