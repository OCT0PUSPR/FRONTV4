import { PaletteItem, Option } from '../../types/workflow';

// Shared properties for all nodes
export const sharedProperties = {
  label: {
    type: 'string',
    placeholder: 'Enter label',
  },
  description: {
    type: 'string',
    placeholder: 'Enter description',
  },
};

export const statusOptions: Option[] = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Archived', value: 'archived' },
];

// Trigger Node - Enhanced with multiple trigger types and exception list
export const triggerTypeOptions = {
  manual: { label: 'Manual', value: 'manual', icon: 'Hand' },
  event: { label: 'Event', value: 'event', icon: 'Zap' },
  webhook: { label: 'Webhook', value: 'webhook', icon: 'Webhook' },
  scheduled: { label: 'Scheduled', value: 'scheduled', icon: 'Clock' },
} as const;

export const eventTypeOptions = {
  create: { label: 'On Create', value: 'create' },
  update: { label: 'On Update', value: 'update' },
  delete: { label: 'On Delete', value: 'delete' },
} as const;

export const triggerNode: PaletteItem = {
  label: 'Trigger',
  description: 'Start the workflow',
  type: 'trigger',
  icon: 'Zap',
  defaultPropertiesData: {
    label: 'Trigger',
    description: 'Workflow trigger',
    triggerType: 'event',
    eventType: 'update',
    sourceEntity: '',
    status: 'active',
    // Exception list - users who bypass approval
    exceptions: {
      enabled: false,
      bypassApproval: true,
      autoExecuteAction: true,
      employees: [],
      positionExceptions: [],
    },
    // Webhook config
    webhook: {
      path: '',
      authType: 'api_key',
    },
    // Schedule config
    schedule: {
      repeatType: 'once',
      scheduledDateTime: '',
      time: '09:00',
      daysOfWeek: [],
      dayOfMonth: 1,
      timezone: 'UTC',
    },
  },
  schema: {
    properties: {
      ...sharedProperties,
      triggerType: {
        type: 'string',
        options: Object.values(triggerTypeOptions),
        placeholder: 'Select Trigger Type...',
      },
      eventType: {
        type: 'string',
        options: Object.values(eventTypeOptions),
        placeholder: 'Select Event Type...',
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Action Node
export const actionTypeOptions = {
  email: { label: 'Send Email', value: 'sendEmail', icon: 'Mail' },
  updateRecord: { label: 'Update Record', value: 'updateRecord', icon: 'Upload' },
  api: { label: 'Make API Call', value: 'makeApiCall', icon: 'Webhook' },
  createRecord: { label: 'Create Record', value: 'createRecord', icon: 'Plus' },
  script: { label: 'Execute Script', value: 'executeScript', icon: 'Code' },
  document: { label: 'Create New Document', value: 'createNewDocument', icon: 'FileText' },
} as const;

export const actionNode: PaletteItem = {
  type: 'action',
  icon: 'PlayCircle',
  label: 'Action',
  description: 'Perform an action',
  defaultPropertiesData: {
    label: 'Action',
    description: 'Execute action',
    type: 'sendEmail',
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      type: {
        type: 'string',
        options: Object.values(actionTypeOptions),
        placeholder: 'Select Action Type',
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Conditional Node
export const conditionalNode: PaletteItem = {
  type: 'conditional',
  icon: 'GitBranch',
  label: 'Conditional',
  description: 'Branch based on conditions',
  defaultPropertiesData: {
    label: 'Conditional',
    description: 'Conditional branch',
    condition: '',
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      condition: {
        type: 'string',
        placeholder: 'Enter condition',
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Delay Node
export const delayTypeOptions = {
  fixed: { label: 'Fixed Delay', value: 'fixedDelay', icon: 'Clock' },
  until: { label: 'Wait Until', value: 'waitUntil', icon: 'Calendar' },
} as const;

export const delayNode: PaletteItem = {
  type: 'delay',
  icon: 'Timer',
  label: 'Delay',
  description: 'Wait before continuing',
  defaultPropertiesData: {
    label: 'Delay',
    description: 'Delay execution',
    type: 'fixedDelay',
    duration: 5,
    unit: 'minutes',
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      type: {
        type: 'string',
        options: Object.values(delayTypeOptions),
      },
      duration: {
        type: 'number',
      },
      unit: {
        type: 'string',
        options: [
          { label: 'Seconds', value: 'seconds' },
          { label: 'Minutes', value: 'minutes' },
          { label: 'Hours', value: 'hours' },
          { label: 'Days', value: 'days' },
        ],
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Decision Node
export const decisionNode: PaletteItem = {
  type: 'decision',
  icon: 'Route',
  label: 'Decision',
  description: 'Multiple choice decision',
  templateType: 'decision-node' as any,
  defaultPropertiesData: {
    label: 'Decision',
    description: 'Decision point',
    branches: [],
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      branches: {
        type: 'array',
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Notification Node
export const notificationNode: PaletteItem = {
  type: 'notification',
  icon: 'Bell',
  label: 'Notification',
  description: 'Send a notification',
  defaultPropertiesData: {
    label: 'Notification',
    description: 'Send notification',
    channel: 'email',
    message: '',
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      channel: {
        type: 'string',
        options: [
          { label: 'Email', value: 'email' },
          { label: 'SMS', value: 'sms' },
          { label: 'Push', value: 'push' },
        ],
      },
      message: {
        type: 'string',
        placeholder: 'Enter message',
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Approval Node - Enhanced with deadline and escalation
export const escalationActionOptions = [
  { label: 'Reassign to Manager', value: 'reassign' },
  { label: 'Notify Manager Only', value: 'notify' },
  { label: 'Auto-Approve', value: 'auto_approve' },
  { label: 'Auto-Reject', value: 'auto_reject' },
  { label: 'Skip Task', value: 'skip' },
] as const;

export const escalateToOptions = [
  { label: 'Manager (from hierarchy)', value: 'manager' },
  { label: 'Specific Person', value: 'specific' },
] as const;

export const approvalNode: PaletteItem = {
  type: 'approval',
  icon: 'Users',
  label: 'Approval',
  description: 'Require approval',
  defaultPropertiesData: {
    label: 'Approval',
    description: 'Require approval',
    approvers: [],
    approverIds: [],
    approvalType: 'Sequential',
    requiredApprovals: 1,
    requireComments: false,
    status: 'active',
    // Deadline configuration
    deadline: {
      enabled: false,
      days: 3,
      businessDaysOnly: true,
      reminderBeforeDays: 1,
    },
    // Escalation configuration
    escalation: {
      enabled: false,
      escalateTo: 'manager',
      specificUserId: null,
      maxEscalationLevels: 3,
      escalationAction: 'reassign',
      notifyOriginalApprover: true,
    },
  },
  schema: {
    properties: {
      ...sharedProperties,
      approvalType: {
        type: 'string',
        options: [
          { label: 'Sequential', value: 'Sequential' },
          { label: 'Parallel', value: 'Parallel' },
          { label: 'Any', value: 'Any' },
        ],
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Person Node
export const personNode: PaletteItem = {
  type: 'person',
  icon: 'User',
  label: 'Person',
  description: 'Assign to person',
  defaultPropertiesData: {
    label: 'Person',
    description: 'Assign task to person',
    assignedTo: '',
    priority: 'Medium',
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      priority: {
        type: 'string',
        options: [
          { label: 'Low', value: 'Low' },
          { label: 'Medium', value: 'Medium' },
          { label: 'High', value: 'High' },
          { label: 'Urgent', value: 'Urgent' },
        ],
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Document Node
export const documentNode: PaletteItem = {
  type: 'document',
  icon: 'File',
  label: 'Document',
  description: 'Document action',
  defaultPropertiesData: {
    label: 'Document',
    description: 'Document action',
    documentAction: 'Review',
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      documentAction: {
        type: 'string',
        options: [
          { label: 'Review', value: 'Review' },
          { label: 'Generate', value: 'Generate' },
          { label: 'Upload', value: 'Upload' },
          { label: 'Archive', value: 'Archive' },
          { label: 'Sign', value: 'Sign' },
        ],
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Escalation Node
export const escalationNode: PaletteItem = {
  type: 'escalation',
  icon: 'UsersRound',
  label: 'Escalation',
  description: 'Escalate task',
  defaultPropertiesData: {
    label: 'Escalation',
    description: 'Escalate task',
    escalateAfterHours: 24,
    escalateTo: '',
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      escalateAfterHours: {
        type: 'number',
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Parallel Node - Split workflow into multiple parallel branches
export const parallelNode: PaletteItem = {
  type: 'parallel',
  icon: 'GitFork',
  label: 'Parallel',
  description: 'Execute branches in parallel',
  defaultPropertiesData: {
    label: 'Parallel Split',
    description: 'Execute multiple branches simultaneously',
    branchCount: 2,
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      branchCount: {
        type: 'number',
        placeholder: 'Number of branches',
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Merge Node - Wait for parallel branches to complete
export const mergeConditionOptions = [
  { label: 'All branches must complete', value: 'all' },
  { label: 'Any one branch completes', value: 'any' },
  { label: 'Specific number of branches', value: 'count' },
  { label: 'First successful branch', value: 'first_success' },
] as const;

export const mergeNode: PaletteItem = {
  type: 'merge',
  icon: 'GitMerge',
  label: 'Merge',
  description: 'Merge parallel branches',
  defaultPropertiesData: {
    label: 'Merge',
    description: 'Wait for parallel branches to complete',
    mergeCondition: 'all',
    requiredBranchCount: 1,
    timeout: {
      enabled: false,
      hours: 24,
      action: 'continue', // continue, cancel, skip_remaining
    },
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      mergeCondition: {
        type: 'string',
        options: mergeConditionOptions as unknown as Option[],
        placeholder: 'Select merge condition...',
      },
      requiredBranchCount: {
        type: 'number',
        placeholder: 'Required branches (for count condition)',
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// End Node
export const endNode: PaletteItem = {
  type: 'end',
  icon: 'CircleCheck',
  label: 'End',
  description: 'End workflow',
  defaultPropertiesData: {
    label: 'End',
    description: 'End workflow',
    outcome: 'Completed',
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      outcome: {
        type: 'string',
        options: [
          { label: 'Completed', value: 'Completed' },
          { label: 'Approved', value: 'Approved' },
          { label: 'Rejected', value: 'Rejected' },
          { label: 'Cancelled', value: 'Cancelled' },
          { label: 'Failed', value: 'Failed' },
        ],
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// AI Agent Node
export const aiAgentNode: PaletteItem = {
  type: 'ai_agent',
  icon: 'Bot',
  label: 'AI Agent',
  description: 'AI-powered automation with tool support',
  defaultPropertiesData: {
    label: 'AI Agent',
    description: 'Execute AI-powered tasks',
    provider: 'openai',
    model: 'gpt-4',
    systemPrompt: 'You are a helpful assistant.',
    userPrompt: '{{input}}',
    temperature: 0.7,
    maxTokens: 1000,
    tools: [],
    outputVariable: 'aiResponse',
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      provider: {
        type: 'string',
        options: [
          { label: 'OpenAI', value: 'openai' },
          { label: 'Anthropic', value: 'anthropic' },
          { label: 'Google AI', value: 'google' },
          { label: 'Azure OpenAI', value: 'azure' },
          { label: 'Ollama (Local)', value: 'ollama' },
          { label: 'Groq', value: 'groq' },
          { label: 'Custom', value: 'custom' },
        ],
        placeholder: 'Select AI provider...',
      },
      model: {
        type: 'string',
        placeholder: 'Model name (e.g., gpt-4, claude-3)',
      },
      credentialId: {
        type: 'string',
        placeholder: 'Select API credential...',
      },
      systemPrompt: {
        type: 'textarea',
        placeholder: 'System prompt for the AI agent...',
      },
      userPrompt: {
        type: 'textarea',
        placeholder: 'User prompt (use {{variable}} for context)...',
      },
      temperature: {
        type: 'number',
        placeholder: 'Temperature (0-2)',
      },
      maxTokens: {
        type: 'number',
        placeholder: 'Max tokens',
      },
      outputVariable: {
        type: 'string',
        placeholder: 'Variable name for output',
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

// Tool Node
export const toolNode: PaletteItem = {
  type: 'tool',
  icon: 'Wrench',
  label: 'Tool',
  description: 'Connect tools to AI Agent',
  defaultPropertiesData: {
    label: 'Tool',
    description: 'Tool for AI Agent',
    toolId: '',
    toolName: '',
    category: 'utility',
    icon: 'wrench',
    parameters: {},
    status: 'active',
  },
  schema: {
    properties: {
      ...sharedProperties,
      toolId: {
        type: 'string',
        placeholder: 'Select tool...',
      },
      toolName: {
        type: 'string',
        placeholder: 'Tool name',
      },
      category: {
        type: 'string',
        options: [
          { label: 'Data', value: 'data' },
          { label: 'Communication', value: 'communication' },
          { label: 'Integration', value: 'integration' },
          { label: 'Workflow', value: 'workflow' },
          { label: 'Utility', value: 'utility' },
          { label: 'Document', value: 'document' },
        ],
        placeholder: 'Select category...',
      },
      status: {
        type: 'string',
        options: statusOptions,
      },
    },
  },
};

export const paletteData: PaletteItem[] = [
  triggerNode,
  approvalNode,
  conditionalNode,
  notificationNode,
  actionNode,
  documentNode,
  escalationNode,
  parallelNode,
  mergeNode,
  delayNode,
  aiAgentNode,
  toolNode,
  endNode,
];

