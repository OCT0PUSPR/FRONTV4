// Constants for workflow and node management

export const AVAILABLE_USERS_AND_ROLES: string[] = [
  'Admin',
  'Manager',
  'User',
  'Viewer'
];

export const NODE_COLORS: Record<string, string> = {
  trigger: '#3b82f6',
  person: '#8b5cf6',
  approval: '#10b981',
  condition: '#f59e0b',
  notification: '#06b6d4',
  document: '#6366f1',
  escalation: '#ef4444',
  delay: '#64748b',
  parallel: '#8b5cf6',
  merge: '#14b8a6',
  end: '#6b7280',
  action: '#f97316',
  ai_agent: '#ec4899',
  tool: '#84cc16',
  loop: '#a855f7'
};

// Constants for workflow initialization
export const INITIAL_NODES: any[] = [];
export const INITIAL_EDGES: any[] = [];

