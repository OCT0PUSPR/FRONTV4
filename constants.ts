import { Node, Edge } from 'reactflow';
import { NodeType, NodeData } from './types';

export const INITIAL_NODES: Node<NodeData>[] = [];

export const INITIAL_EDGES: Edge[] = [];

export const AVAILABLE_USERS_AND_ROLES = [
  'John Doe', 'Jane Smith', 'Requester', 'requester.manager', 'HR Department', 'Finance Department', 'Director', 'CEO'
];

export const NODE_COLORS = ['#9ca3af', '#f97316', '#ef4444', '#14b8a6', '#3b82f6', '#22c55e', '#8b5cf6'];