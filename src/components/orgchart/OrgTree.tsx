import React from 'react';
import { OrgNode } from './types';
import NodeCard from './NodeCard';
import { motion } from 'framer-motion';
import { useTheme } from '../../../context/theme';

interface OrgTreeProps {
  data: OrgNode;
  onAddChild: (parentId: string) => void;
  onUpdateNode: (node: OrgNode) => void;
  onDeleteNode: (nodeId: string) => void;
}

const OrgTree: React.FC<OrgTreeProps> = ({ data, onAddChild, onUpdateNode, onDeleteNode }) => {
  const { colors, mode } = useTheme();
  
  const connectorColor = mode === 'dark'
    ? 'rgba(255, 255, 255, 0.15)'
    : 'rgba(0, 0, 0, 0.15)';
  
  const treeStyles = `
    .tree ul {
      padding-top: 20px; 
      position: relative;
      transition: all 0.5s;
      display: flex;
      justify-content: center;
    }
    
    .tree li {
      float: left; text-align: center;
      list-style-type: none;
      position: relative;
      padding: 20px 5px 0 5px;
      transition: all 0.5s;
    }

    /* Vertical line connector from parent */
    .tree li::before, .tree li::after {
      content: '';
      position: absolute; top: 0; right: 50%;
      border-top: 1px solid ${connectorColor};
      width: 50%; height: 20px;
      z-index: 0;
    }
    .tree li::after {
      right: auto; left: 50%;
      border-left: 1px solid ${connectorColor};
    }

    /* Remove left connector from first child and right connector from last child */
    .tree li:only-child::after, .tree li:only-child::before {
      display: none;
    }
    .tree li:only-child { 
      padding-top: 0;
    }
    .tree li:first-child::before, .tree li:last-child::after {
      border: 0 none;
    }
    
    /* Adding the vertical connector from the connectors to the node */
    .tree li:last-child::before{
      border-right: 1px solid ${connectorColor};
      border-radius: 0 5px 0 0;
    }
    .tree li:first-child::after{
      border-radius: 5px 0 0 0;
    }
    
    /* Downward connector from parent node to children list */
    .tree ul ul::before{
      content: '';
      position: absolute; top: 0; left: 50%;
      border-left: 1px solid ${connectorColor};
      width: 0; height: 20px;
    }
  `;
  return (
    <div className="tree">
      <style>{treeStyles}</style>
      <ul>
        <motion.li
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 0.5 }}
        >
          <NodeCard 
            node={data} 
            onAddChild={onAddChild} 
            onUpdateNode={onUpdateNode}
            onDeleteNode={onDeleteNode}
          />
          {data.children && data.children.length > 0 && (
            <ul>
              {data.children.map((child) => (
                <li key={child.id}>
                   <RecursiveBranch 
                      node={child} 
                      onAddChild={onAddChild} 
                      onUpdateNode={onUpdateNode}
                      onDeleteNode={onDeleteNode}
                   />
                </li>
              ))}
            </ul>
          )}
        </motion.li>
      </ul>
    </div>
  );
};

// Helper component to strip the top-level <ul> which OrgTree has, 
// ensuring we don't nest <ul> inside <ul> improperly for the CSS tree logic.
const RecursiveBranch: React.FC<{ 
    node: OrgNode; 
    onAddChild: (id: string) => void; 
    onUpdateNode: (n: OrgNode) => void;
    onDeleteNode: (id: string) => void;
}> = ({ node, onAddChild, onUpdateNode, onDeleteNode }) => {
    return (
        <>
           <NodeCard 
                node={node} 
                onAddChild={onAddChild} 
                onUpdateNode={onUpdateNode}
                onDeleteNode={onDeleteNode}
            />
            {node.children && node.children.length > 0 && (
                <ul>
                    {node.children.map((child) => (
                        <li key={child.id}>
                            <RecursiveBranch 
                                node={child} 
                                onAddChild={onAddChild} 
                                onUpdateNode={onUpdateNode}
                                onDeleteNode={onDeleteNode}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}

export default OrgTree;