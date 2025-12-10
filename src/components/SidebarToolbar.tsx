
import React, { useState } from 'react';
import useStore from '../../store/workflowStore';
import { NodeType } from '../../types';
import { Plus, Zap, Users, GitBranch, Mail, Settings2, CircleCheck, File, UsersRoundIcon, Timer } from 'lucide-react';
import { useReactFlow } from 'reactflow';

const SidebarToolbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const addNode = useStore((state) => state.addNode);
    const { screenToFlowPosition } = useReactFlow();

    const onAddNode = (type: NodeType) => {
        // Position new nodes in the center of the viewport using flow coordinates
        const centerScreen = { x: window.innerWidth / 10, y: window.innerHeight / 10 };
        const position = screenToFlowPosition(centerScreen);
        addNode(type, position);
        setIsOpen(false);
    }
    
    const nodeTypes = [
        { type: NodeType.TRIGGER, label: 'Trigger', icon: <Zap className="w-5 h-5"/> },
        { type: NodeType.APPROVAL, label: 'Approval', icon: <Users className="w-5 h-5"/> },
        { type: NodeType.CONDITION, label: 'Condition', icon: <GitBranch className="w-5 h-5"/> },
        { type: NodeType.NOTIFICATION, label: 'Notification', icon: <Mail className="w-5 h-5"/> },
        { type: NodeType.ACTION, label: 'Action', icon: <Settings2 className="w-5 h-5"/> },
        { type: NodeType.DOCUMENT, label: 'Document', icon: <File className="w-5 h-5"/> },
        { type: NodeType.ESCALATION, label: 'Escalation', icon: <UsersRoundIcon className="w-5 h-5"/> },
        { type: NodeType.DELAY, label: 'Delay', icon: <Timer className="w-5 h-5"/> },
        { type: NodeType.END, label: 'End', icon: <CircleCheck className="w-5 h-5"/> },
    ];

    return (
        <div className="absolute top-1/6 -translate-y-1/2 left-4 z-10 flex flex-col gap-3 pointer-events-none">
            <div className="relative pointer-events-auto">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-white font-bold p-3 rounded-lg shadow-md hover:bg-gray-100 transition text-gray-700"
                    title="Add Node"
                >
                    <Plus className="h-4 w-4" />
                </button>
                {isOpen && (
                    <div className="absolute left-full ml-4 w-48 bg-white rounded-lg shadow-xl py-2">
                        {nodeTypes.map(node => (
                             <button
                                key={node.type}
                                onClick={() => onAddNode(node.type)}
                                className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-700 hover:bg-blue-50 transition"
                            >
                                {node.icon}
                                {node.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SidebarToolbar;
