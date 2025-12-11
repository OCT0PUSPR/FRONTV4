import { useCallback, DragEvent, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Connection,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore } from './stores/workflowStoreV2';
import { NodeType, NodeData } from './components/workflowV2/types';
import { useParams } from 'react-router-dom';
import { API_CONFIG, tenantFetch, getTenantHeaders } from './config/api';
import { useTheme } from '../context/theme';

import TriggerNode from './nodes/TriggerNode';
import ApprovalNode from './nodes/ApprovalNode';
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';
import NotificationNode from './nodes/NotificationNode';
import EndNode from './nodes/EndNode';
import PersonNode from './nodes/PersonNode';
import DocumentNode from './nodes/DocumentNode';
import EscalationNode from './nodes/EscalationNode';
import DelayNode from './nodes/DelayNode';
import ParallelNode from './nodes/ParallelNode';
import MergeNode from './nodes/MergeNode';
import AIAgentNode from './nodes/AIAgentNode';
import ToolNode from './nodes/ToolNode';

import { Palette } from './components/workflowV2/Palette/Palette';
import { PropertiesBar } from './components/workflowV2/PropertiesBar/PropertiesBar';
import { AppBar } from './components/workflowV2/AppBar/AppBar';
import { WorkflowTemplatesModal } from './components/workflowV2/WorkflowTemplatesModal';
import LabelEdge from './components/workflowV2/edges/LabelEdge';
import { paletteData } from './data/workflow/nodes-data';
import { useNavigate } from 'react-router-dom';
import Toast from './components/Toast';
import './workflowV2.css';

const nodeTypes = {
  [NodeType.TRIGGER]: TriggerNode,
  [NodeType.PERSON]: PersonNode,
  [NodeType.APPROVAL]: ApprovalNode,
  [NodeType.CONDITION]: ConditionNode,
  [NodeType.ACTION]: ActionNode,
  [NodeType.NOTIFICATION]: NotificationNode,
  [NodeType.DOCUMENT]: DocumentNode,
  [NodeType.ESCALATION]: EscalationNode,
  [NodeType.DELAY]: DelayNode,
  [NodeType.PARALLEL]: ParallelNode,
  [NodeType.MERGE]: MergeNode,
  [NodeType.AI_AGENT]: AIAgentNode,
  [NodeType.TOOL]: ToolNode,
  [NodeType.END]: EndNode,
};

const edgeTypes = {
  labelEdge: LabelEdge,
};

function WorkflowCanvas() {
  const { colors } = useTheme();
  const {
    nodes,
    edges,
    isSidebarExpanded,
    isPropertiesBarVisible,
    selectedNodes,
    selectedEdges,
    onNodesChange,
    onEdgesChange,
    onInit,
    onSelectionChange,
    toggleSidebar,
    togglePropertiesBar,
    addNode,
    updateNodeData,
    deleteSelectedElements,
    duplicateSelectedNodes,
    undo,
    redo,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    setEdges,
    setNodes,
    canUndo,
    canRedo,
    saveToHistory,
  } = useWorkflowStore();
  
  // Subscribe to history changes to update undo/redo button states
  const historyIndex = useWorkflowStore((state) => state.historyIndex);
  const historyLength = useWorkflowStore((state) => state.history.length);

  // Handle edge updates
  const handleUpdateEdge = useCallback((edgeId: string, data: any) => {
    const updatedEdges = edges.map((edge) => {
      if (edge.id === edgeId) {
        const updatedEdge: any = {
          ...edge,
        };
        
        // Handle source/target changes (direction reversal)
        if (data.source !== undefined) updatedEdge.source = data.source;
        if (data.target !== undefined) updatedEdge.target = data.target;
        if (data.sourceHandle !== undefined) updatedEdge.sourceHandle = data.sourceHandle;
        if (data.targetHandle !== undefined) updatedEdge.targetHandle = data.targetHandle;
        
        // Handle label
        if (data.label !== undefined) {
          updatedEdge.label = data.label;
          if (updatedEdge.data) {
            updatedEdge.data = { ...updatedEdge.data, label: data.label };
          }
        }
        
        // Handle animation
        if (data.animated !== undefined) {
          updatedEdge.animated = data.animated;
        }
        
        // Handle markers
        if (data.markerStart !== undefined) {
          updatedEdge.markerStart = data.markerStart;
        }
        if (data.markerEnd !== undefined) {
          updatedEdge.markerEnd = data.markerEnd;
        }
        
        // Handle type (line style)
        if (data.type !== undefined) {
          updatedEdge.type = data.type;
        }
        
        // Handle style updates
        if (data.style) {
          updatedEdge.style = { ...(edge.style || {}), ...data.style };
        }
        
        return updatedEdge;
      }
      return edge;
    });
    setEdges(updatedEdges, true); // Save to history when edge is updated
  }, [edges, setEdges]);

  // Handle edge deletion
  const handleDeleteEdge = useCallback((edgeId: string) => {
    const filteredEdges = edges.filter((edge) => edge.id !== edgeId);
    setEdges(filteredEdges, true); // Save to history when edge is deleted
  }, [edges, setEdges]);

  // Handle node deletion
  const handleDeleteNode = useCallback((nodeId: string) => {
    // Remove the node
    const filteredNodes = nodes.filter((node) => node.id !== nodeId);
    // Remove any edges connected to this node
    const filteredEdges = edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId
    );
    
    setNodes(filteredNodes, true); // Save to history when node is deleted
    setEdges(filteredEdges, true); // Save to history when edges are deleted
  }, [nodes, edges, setNodes, setEdges]);

  const reactFlowInstance = useReactFlow();
  const params = useParams();
  const navigate = useNavigate();
  const workflowId = params?.id;
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [workflowStatus, setWorkflowStatus] = useState<'active' | 'draft' | 'archived'>('draft');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [toast, setToast] = useState<{ text: string; state: 'success' | 'error' } | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Load existing workflow if id is in route; otherwise clear canvas
  useEffect(() => {
    const load = async () => {
      try {
        if (workflowId) {
          const res = await tenantFetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${workflowId}`);
          if (!res.ok) throw new Error(`Failed to fetch workflow (${res.status})`);
          const json = await res.json();
          const data = json?.data || {};
          const rfNodes = Array.isArray(data.nodes) ? data.nodes : [];
          const rfEdges = Array.isArray(data.edges) ? data.edges : [];
          
          // Set workflow name if available
          if (data.name) {
            setWorkflowName(data.name);
          }
          
          // Set workflow status if available
          if (data.status) {
            setWorkflowStatus(data.status as 'active' | 'draft' | 'archived');
          }
          
          // Load nodes and edges into store (without saving to history initially)
          setNodes(rfNodes as any, false);
          setEdges(rfEdges as any, false);
          
          // Initialize history with the loaded state
          setTimeout(() => {
            saveToHistory();
            if (reactFlowInstance) {
              reactFlowInstance.fitView({ padding: 0.2 });
            }
          }, 100);
        } else {
          // Clear canvas if no workflow ID (only on initial mount or when workflowId becomes undefined)
          setNodes([], false);
          setEdges([], false);
          setWorkflowName('Untitled Workflow');
          setWorkflowStatus('draft');
          // Initialize history with empty state
          setTimeout(() => {
            saveToHistory();
          }, 100);
        }
      } catch (e) {
        console.error('[WorkflowV2] Load error:', e);
        setToast({ text: 'Failed to load workflow. Please try again.', state: 'error' });
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [reactFlowInstance, addNode]
  );

  // Validate connection - prevent multiple output connections except for parallel nodes
  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return false;
    
    const sourceNode = nodes.find(n => n.id === connection.source);
    
    // Parallel nodes can have multiple output connections
    if (sourceNode?.type === NodeType.PARALLEL) {
      return true;
    }
    
    // Condition nodes can have multiple outputs (true/false)
    if (sourceNode?.type === NodeType.CONDITION) {
      return true;
    }
    
    // For all other nodes, check if source already has an output connection
    const existingConnection = edges.find(
      edge => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle
    );
    
    // If connection already exists, prevent new connection
    if (existingConnection) {
      return false;
    }
    
    return true;
  }, [nodes, edges]);

  // Enhanced onConnect to handle condition nodes like workflowBuilder
  const handleConnect = useCallback((params: Connection) => {
    // Validate connection first
    if (!isValidConnection(params)) {
      return;
    }
    
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
          type: 'bezier',
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
          type: 'bezier',
          animated: true,
          style: {
            strokeWidth: 2
          }
        }, edges)
      );
    }
  }, [nodes, edges, setEdges, isValidConnection]);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn();
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut();
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2 });
  }, [reactFlowInstance]);

  const handleSave = useCallback(async () => {
    try {
      const payload = {
        name: workflowName,
        description: '',
        category: 'correspondence',
        createdBy: Number(localStorage.getItem('uid') || 0) || undefined,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: (e as any).label || null,
        })),
      };

      const token = localStorage.getItem('token');
      const isUpdate = Boolean(workflowId);
      const url = isUpdate
        ? `${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${workflowId}`
        : `${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows`;
      
      console.log('[WorkflowV2] Saving to', url, 'method:', isUpdate ? 'PUT' : 'POST', 'payload:', payload);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...getTenantHeaders(),
      };
      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const bodyText = contentType.includes('application/json')
          ? JSON.stringify(await res.json().catch(() => ({})))
          : await res.text().catch(() => '');
        console.error('[WorkflowV2] Save failed', {
          url,
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          body: bodyText,
        });
        throw new Error(`Failed to save workflow (status ${res.status})`);
      }
      
      const responseData = await res.json().catch(() => ({}));
      console.log('[WorkflowV2] Save success', responseData);
      
      // Update workflow name and status if it was saved
      if (responseData?.data?.name) {
        setWorkflowName(responseData.data.name);
      }
      if (responseData?.data?.status) {
        setWorkflowStatus(responseData.data.status as 'active' | 'draft' | 'archived');
      }
      
      // Update workflowId if this was a new workflow
      const currentWorkflowId = workflowId || responseData?.data?.id;
      if (!workflowId && responseData?.data?.id) {
        navigate(`/workflow-v2/${responseData.data.id}`, { replace: true });
      }
      
      // Fetch webhook URL if there's a webhook trigger and update the node
      if (currentWorkflowId) {
        const triggerNode = nodes.find(n => {
          if (n.type !== 'trigger' && n.type !== 'start') return false;
          const data = n.data as any;
          return data?.triggerType === 'webhook' || data?.config?.triggerType === 'webhook';
        });
        
        if (triggerNode) {
          try {
            const webhookHeaders: Record<string, string> = {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...getTenantHeaders(),
            };
            const webhookRes = await fetch(
              `${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${currentWorkflowId}/webhook`,
              {
                headers: webhookHeaders,
              }
            );
            
            if (webhookRes.ok) {
              const webhookData = await webhookRes.json();
              if (webhookData?.data?.url) {
                // Update the trigger node with the webhook URL
                const nodeData = triggerNode.data as any;
                const updatedData = {
                  ...nodeData,
                  webhook: {
                    ...(nodeData?.webhook || {}),
                    url: webhookData.data.url,
                    path: webhookData.data.path,
                  }
                };
                updateNodeData(triggerNode.id, updatedData);
                console.log('[WorkflowV2] Updated trigger node with webhook URL:', webhookData.data.url);
              }
            }
          } catch (webhookErr) {
            console.log('[WorkflowV2] Could not fetch webhook URL:', webhookErr);
          }
        }
      }
      
      setToast({ text: 'Workflow saved successfully!', state: 'success' });
    } catch (err: any) {
      console.error('[WorkflowV2] Save exception', err);
      setToast({ text: err.message || 'Error saving workflow', state: 'error' });
    }
  }, [nodes, edges, workflowId, workflowName, navigate]);

  const handleArchivePublish = useCallback(async () => {
    try {
      if (!workflowId) {
        setToast({ text: 'Please save the workflow first', state: 'error' });
        return;
      }

      const token = localStorage.getItem('token');
      const isActive = workflowStatus === 'active';
      const url = `${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${workflowId}/${isActive ? 'unpublish' : 'publish'}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...getTenantHeaders(),
      };
      const res = await fetch(url, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${isActive ? 'archive' : 'publish'} workflow (status ${res.status})`);
      }

      const newStatus = isActive ? 'draft' : 'active';
      setWorkflowStatus(newStatus);
      setToast({ 
        text: `Workflow ${isActive ? 'archived' : 'published'} successfully`, 
        state: 'success' 
      });
    } catch (err: any) {
      console.error('[WorkflowV2] Archive/Publish exception', err);
      setToast({ text: err.message || `Error ${workflowStatus === 'active' ? 'archiving' : 'publishing'} workflow`, state: 'error' });
    }
  }, [workflowId, workflowStatus]);

  const handleExport = useCallback(() => {
    const flow = reactFlowInstance.toObject();
    const dataStr = JSON.stringify(flow, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `workflow-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [reactFlowInstance]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const flow = JSON.parse(event.target?.result as string);
          reactFlowInstance.setNodes(flow.nodes || []);
          reactFlowInstance.setEdges(flow.edges || []);
          setToast({ text: 'Workflow imported!', state: 'success' });
        } catch (error) {
          setToast({ text: 'Error importing workflow', state: 'error' });
          console.error(error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [reactFlowInstance]);

  const viewport = reactFlowInstance.getViewport();
  const zoomLevel = viewport.zoom * 100;

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if ((event.target as HTMLElement).tagName !== 'INPUT' && 
            (event.target as HTMLElement).tagName !== 'TEXTAREA') {
          deleteSelectedElements();
        }
      }
      if (event.key === 'd' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        duplicateSelectedNodes();
      }
      if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    },
    [deleteSelectedElements, duplicateSelectedNodes, undo, redo]
  );

  useMemo(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="workflow-container" style={{ background: colors.background }}>
      <style>{`
        .workflow-container {
          --wf-bg: ${colors.background};
          --wf-card: ${colors.card};
          --wf-text-primary: ${colors.textPrimary};
          --wf-text-secondary: ${colors.textSecondary};
          --wf-border: ${colors.border};
          --wf-muted-bg: ${colors.mutedBg};
        }
      `}</style>
      <div className="workflow-header">
        <AppBar
          onUndo={undo}
          onRedo={redo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onSave={handleSave}
          onExport={handleExport}
          onImport={handleImport}
          zoomLevel={zoomLevel}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < historyLength - 1}
          documentName={workflowName}
          onDocumentNameChange={(name) => setWorkflowName(name)}
          workflowStatus={workflowStatus}
          onArchivePublish={handleArchivePublish}
          isReadOnly={isReadOnly}
          onReadOnlyChange={setIsReadOnly}
        />
      </div>

      <div className="workflow-content">
        <div className="workflow-panel">
          <Palette
            items={paletteData}
            isExpanded={isSidebarExpanded}
            onToggle={toggleSidebar}
            isDisabled={isReadOnly}
            onTemplatesClick={() => setShowTemplatesModal(true)}
          />
        </div>
        
        <div className="workflow-panel workflow-right-panel">
          {(selectedNodes.length > 0 || selectedEdges.length > 0) && (
            <>
              {isPropertiesBarVisible && (
                <PropertiesBar
                  selectedNodes={selectedNodes}
                  selectedEdges={selectedEdges}
                  onUpdateNode={updateNodeData}
                  onUpdateEdge={handleUpdateEdge}
                  onDeleteNode={handleDeleteNode}
                  onDeleteEdge={handleDeleteEdge}
                  onClose={() => {
                    togglePropertiesBar();
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <div className="workflow-canvas">
        <ReactFlow
          nodes={nodes as any}
          edges={edges}
          onNodesChange={isReadOnly ? undefined : onNodesChange}
          onEdgesChange={isReadOnly ? undefined : onEdgesChange}
          onConnect={isReadOnly ? undefined : handleConnect}
          isValidConnection={isValidConnection}
          onInit={onInit}
          onDragOver={isReadOnly ? undefined : onDragOver}
          onDrop={isReadOnly ? undefined : onDrop}
          onSelectionChange={onSelectionChange}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={!isReadOnly}
          nodesConnectable={!isReadOnly}
          elementsSelectable={!isReadOnly}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'bezier',
            animated: true,
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            style={{
              backgroundColor: colors.card,
            }}
          />
        </ReactFlow>
      </div>

      {/* Workflow Templates Modal */}
      <WorkflowTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectWorkflow={(id) => {
          navigate(`/workflow-v2/${id}`);
        }}
        currentWorkflowId={workflowId}
        onToast={(text, state) => setToast({ text, state })}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function WorkflowV2() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
}

