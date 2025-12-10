export enum NodeType {
  TRIGGER = 'trigger',
  PERSON = 'person',
  APPROVAL = 'approval',
  CONDITION = 'condition',
  NOTIFICATION = 'notification',
  DOCUMENT = 'document',
  ESCALATION = 'escalation',
  DELAY = 'delay',
  PARALLEL = 'parallel',
  MERGE = 'merge',
  END = 'end',
  ACTION = 'action',
  AI_AGENT = 'ai_agent',
  TOOL = 'tool'
}


export interface BaseNodeData {
  label: string;
  color?: string;
  url?: string;
}

export interface TriggerNodeData extends BaseNodeData {
  triggerType: string;
  sourceEntity: string;
  scheduleDays:string,
}

export interface ApprovalNodeData extends BaseNodeData {
  approvers: string[];
  approvalType: 'Sequential' | 'Parallel';
  requiredApprovals?: number;
  requireComments?: boolean;
  approverIds?: number[];
}

export interface ConditionNodeData {
  label: string;
  conditionType?: 'Field Value' | 'Approval Result' | 'Amount' | 'Custom Expression';
  expression?: string;
  field?: string;
  operator?: string;
  value?: any;
  color?: string;
  description?: string;
}

export interface NotificationNodeData extends BaseNodeData {
  recipients: string[];
  message: string;
  notificationType?: string;
  subject?: string;
}

export interface ActionNodeData extends BaseNodeData {
  actionType: string;
  params: Record<string, string>;
}

export interface EndNodeData extends BaseNodeData {
  outcome: string;
  finalMessage?: string;
}

export interface TextNodeData {
    label: string;
    color?: string;
}

export interface PersonNodeData {
  label: string;
  assignedTo?: string;
  assignedToId?: number;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  dueInHours?: number;
  instructions?: string;
  color?: string;
  description?: string;
}

export interface DocumentNodeData {
  label: string;
  documentAction?: 'Review' | 'Generate' | 'Upload' | 'Archive' | 'Sign';
  templateId?: string;
  requiredFields?: string[];
  color?: string;
  description?: string;
}

export interface EscalationNodeData {
  label: string;
  escalateAfterHours?: number;
  escalateTo?: string;
  escalationAction?: 'Notify' | 'Reassign' | 'Skip' | 'Cancel';
  color?: string;
  description?: string;
}

export interface DelayNodeData {
  label: string;
  delayAmount?: number;
  delayUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
  delayDescription?: string;
  color?: string;
  description?: string;
}

export interface AIToolConfig {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  enabled: boolean;
  category?: string;
  icon?: string;
}

export interface AIAgentNodeData {
  label: string;
  provider?: 'openai' | 'anthropic' | 'google' | 'azure' | 'ollama' | 'groq' | 'custom';
  model?: string;
  credentialId?: string;
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: AIToolConfig[];
  outputVariable?: string;
  ollamaBaseUrl?: string;
  color?: string;
  description?: string;
}

export interface ToolNodeData {
  label: string;
  toolId?: string;
  toolName?: string;
  toolType?: string;
  category?: string;
  description?: string;
  icon?: string;
  parameters?: Record<string, any>;
  color?: string;
}

export type NodeData = 
  | BaseNodeData
  | TriggerNodeData
  | ApprovalNodeData
  | ConditionNodeData
  | NotificationNodeData
  | ActionNodeData
  | EndNodeData
  | TextNodeData
  | PersonNodeData
  | DocumentNodeData
  | EscalationNodeData
  | DelayNodeData
  | AIAgentNodeData
  | ToolNodeData;
  
