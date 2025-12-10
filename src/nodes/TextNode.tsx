
import React, { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { TextNodeData } from '../../types';

const TextNode: React.FC<NodeProps<TextNodeData>> = ({ data, selected }) => {
    return (
        <div className={`px-2 py-1 ${selected ? 'border-2 border-blue-500' : ''}`}>
            <p className="text-lg font-medium">{data.label || 'Text'}</p>
        </div>
    );
};

export default memo(TextNode);
