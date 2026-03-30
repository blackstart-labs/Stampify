import type { CanvasDocument } from '@/types';

export interface SnapLine {
  id: string;
  guide: number;    // X or Y coordinate in document space to render the line
  orientation: 'V' | 'H'; // V for vertical line (snapping to X), H for horizontal (snapping to Y)
  snapType: 'start' | 'center' | 'end'; 
}

const SNAP_THRESHOLD = 5;

// All snap points generated for a given document state
interface SnappingEdges {
  vertical: number[];   // array of X coordinates we can snap to
  horizontal: number[]; // array of Y coordinates we can snap to
}

/**
 * Gather all snap points from the document targets (center, guides, grid, other layers).
 */
export function getSnappingEdges(
  doc: CanvasDocument,
  excludeLayerId: string | null,
  showGrid: boolean
): SnappingEdges {
  const edges: SnappingEdges = {
    vertical: [],
    horizontal: [],
  };

  // 1. Canvas Center
  edges.vertical.push(doc.width / 2);
  edges.horizontal.push(doc.height / 2);

  // 2. Canvas Boundaries
  edges.vertical.push(0, doc.width);
  edges.horizontal.push(0, doc.height);

  // 3. User Guides
  if (doc.guides) {
    doc.guides.forEach((g) => {
      if (g.orientation === 'vertical') edges.vertical.push(g.position);
      if (g.orientation === 'horizontal') edges.horizontal.push(g.position);
    });
  }

  // 4. Other Layers (simplified non-rotated bounds)
  // For highly complex rotation, getClientRect() could be used externally,
  // but for raw document layers we use their unrotated bounding box.
  doc.layers.forEach((layer) => {
    if (layer.id === excludeLayerId) return;
    
    // Horizontal edges (Y axis)
    edges.horizontal.push(layer.y); // top
    edges.horizontal.push(layer.y + layer.height / 2); // center
    edges.horizontal.push(layer.y + layer.height); // bottom

    // Vertical edges (X axis)
    edges.vertical.push(layer.x); // left
    edges.vertical.push(layer.x + layer.width / 2); // center
    edges.vertical.push(layer.x + layer.width); // right
  });

  // 5. Grid Lines
  if (showGrid) {
    for (let x = 0; x <= doc.width; x += 50) edges.vertical.push(x);
    for (let y = 0; y <= doc.height; y += 50) edges.horizontal.push(y);
  }

  return edges;
}

/**
 * Calculate the snapped position for a dragging object.
 */
export function getSnappedPosition(
  pos: { x: number; y: number },
  box: { width: number; height: number },
  edges: SnappingEdges,
  zoom: number // Required to scale THRESHOLD to screen space if necessary
): { position: { x: number; y: number }; snapLines: SnapLine[] } {
  const snappedPos = { ...pos };
  const snapLines: SnapLine[] = [];
  
  // Convert threshold to document space scale
  const threshold = SNAP_THRESHOLD / zoom;

  // Horizontal Snapping (Testing Drag Y against Target Y)
  const yEdges = [
    { offset: 0, snapType: 'start' as const }, // Top edge
    { offset: box.height / 2, snapType: 'center' as const }, // Center
    { offset: box.height, snapType: 'end' as const }, // Bottom edge
  ];

  let closestH = { diff: Infinity, snapEdge: 0, targetEdge: 0, snapType: 'start' as 'start' | 'center' | 'end' };

  for (const dragEdge of yEdges) {
    const dragY = pos.y + dragEdge.offset;
    for (const targetY of edges.horizontal) {
      const diff = Math.abs(dragY - targetY);
      if (diff < closestH.diff && diff <= threshold) {
        closestH = { diff, snapEdge: dragEdge.offset, targetEdge: targetY, snapType: dragEdge.snapType };
      }
    }
  }

  if (closestH.diff <= threshold) {
    snappedPos.y = closestH.targetEdge - closestH.snapEdge;
    snapLines.push({
      id: `h-${closestH.targetEdge}`,
      guide: closestH.targetEdge,
      orientation: 'H',
      snapType: closestH.snapType,
    });
  }

  // Vertical Snapping (Testing Drag X against Target X)
  const xEdges = [
    { offset: 0, snapType: 'start' as const }, // Left edge
    { offset: box.width / 2, snapType: 'center' as const }, // Center
    { offset: box.width, snapType: 'end' as const }, // Right edge
  ];

  let closestV = { diff: Infinity, snapEdge: 0, targetEdge: 0, snapType: 'start' as 'start' | 'center' | 'end' };

  for (const dragEdge of xEdges) {
    const dragX = pos.x + dragEdge.offset;
    for (const targetX of edges.vertical) {
      const diff = Math.abs(dragX - targetX);
      if (diff < closestV.diff && diff <= threshold) {
        closestV = { diff, snapEdge: dragEdge.offset, targetEdge: targetX, snapType: dragEdge.snapType };
      }
    }
  }

  if (closestV.diff <= threshold) {
    snappedPos.x = closestV.targetEdge - closestV.snapEdge;
    snapLines.push({
      id: `v-${closestV.targetEdge}`,
      guide: closestV.targetEdge,
      orientation: 'V',
      snapType: closestV.snapType,
    });
  }

  return { position: snappedPos, snapLines };
}
