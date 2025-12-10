import React, { useMemo, useCallback, useRef, useState, MouseEvent, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  useReactFlow,
  Edge,
  BackgroundVariant,
  Connection,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import useStore from '../store/workflowStore';
import { NodeType, NodeData } from '../types';
import { useParams } from 'react-router-dom';
import { API_CONFIG } from './config/api';

import TriggerNode from './nodes/TriggerNode';
import ApprovalNode from './nodes/ApprovalNode';
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';
import NotificationNode from './nodes/NotificationNode';
import EndNode from './nodes/EndNode';
import TextNode from './nodes/TextNode';
import PersonNode from './nodes/PersonNode';
import DocumentNode from './nodes/DocumentNode';
import EscalationNode from './nodes/EscalationNode';
import DelayNode from './nodes/DelayNode';

import HeaderToolbar from './components/HeaderToolbar';
import SidebarToolbar from './components/SidebarToolbar';
import NodeSettingsPanel from './components/NodeSettingsPanel';
import EdgeSettingsPanel from './components/EdgeSettingsPanel';

import { Copy, Trash2 } from 'lucide-react';

const WorkflowBuilder: React.FC = () => {
    const { 
        nodes, 
        edges, 
        onNodesChange, 
        onEdgesChange, 
        setSelectedNode, 
        setSelectedEdge, 
        selectedNode, 
        selectedEdge, 
        deleteNode, 
        duplicateNode,
        setEdges 
    } = useStore();
    
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; node: Node<NodeData> } | null>(null);

    const nodeTypes = useMemo(() => ({
        [NodeType.TRIGGER]: TriggerNode,
        [NodeType.PERSON]: PersonNode,
        [NodeType.APPROVAL]: ApprovalNode,
        [NodeType.CONDITION]: ConditionNode,
        [NodeType.ACTION]: ActionNode,
        [NodeType.NOTIFICATION]: NotificationNode,
        [NodeType.DOCUMENT]: DocumentNode,
        [NodeType.ESCALATION]: EscalationNode,
        [NodeType.DELAY]: DelayNode,
        [NodeType.END]: EndNode,
        [NodeType.TEXT]: TextNode
    }), []);

    const params = useParams();
    const workflowId = params?.id;

    // Load existing workflow if id is in route; otherwise clear canvas
    useEffect(() => {
        const load = async () => {
            try {
                if (workflowId) {
                    const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${workflowId}`);
                    if (!res.ok) throw new Error(`Failed to fetch workflow (${res.status})`);
                    const json = await res.json();
                    const data = json?.data || {};
                    const rfNodes = Array.isArray(data.nodes) ? data.nodes : [];
                    const rfEdges = Array.isArray(data.edges) ? data.edges : [];
                    useStore.getState().setNodes(rfNodes as any);
                    useStore.getState().setEdges(rfEdges as any);
                } else {
                    if (nodes.length > 0 || edges.length > 0) {
                        useStore.getState().setNodes([]);
                        useStore.getState().setEdges([]);
                    }
                }
            } catch (e) {
                console.error('[Builder] Load error:', e);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflowId]);

    // UPDATED: Enhanced onConnect to handle condition nodes
    const onConnect = useCallback((params: Connection) => {
        const sourceNode = nodes.find(n => n.id === params.source);
        
        // If source is a condition node, add appropriate label and styling
        if (sourceNode?.type === NodeType.CONDITION) {
            const isTrue = params.sourceHandle === 'true';
            const label = isTrue ? 'true' : 'false';
            
            setEdges(
                addEdge({
                    ...params,
                    id: `${params.source}-${params.target}-${params.sourceHandle}`,
                    label,
                    animated: true,
                    style: {
                        stroke: isTrue ? '#10b981' : '#ef4444',
                        strokeWidth: 2
                    },
                    labelStyle: {
                        fill: isTrue ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                        fontSize: 12
                    },
                    labelBgStyle: {
                        fill: '#ffffff',
                        fillOpacity: 0.9
                    }
                }, edges)
            );
        } else {
            // Default edge for non-condition nodes
            setEdges(
                addEdge({
                    ...params,
                    animated: true,
                    style: {
                        strokeWidth: 2
                    }
                }, edges)
            );
        }
    }, [nodes, edges, setEdges]);

    const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
        setContextMenu(null);
    }, [setSelectedNode]);

    const handlePaneClick = useCallback(() => {
        setSelectedNode(null);
        setSelectedEdge(null);
        setContextMenu(null);
    }, [setSelectedNode, setSelectedEdge]);

    const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        setSelectedEdge(edge);
        setContextMenu(null);
    }, [setSelectedEdge]);

    const onNodeContextMenu = useCallback(
        (event: MouseEvent, node: Node<NodeData>) => {
            event.preventDefault();
            setContextMenu({
                mouseX: event.clientX,
                mouseY: event.clientY,
                node,
            });
        },
        [setContextMenu],
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const hasType = !!event.dataTransfer.getData('application/reactflow');
            if (!hasType || !reactFlowWrapper.current) return;

            screenToFlowPosition({ x: event.clientX, y: event.clientY });
        },
        [screenToFlowPosition]
    );

    const handleDuplicate = () => {
        if (contextMenu?.node) {
            duplicateNode(contextMenu.node);
        }
        setContextMenu(null);
    };

    const handleDelete = () => {
        if (contextMenu?.node) {
            deleteNode(contextMenu.node.id);
        }
        setContextMenu(null);
    };

    // Helper to get edge color based on validation
    const getEdgeStyle = useCallback((edge: Edge) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        
        // Condition nodes should have colored edges
        if (sourceNode?.type === NodeType.CONDITION) {
            const isTrue = edge.sourceHandle === 'true' || edge.label === 'true';
            return {
                ...edge.style,
                stroke: isTrue ? '#10b981' : '#ef4444',
                strokeWidth: 2
            };
        }
        
        return edge.style;
    }, [nodes]);

    return (
        <div className="w-full h-[100vh] relative" ref={reactFlowWrapper}>
            <HeaderToolbar />
            <SidebarToolbar />
            
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onPaneClick={handlePaneClick}
                onNodeContextMenu={onNodeContextMenu}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={nodeTypes}
                fitView
                className="bg-dots"
                defaultEdgeOptions={{
                    animated: true,
                    style: { strokeWidth: 2 }
                }}
            >
                <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
                <Controls />
                <MiniMap 
                    nodeStrokeWidth={3} 
                    zoomable 
                    pannable
                    nodeColor={(node) => {
                        // Color nodes in minimap based on type
                        switch (node.type) {
                            case NodeType.TRIGGER:
                                return '#10b981';
                            case NodeType.CONDITION:
                                return '#f97316';
                            case NodeType.APPROVAL:
                                return '#3b82f6';
                            case NodeType.END:
                                return '#ef4444';
                            default:
                                return '#6b7280';
                        }
                    }}
                />
            </ReactFlow>

            {selectedNode && <NodeSettingsPanel />}
            {selectedEdge && <EdgeSettingsPanel />}

            {contextMenu && (
                <div
                    style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}
                    className="absolute z-50 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200"
                    onClick={() => setContextMenu(null)}
                >
                    <button 
                        onClick={handleDuplicate} 
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                        <Copy size={16}/> Duplicate
                    </button>
                    <button 
                        onClick={handleDelete} 
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                       <Trash2 size={16}/> Delete
                    </button>
                </div>
            )}
        </div>
    );
};

export default WorkflowBuilder;