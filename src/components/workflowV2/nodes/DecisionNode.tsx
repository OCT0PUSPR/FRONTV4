import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeData } from '../../../types/workflow';
import * as LucideIcons from 'lucide-react';
import './DecisionNode.css';

type DecisionNodeProps = {
  id: string;
  data: NodeData;
  selected?: boolean;
};

const DecisionNode = memo(({ id, data, selected }: DecisionNodeProps) => {
  const { properties, icon, type } = data;
  const label = properties.label || type;
  const description = properties.description || '';
  const branches = (properties.branches as any[]) || [];

  // Get the icon component from lucide-react
  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.GitBranch;

  return (
    <div className={`decision-node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id={`${id}-target`}
        className="decision-node-handle"
      />
      
      <div className="decision-node-header">
        <div className="decision-node-icon">
          <IconComponent size={20} />
        </div>
        <div className="decision-node-content">
          <div className="decision-node-label">{label}</div>
          {description && (
            <div className="decision-node-description">{description}</div>
          )}
        </div>
      </div>

      {branches.length > 0 && (
        <div className="decision-node-branches">
          {branches.map((branch, index) => (
            <div key={index} className="decision-node-branch">
              <span>{branch.label || `Branch ${index + 1}`}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`${id}-source-${index}`}
                className="decision-node-handle"
                style={{ top: `${50 + (index - branches.length / 2 + 0.5) * 30}%` }}
              />
            </div>
          ))}
        </div>
      )}

      {branches.length === 0 && (
        <Handle
          type="source"
          position={Position.Right}
          id={`${id}-source`}
          className="decision-node-handle"
        />
      )}
    </div>
  );
});

DecisionNode.displayName = 'DecisionNode';

export default DecisionNode;

