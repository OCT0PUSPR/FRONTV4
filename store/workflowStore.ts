
import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import { nanoid } from 'nanoid';
import { INITIAL_NODES, INITIAL_EDGES } from '../constants';
import { NodeData, NodeType } from '../types';

type RFState = {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNode: Node<NodeData> | null;
  selectedEdge: Edge | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNode: (node: Node<NodeData> | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  updateEdgeData: (edgeId: string, data: Partial<Edge>) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  duplicateNode: (node: Node<NodeData>) => void;
};

const useStore = create<RFState>((set, get) => ({
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
  selectedNode: null,
  selectedEdge: null,

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge({ ...connection, animated: true }, get().edges),
    });
  },

  setSelectedNode: (node) => {
    set({ selectedNode: node, selectedEdge: null });
  },

  setSelectedEdge: (edge) => {
    set({ selectedEdge: edge, selectedNode: null });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
    // also update selected node if it's the one being changed
    if (get().selectedNode?.id === nodeId) {
      set({ selectedNode: { ...get().selectedNode!, data: { ...get().selectedNode!.data, ...data } } });
    }
  },

  updateEdgeData: (edgeId, data) => {
    set({
      edges: get().edges.map((edge) =>
        edge.id === edgeId ? { ...edge, ...data } : edge
      ),
    });
    // also update selected edge if it's the one being changed
    if (get().selectedEdge?.id === edgeId) {
      set({ selectedEdge: { ...get().selectedEdge!, ...data } });
    }
  },

  addNode: (type, position) => {
    const id = nanoid();
    let newNode: Node;
    const baseData = { label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}` };
    switch(type) {
        case NodeType.TRIGGER: newNode = { id, type, position, data: {...baseData, triggerType: '', sourceEntity: ''} }; break;
        case NodeType.APPROVAL: newNode = { id, type, position, data: {...baseData, approvers: [], approvalType: 'Sequential'} }; break;
        case NodeType.CONDITION: newNode = { id, type, position, data: {...baseData, expression: ''} }; break;
        case NodeType.NOTIFICATION: newNode = { id, type, position, data: {...baseData, recipients: [], message: ''} }; break;
        case NodeType.ACTION: newNode = { id, type, position, data: {...baseData, actionType: '', params: {}} }; break;
        case NodeType.END: newNode = { id, type, position, data: {...baseData, outcome: ''} }; break;
        default: newNode = { id, type, position, data: baseData }; break;
    }
    set({ nodes: [...get().nodes, newNode] });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
    
  deleteNode: (nodeId) => {
    set({
        nodes: get().nodes.filter(node => node.id !== nodeId),
        edges: get().edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId),
        selectedNode: get().selectedNode?.id === nodeId ? null : get().selectedNode,
    });
  },

  deleteEdge: (edgeId) => {
    set({
      edges: get().edges.filter(edge => edge.id !== edgeId),
      selectedEdge: get().selectedEdge?.id === edgeId ? null : get().selectedEdge,
    });
  },

  duplicateNode: (nodeToDuplicate) => {
    const newNode: Node = {
      ...nodeToDuplicate,
      id: nanoid(),
      position: {
        x: nodeToDuplicate.position.x + 50,
        y: nodeToDuplicate.position.y + 50,
      },
      selected: false,
    };
    set({ nodes: [...get().nodes, newNode] });
  },
}));

export default useStore;
