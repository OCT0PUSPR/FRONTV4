import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import './LabelEdge.css';

const LabelEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Use the edge's style color if available, otherwise use default
  const strokeColor = (style as any)?.stroke || '#94a3b8';

  return (
    <>
      <path
        id={id}
        className={`label-edge-path ${selected ? 'selected' : ''}`}
        d={edgePath}
        strokeWidth={(style as any)?.strokeWidth || 2}
        stroke={strokeColor}
        fill="none"
        style={{ stroke: strokeColor }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="label-edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {String(data.label)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

LabelEdge.displayName = 'LabelEdge';

export default LabelEdge;

