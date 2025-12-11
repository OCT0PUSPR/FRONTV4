import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  OnSelectionChangeParams,
  Node,
} from '@xyflow/react';
import { NodeType, NodeData } from '../components/workflowV2/types';
import { nanoid } from 'nanoid';

type HistoryState = {
  nodes: Node<NodeData>[];
  edges: any[];
};

type WorkflowState = {
  nodes: Node<NodeData>[];
  edges: any[];
  isSidebarExpanded: boolean;
  isPropertiesBarVisible: boolean;
  selectedNodes: Node<NodeData>[];
  selectedEdges: any[];
  isReadOnlyMode: boolean;
  reactFlowInstance: any;
  layoutDirection: 'DOWN' | 'RIGHT';
  connectionBeingDragged: { nodeId: string | null; handleId: string | null };
  hoveredEdgeId: string | null;
  // History stack for undo/redo
  history: HistoryState[];
  historyIndex: number;
  maxHistorySize: number;
};

type WorkflowActions = {
  setNodes: (nodes: Node<NodeData>[], saveToHistory?: boolean) => void;
  setEdges: (edges: any[], saveToHistory?: boolean) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onInit: (instance: any) => void;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  toggleSidebar: () => void;
  togglePropertiesBar: () => void;
  addNode: (type: NodeType | string, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<any>) => void;
  setConnectionBeingDragged: (nodeId: string | null, handleId: string | null) => void;
  onEdgeMouseEnter: (event: React.MouseEvent, edge: any) => void;
  onEdgeMouseLeave: () => void;
  deleteSelectedElements: () => void;
  duplicateSelectedNodes: () => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

type WorkflowStore = WorkflowState & WorkflowActions;

// Helper function to deep clone state for history
const cloneState = (nodes: Node<NodeData>[], edges: any[]): HistoryState => ({
  nodes: JSON.parse(JSON.stringify(nodes)),
  edges: JSON.parse(JSON.stringify(edges)),
});

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  isSidebarExpanded: true,
  isPropertiesBarVisible: true,
  selectedNodes: [],
  selectedEdges: [],
  isReadOnlyMode: false,
  reactFlowInstance: null,
  layoutDirection: 'RIGHT',
  connectionBeingDragged: { nodeId: null, handleId: null },
  hoveredEdgeId: null,
  // History state
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,

  // Helper to save current state to history
  saveToHistory: () => {
    const state = get();
    const currentState = cloneState(state.nodes, state.edges);
    const { history, historyIndex, maxHistorySize } = state;
    
    // Don't save if state hasn't changed (compare with last history entry)
    if (history.length > 0 && historyIndex >= 0) {
      const lastState = history[historyIndex];
      const nodesEqual = JSON.stringify(currentState.nodes) === JSON.stringify(lastState.nodes);
      const edgesEqual = JSON.stringify(currentState.edges) === JSON.stringify(lastState.edges);
      if (nodesEqual && edgesEqual) {
        // State hasn't changed, don't save duplicate
        return;
      }
    }
    
    // Remove any future history if we're not at the end (user made a new change after undo)
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Add current state to history
    newHistory.push(currentState);
    
    // Limit history size
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  // Actions
  setNodes: (nodes, saveToHistory = false) => {
    set({ nodes });
    if (saveToHistory) {
      get().saveToHistory();
    }
  },
  
  setEdges: (edges, saveToHistory = false) => {
    set({ edges });
    if (saveToHistory) {
      get().saveToHistory();
    }
  },

  onNodesChange: (changes) => {
    // Check for important changes that should be saved to history
    const hasRemoveChange = changes.some((change) => change.type === 'remove');
    const hasAddChange = changes.some((change) => change.type === 'add');
    const hasDimensionChange = changes.some((change) => change.type === 'dimensions');
    
    // Check if changes are only position changes (dragging)
    const isOnlyPositionChange = changes.every(
      (change) => change.type === 'position' && change.dragging === true
    );
    
    // Check if dragging has ended
    const hasDragEnd = changes.some(
      (change) => change.type === 'position' && change.dragging === false
    );
    
    // Check if changes are only selection changes
    const isOnlySelectionChange = changes.every(
      (change) => change.type === 'select'
    );
    
    const updatedNodes = applyNodeChanges(changes, get().nodes as any);
    set({ nodes: updatedNodes as Node<NodeData>[] });
    
    // Save to history for:
    // 1. Node removals (CRITICAL - must save!)
    // 2. Node additions (CRITICAL - must save!)
    // 3. Dimension changes
    // 4. When dragging ends
    // 5. Other non-position, non-selection changes
    // But NOT for:
    // - Position changes during dragging
    // - Selection-only changes
    
    if (hasRemoveChange || hasAddChange) {
      // Critical operations - save immediately
      get().saveToHistory();
    } else if (hasDimensionChange || hasDragEnd) {
      // Important changes - save with small delay for drag end to batch position changes
      if (hasDragEnd) {
        setTimeout(() => {
          get().saveToHistory();
        }, 100);
      } else {
        get().saveToHistory();
      }
    } else if (!isOnlyPositionChange && !isOnlySelectionChange) {
      // Other meaningful changes (not just dragging or selection)
      get().saveToHistory();
    }
  },

  onEdgesChange: (changes) => {
    // Check if changes are only selection changes
    const isOnlySelectionChange = changes.every(
      (change) => change.type === 'select'
    );
    
    const updatedEdges = applyEdgeChanges(changes, get().edges);
    set({ edges: updatedEdges });
    
    // Only save to history if it's not just a selection change
    if (!isOnlySelectionChange) {
      get().saveToHistory();
    }
  },

  onConnect: (connection) => {
    const newEdges = addEdge({ ...connection, type: 'bezier', animated: true }, get().edges);
    set({ edges: newEdges });
    // Save to history - Zustand's set() is synchronous, so get() will get updated state
    get().saveToHistory();
  },

  onInit: (instance) => {
    set({ reactFlowInstance: instance });
  },

  onSelectionChange: (params) => {
    const hasSelection = params.nodes.length > 0 || params.edges.length > 0;
    set({
      selectedNodes: params.nodes as Node<NodeData>[],
      selectedEdges: params.edges,
      // Auto-open properties bar when something is selected
      isPropertiesBarVisible: hasSelection ? true : get().isPropertiesBarVisible,
    });
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarExpanded: !state.isSidebarExpanded }));
  },

  togglePropertiesBar: () => {
    set((state) => ({ isPropertiesBarVisible: !state.isPropertiesBarVisible }));
  },

  addNode: (type, position) => {
    const id = nanoid();
    let newNode: Node<NodeData>;
    const baseData: any = { label: `New ${String(type).charAt(0).toUpperCase() + String(type).slice(1)}` };
    
    // Map string types to NodeType enum
    let nodeType: NodeType;
    if (typeof type === 'string') {
      if (type === 'trigger') nodeType = NodeType.TRIGGER;
      else if (type === 'approval') nodeType = NodeType.APPROVAL;
      else if (type === 'condition' || type === 'conditional') nodeType = NodeType.CONDITION;
      else if (type === 'action') nodeType = NodeType.ACTION;
      else if (type === 'notification') nodeType = NodeType.NOTIFICATION;
      else if (type === 'person') nodeType = NodeType.PERSON;
      else if (type === 'document') nodeType = NodeType.DOCUMENT;
      else if (type === 'escalation') nodeType = NodeType.ESCALATION;
      else if (type === 'delay') nodeType = NodeType.DELAY;
      else if (type === 'end') nodeType = NodeType.END;
      else nodeType = type as NodeType;
    } else {
      nodeType = type;
    }
    
    switch(nodeType) {
      case NodeType.TRIGGER: 
        newNode = { id, type: nodeType, position, data: {...baseData, triggerType: '', sourceEntity: ''} }; 
        break;
      case NodeType.APPROVAL: 
        newNode = { id, type: nodeType, position, data: {...baseData, approvers: [], approvalType: 'Sequential'} }; 
        break;
      case NodeType.CONDITION: 
        newNode = { id, type: nodeType, position, data: {...baseData, expression: ''} }; 
        break;
      case NodeType.NOTIFICATION: 
        newNode = { id, type: nodeType, position, data: {...baseData, recipients: [], message: ''} }; 
        break;
      case NodeType.ACTION: 
        newNode = { id, type: nodeType, position, data: {...baseData, actionType: '', params: {}} }; 
        break;
      case NodeType.END: 
        newNode = { id, type: nodeType, position, data: {...baseData, outcome: ''} }; 
        break;
      case NodeType.PERSON:
        newNode = { id, type: nodeType, position, data: {...baseData, assignedTo: '', priority: 'Medium'} };
        break;
      case NodeType.DOCUMENT:
        newNode = { id, type: nodeType, position, data: {...baseData, documentAction: 'review', documentType: '', templateId: '', outputVariable: ''} };
        break;
      case NodeType.ESCALATION:
        newNode = { id, type: nodeType, position, data: {...baseData, escalateAfterHours: 24} };
        break;
      case NodeType.DELAY:
        newNode = { id, type: nodeType, position, data: {...baseData, delayAmount: 1, delayUnit: 'hours', delayType: 'fixed', delayExpression: '', delayUntil: ''} };
        break;
      case NodeType.LOOP:
        newNode = { id, type: nodeType, position, data: {...baseData, loopType: 'forEach', collection: '', itemVariable: 'item', indexVariable: 'index', iterations: 10, condition: '', maxIterations: 100} };
        break;
      default: 
        newNode = { id, type: nodeType, position, data: baseData }; 
        break;
    }
    
    const newNodes = [...get().nodes, newNode];
    set({ nodes: newNodes });
    // Save to history - Zustand's set() is synchronous, so get() will get updated state
    get().saveToHistory();
  },

  updateNodeData: (nodeId, data) => {
    const updatedNodes = get().nodes.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    );
    set({ nodes: updatedNodes });
    // Save to history - Zustand's set() is synchronous, so get() will get updated state
    get().saveToHistory();
  },

  setConnectionBeingDragged: (nodeId, handleId) => {
    set({ connectionBeingDragged: { nodeId, handleId } });
  },

  onEdgeMouseEnter: (event, edge) => {
    set({ hoveredEdgeId: edge.id });
  },

  onEdgeMouseLeave: () => {
    set({ hoveredEdgeId: null });
  },

  deleteSelectedElements: () => {
    const { selectedNodes, selectedEdges } = get();
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdgeIds = new Set(selectedEdges.map((e) => e.id));

    const newNodes = get().nodes.filter((node) => !selectedNodeIds.has(node.id));
    const newEdges = get().edges.filter((edge) => !selectedEdgeIds.has(edge.id));

    set({
      nodes: newNodes,
      edges: newEdges,
      selectedNodes: [],
      selectedEdges: [],
    });
    // Save to history - Zustand's set() is synchronous, so get() will get updated state
    get().saveToHistory();
  },

  duplicateSelectedNodes: () => {
    const { selectedNodes } = get();
    const newNodes: Node<NodeData>[] = selectedNodes.map((node) => ({
      ...node,
      id: nanoid(),
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      selected: false,
    }));

    const updatedNodes = [...get().nodes, ...newNodes];
    set({ nodes: updatedNodes });
    // Save to history - Zustand's set() is synchronous, so get() will get updated state
    get().saveToHistory();
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      set({
        nodes: JSON.parse(JSON.stringify(previousState.nodes)),
        edges: JSON.parse(JSON.stringify(previousState.edges)),
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        nodes: JSON.parse(JSON.stringify(nextState.nodes)),
        edges: JSON.parse(JSON.stringify(nextState.edges)),
        historyIndex: historyIndex + 1,
      });
    }
  },
}));

