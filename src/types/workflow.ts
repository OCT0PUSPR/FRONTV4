import type { Node, Edge, ReactFlowJsonObject, ReactFlowInstance } from '@xyflow/react';

export enum NodeType {
  Node = 'node',
  DecisionNode = 'decision-node',
}

export type IconType = string;

export type LayoutDirection = 'DOWN' | 'RIGHT';

export type BaseNodeProperties = {
  label: string;
  description: string;
};

export type NodeSchema = {
  properties: Record<string, unknown>;
};

export type NodeDataProperties<T extends NodeSchema> = {
  [K in keyof T['properties']]: unknown;
};

export type NodeData<T = BaseNodeProperties & Record<string, unknown>> = {
  templateType?: NodeType;
  properties: T;
  icon: IconType;
  type: string;
};

export type EdgeData = {
  label?: string;
  icon?: IconType;
};

export type WorkflowBuilderNode = Node<NodeData>;
export type WorkflowBuilderEdge = Edge<EdgeData>;

export type NodeDefinition<T extends NodeSchema = NodeSchema> = {
  schema: T;
  defaultPropertiesData: NodeDataProperties<T>;
  uischema?: unknown;
  type: string;
  icon: IconType;
  label: string;
  description: string;
  templateType?: NodeType;
};

export type PaletteItem<T extends NodeSchema = NodeSchema> = NodeDefinition<T>;

export enum StatusType {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

export type WorkflowBuilderReactFlowInstance = ReactFlowInstance<WorkflowBuilderNode, WorkflowBuilderEdge>;

export type WorkflowBuilderOnSelectionChangeParams = {
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
};

export type DiagramModel = {
  name: string;
  layoutDirection: LayoutDirection;
  diagram: ReactFlowJsonObject<WorkflowBuilderNode, WorkflowBuilderEdge>;
};

export type Point = {
  x: number;
  y: number;
};

export type ConnectionBeingDragged = {
  handleId: string;
  nodeId: string;
};

export type Option = {
  label: string;
  value: string;
  icon?: string;
  type?: string;
};


