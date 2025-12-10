import { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
// Custom Node Components
const PersonNode = ({ data }: any) => {
  return (
    <div
      className="px-4 py-3 shadow-lg rounded-lg bg-white min-w-[150px]"
      style={{ borderLeft: `4px solid ${data.color || '#3b82f6'}` }}
    >
      <div className="flex items-center gap-2">
        <div className="text-lg">👤</div>
        <div className="font-medium text-sm">{data.label || 'Person'}</div>
      </div>
      {data.person && (
        <div className="text-xs text-gray-500 mt-1">{data.person}</div>
      )}
      <div className="flex gap-1 mt-2">
        <div className="w-2 h-2 bg-gray-300 rounded-full" />
        <div className="w-2 h-2 bg-gray-300 rounded-full" />
        <div className="w-2 h-2 bg-gray-300 rounded-full" />
      </div>
    </div>
  );
};

const IfElseNode = ({ data }: any) => {
  return (
    <div
      className="px-4 py-3 shadow-lg rounded-lg bg-white min-w-[150px]"
      style={{ borderLeft: `4px solid ${data.color || '#fb923c'}` }}
    >
      <div className="flex items-center gap-2">
        <div className="text-lg">🔀</div>
        <div className="font-medium text-sm">{data.label || 'If/Else'}</div>
      </div>
      {data.condition && (
        <div className="text-xs text-gray-500 mt-1 truncate">{data.condition}</div>
      )}
      <div className="flex gap-2 mt-2">
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">True</span>
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">False</span>
      </div>
    </div>
  );
};

const StartNode = ({ data }: any) => {
  return (
    <div
      className="px-4 py-3 shadow-lg rounded-lg bg-white min-w-[120px]"
      style={{ borderLeft: `4px solid ${data.color || '#10b981'}` }}
    >
      <div className="flex items-center gap-2">
        <div className="text-lg">▶️</div>
        <div className="font-medium text-sm">{data.label || 'Start'}</div>
      </div>
    </div>
  );
};

const ApprovalNode = ({ data }: any) => {
  return (
    <div
      className="px-4 py-3 shadow-lg rounded-lg bg-white min-w-[150px]"
      style={{ borderLeft: `4px solid ${data.color || '#8b5cf6'}` }}
    >
      <div className="flex items-center gap-2">
        <div className="text-lg">✓</div>
        <div className="font-medium text-sm">{data.label || 'Approval'}</div>
      </div>
      <div className="flex gap-2 mt-2">
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Approve</span>
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Reject</span>
      </div>
    </div>
  );
};

const NotificationNode = ({ data }: any) => {
  return (
    <div
      className="px-4 py-3 shadow-lg rounded-lg bg-white min-w-[150px]"
      style={{ borderLeft: `4px solid ${data.color || '#f59e0b'}` }}
    >
      <div className="flex items-center gap-2">
        <div className="text-lg">🔔</div>
        <div className="font-medium text-sm">{data.label || 'Notification'}</div>
      </div>
      <div className="text-xs text-gray-400 mt-1">Send notification</div>
    </div>
  );
};

const DocumentNode = ({ data }: any) => {
  return (
    <div
      className="px-4 py-3 shadow-lg rounded-lg bg-white min-w-[150px]"
      style={{ borderLeft: `4px solid ${data.color || '#06b6d4'}` }}
    >
      <div className="flex items-center gap-2">
        <div className="text-lg">📄</div>
        <div className="font-medium text-sm">{data.label || 'Document'}</div>
      </div>
      <div className="text-xs text-gray-400 mt-1">Process document</div>
    </div>
  );
};

const EndNode = ({ data }: any) => {
  return (
    <div
      className="px-4 py-3 shadow-lg rounded-lg bg-white min-w-[120px]"
      style={{ borderLeft: `4px solid ${data.color || '#ef4444'}` }}
    >
      <div className="flex items-center gap-2">
        <div className="text-lg">⏹</div>
        <div className="font-medium text-sm">{data.label || 'End'}</div>
      </div>
    </div>
  );
};

const nodeTypes = {
  person: PersonNode,
  ifElse: IfElseNode,
  start: StartNode,
  approval: ApprovalNode,
  notification: NotificationNode,
  document: DocumentNode,
  end: EndNode,
};

const initialNodes: Node[] = [
  {
    id: 'start-1',
    position: { x: 400, y: 100 },
    data: { label: 'Start' },
    type: 'start',
  },
];

const COLORS = [
  '#94a3b8', // gray
  '#fb923c', // orange
  '#2dd4bf', // teal
  '#10b981', // green
  '#34d399', // emerald
  '#3b82f6', // blue
  '#60a5fa', // light blue
  '#818cf8', // indigo
];

export default function Workflow() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workflowName, setWorkflowName] = useState('Untitled');
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((edgesSnapshot) => addEdge({ ...params, animated: true }, edgesSnapshot)),
    []
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.id);
    setShowSidebar(true);
  }, []);

  const addNodeToCanvas = useCallback((type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      position: {
        x: Math.random() * 300 + 200,
        y: Math.random() * 300 + 200,
      },
      data: { 
        label: type === 'person' ? 'Person' : 
               type === 'ifElse' ? 'If/Else' :
               type === 'approval' ? 'Approval' :
               type === 'notification' ? 'Notification' :
               type === 'document' ? 'Document' :
               type === 'end' ? 'End' : 'Node',
        color: '#3b82f6'
      },
      type: type,
    };
    setNodes((nds) => [...nds, newNode]);
  }, []);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      )
    );
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setShowSidebar(false);
    setSelectedNode(null);
  }, []);

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-gray-700">FlowLite</span>
          <span className="text-gray-300">|</span>
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="px-2 py-1 border border-blue-500 rounded focus:outline-none"
              autoFocus
            />
          ) : (
            <span
              onClick={() => setIsEditingName(true)}
              className="text-gray-700 cursor-pointer hover:text-gray-900"
            >
              {workflowName}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded border border-gray-300">
            Preview
          </button>
          <button className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            PNG
          </button>
          <button className="p-1.5 text-gray-700 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Node Palette */}
        <div className="w-72 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <button
                onClick={() => addNodeToCanvas('start')}
                className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="font-medium text-sm text-gray-700">➕ Start Node</div>
                <div className="text-xs text-gray-500 mt-1">Begin workflow</div>
              </button>
            </div>

            <div>
              <button
                onClick={() => addNodeToCanvas('person')}
                className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="font-medium text-sm text-gray-700">👤 Person Node</div>
                <div className="text-xs text-gray-500 mt-1">Assign to person</div>
              </button>
            </div>

            <div>
              <button
                onClick={() => addNodeToCanvas('approval')}
                className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="font-medium text-sm text-gray-700">✓ Approval Node</div>
                <div className="text-xs text-gray-500 mt-1">Require approval</div>
              </button>
            </div>

            <div>
              <button
                onClick={() => addNodeToCanvas('ifElse')}
                className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="font-medium text-sm text-gray-700">🔀 If/Else Node</div>
                <div className="text-xs text-gray-500 mt-1">Conditional logic</div>
              </button>
            </div>

            <div>
              <button
                onClick={() => addNodeToCanvas('notification')}
                className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="font-medium text-sm text-gray-700">🔔 Notification Node</div>
                <div className="text-xs text-gray-500 mt-1">Send notification</div>
              </button>
            </div>

            <div>
              <button
                onClick={() => addNodeToCanvas('document')}
                className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="font-medium text-sm text-gray-700">📄 Document Node</div>
                <div className="text-xs text-gray-500 mt-1">Handle document</div>
              </button>
            </div>

            <div>
              <button
                onClick={() => addNodeToCanvas('end')}
                className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="font-medium text-sm text-gray-700">⏹ End Node</div>
                <div className="text-xs text-gray-500 mt-1">Complete workflow</div>
              </button>
            </div>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                return node.data.color || '#3b82f6';
              }}
              maskColor="rgb(240, 240, 240, 0.6)"
            />
          </ReactFlow>
        </div>

        {/* Right Sidebar - Properties */}
        {showSidebar && selectedNodeData && (
          <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Node Properties</h3>
              <button
                onClick={() => {
                  setShowSidebar(false);
                  setSelectedNode(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label
                </label>
                <input
                  type="text"
                  value={selectedNodeData.data.label || ''}
                  onChange={(e) =>
                    updateNodeData(selectedNode!, { label: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Full URL (e.g. https://example.com)</p>
              </div>

              {selectedNodeData.type === 'person' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To
                  </label>
                  <select
                    value={selectedNodeData.data.person || ''}
                    onChange={(e) =>
                      updateNodeData(selectedNode!, { person: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select person...</option>
                    <option value="john">John Doe</option>
                    <option value="jane">Jane Smith</option>
                    <option value="bob">Bob Johnson</option>
                    <option value="alice">Alice Williams</option>
                  </select>
                </div>
              )}

              {selectedNodeData.type === 'ifElse' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condition
                  </label>
                  <textarea
                    value={selectedNodeData.data.condition || ''}
                    onChange={(e) =>
                      updateNodeData(selectedNode!, { condition: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="e.g., amount > 1000"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateNodeData(selectedNode!, { color })}
                      className={`w-8 h-8 rounded border-2 ${
                        selectedNodeData.data.color === color
                          ? 'border-gray-800'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => deleteNode(selectedNode!)}
                className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Node
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}