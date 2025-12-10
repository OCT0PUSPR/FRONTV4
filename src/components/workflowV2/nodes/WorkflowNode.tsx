import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeData } from '../../../types/workflow';
import * as LucideIcons from 'lucide-react';
import './WorkflowNode.css';

type WorkflowNodeProps = {
  id: string;
  data: NodeData;
  selected?: boolean;
};

const WorkflowNode = memo(({ id, data, selected }: WorkflowNodeProps) => {
  const { properties, icon, type } = data;
  const label = properties.label || type;
  const description = properties.description || '';

  // Get the icon component from lucide-react
  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.Circle;

  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id={`${id}-target`}
        className="workflow-node-handle"
      />
      
      <div className="workflow-node-header">
        <div className="workflow-node-icon">
          <IconComponent size={20} />
        </div>
        <div className="workflow-node-content">
          <div className="workflow-node-label">{label}</div>
          {description && (
            <div className="workflow-node-description">{description}</div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-source`}
        className="workflow-node-handle"
      />
    </div>
  );
});

WorkflowNode.displayName = 'WorkflowNode';

export default WorkflowNode;

