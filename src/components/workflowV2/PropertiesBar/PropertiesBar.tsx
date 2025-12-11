import React, { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { Node, Edge } from '@xyflow/react';
import { NodeType, NodeData, TriggerNodeData, ApprovalNodeData, ConditionNodeData, NotificationNodeData, EndNodeData, PersonNodeData, DocumentNodeData, EscalationNodeData, DelayNodeData, AIAgentNodeData, ToolNodeData } from '../types';
import { X, Trash2, ArrowRight, ArrowLeft, Minus } from 'lucide-react';
import { AVAILABLE_USERS_AND_ROLES, NODE_COLORS } from '../../../constants';
import { API_CONFIG, getTenantHeaders, tenantFetch } from '../../../config/api';
import { useAuth } from '../../../../context/auth';
import { useTranslation } from 'react-i18next';
import { CustomDropdown } from '../../NewCustomDropdown';
import { CustomInput } from '../../CusotmInput';
import { IOSCheckbox } from '../../IOSCheckbox';
import './PropertiesBar.css';

type PropertiesBarProps = {
  selectedNodes: Node<any>[];
  selectedEdges: Edge[];
  onUpdateNode: (nodeId: string, data: any) => void;
  onUpdateEdge?: (edgeId: string, data: any) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onClose: () => void;
};

const EDGE_COLORS = ['#6b7280', '#f97316', '#ef4444', '#14b8a6', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6'];

// Known model options per AI provider for the AI Agent node
// Ollama is intentionally omitted here so it falls back to free text input
const PROVIDER_MODELS: Record<string, string[]> = {
  openai: [
    'GPT-5.1',
    'GPT-5',
    'GPT-4.1',
    'GPT-5 nano',
    'GPT-5 pro',
    'GPT-5 micro'
  ],
  anthropic: [
    // Newer generation models
    'Sonnet 4',
    'Sonnet 4.5',
    'Opus 4.1',
    'Opus 4.5',
    'Haiku 4.5',
    // Older models kept for compatibility
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ],
  google: [
    'gemini 2.0',
    'gemini 2.5 pro',
    'gemini 2.5 flash',
    'gemini 3 pro'
  ]
};

export const PropertiesBar = ({
  selectedNodes,
  selectedEdges,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
  onClose,
}: PropertiesBarProps) => {
  const { t } = useTranslation();
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const selectedEdge = selectedEdges.length === 1 ? selectedEdges[0] : null;
  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [edgeData, setEdgeData] = useState<Edge | null>(null);
  const [people, setPeople] = useState<{ id: number; name: string }[]>([]);
  const [usersWithEmail, setUsersWithEmail] = useState<{ id: number; name: string; email: string }[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<{ id: number; name: string }[]>([]);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const { sessionId } = useAuth();

  // Use node data directly
  useEffect(() => {
    if (selectedNode) {
      setNodeData(selectedNode.data);
    } else {
      setNodeData(null);
    }
  }, [selectedNode]);

  // Sync edge data with selected edge
  useEffect(() => {
    if (selectedEdge) {
      setEdgeData(selectedEdge);
    } else {
      setEdgeData(null);
    }
  }, [selectedEdge]);

  useEffect(() => {
    const loadPeople = async () => {
      try {
        const res = await tenantFetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/users`);
        if (!res.ok) throw new Error('Failed to load users');
        const json = await res.json();
        const list = Array.isArray(json?.users) ? json.users : [];
        const mapped = list
          .map((u: any) => ({ id: Number(u.id), name: String(u.display_name || u.name || '') }))
          .filter((u: any) => u.id && u.name);
        setPeople(mapped);
        
        // Also store users with email for notification recipients
        // Use display_name for name and login for email
        const usersWithEmailList = list
          .map((u: any) => ({ 
            id: Number(u.id), 
            name: String(u.display_name || u.name || ''), 
            email: String(u.email || u.login || '') 
          }))
          .filter((u: any) => u.id && u.name && u.email);
        setUsersWithEmail(usersWithEmailList);
      } catch {
        setPeople(AVAILABLE_USERS_AND_ROLES.map((n, idx) => ({ id: idx + 1, name: n })));
        setUsersWithEmail([]);
      }
    };
    loadPeople();
  }, [sessionId]);

  // Load email templates for notification node
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await tenantFetch(`${API_CONFIG.BACKEND_BASE_URL}/mailer/templates`);
        if (res.ok) {
          const json = await res.json();
          setEmailTemplates(Array.isArray(json) ? json : []);
        }
      } catch (error) {
        console.error('Failed to load email templates', error);
      }
    };
    loadTemplates();
  }, []);

  if (!selectedNode && !selectedEdge) {
    return null;
  }

  // Get NodeType from node type
  const getNodeType = (): NodeType | null => {
    if (!selectedNode) return null;
    return selectedNode.type as NodeType;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!selectedNode || !nodeData) return;
    const { name, value } = e.target;
    const updatedData = { ...nodeData, [name]: value };
    setNodeData(updatedData);
    // Update in workflowV2 format
    onUpdateNode(selectedNode.id, { [name]: value });
  };

  const handleColorChange = (color: string) => {
    if (!selectedNode || !nodeData) return;
    const newColor = Object.values(NODE_COLORS).includes(color) ? color : color;
    const updatedData = { ...nodeData, color: newColor } as NodeData;
    setNodeData(updatedData);
    onUpdateNode(selectedNode.id, { color: newColor });
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    if (onDeleteNode) {
      onDeleteNode(selectedNode.id);
    }
    onClose();
  };

  const renderSettings = () => {
    const nodeType = getNodeType();
    if (!nodeType || !nodeData) return null;

    switch (nodeType) {
      case NodeType.TRIGGER: {
        const triggerData = nodeData as Partial<TriggerNodeData>;
        // Get config from node data (stored in config field)
        const config = (triggerData as any).config || {};
        const currentTriggerType = config.triggerType || (triggerData as any).triggerType || 'event';
        const eventType = config.eventType || (triggerData as any).eventType || 'update';
        const sourceEntity = config.sourceEntity || (triggerData as any).sourceEntity || '';
        const exceptions = config.exceptions || (triggerData as any).exceptions || { enabled: false, employees: [], positionExceptions: [] };
        
        // Models list from models.js - format for display (spaces, capitalized) but save as-is
        const models = [
          "purchase.requisition", "purchase.order", "stock.quant", "stock.picking", "stock.move",
          "stock.lot", "stock.landed.cost", "stock.rule", "stock.route", "stock.warehouse",
          "stock.location", "product.template", "product.product", "stock.picking.batch",
          "mail.notification", "res.partner.title", "uom.category", "account.tax", "product.tag",
          "website", "pos.category", "product.category", "account.journal", "account.account",
          "account.move", "stock.putaway.rule", "stock.storage.category", "stock.package.type",
          "product.removal", "product.attribute.value", "product.attribute", "stock.picking.type",
          "product.supplierinfo", "mrp.production", "mrp.workorder", "mrp.workcenter",
          "project.project", "stock.move.line", "stock.scrap", "ir.actions.report",
          "delivery.carrier", "product.packaging", "delivery.price.rule", "res.country.state",
          "delivery.zip.prefix", "repair.order", "res.users", "repair.tags",
          "sale.order.line", "sale.order", "purchase.order.line", "res.device",
          "ir.model", "ir.module.category", "product.template.attribute.line"
        ];
        
        // Format model name for display: replace dots with spaces and capitalize first letter of each word
        const formatModelName = (model: string) => {
          return model
            .split('.')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        };
        
        // Get display value for entity dropdown
        const entityDisplayValue = sourceEntity ? `${sourceEntity}::${formatModelName(sourceEntity)}` : undefined;
        
        // Helper to update config
        const updateTriggerConfig = (updates: any) => {
          const updatedConfig = { ...config, ...updates };
          const updated = { ...triggerData, config: updatedConfig, ...updates } as any;
          setNodeData(updated as NodeData);
          onUpdateNode(selectedNode!.id, { config: updatedConfig, ...updates });
        };
        
        return (
          <>
            {/* Trigger Type Selection */}
            <CustomDropdown
              label={t('Trigger Type')}
              values={[
                `manual::${t('Manual')}`,
                `event::${t('Event')}`,
                `webhook::${t('Webhook')}`,
                `scheduled::${t('Scheduled')}`
              ]}
              type="single"
              defaultValue={`${currentTriggerType}::${currentTriggerType === 'manual' ? t('Manual') : currentTriggerType === 'event' ? t('Event') : currentTriggerType === 'webhook' ? t('Webhook') : t('Scheduled')}`}
              onChange={(val) => {
                const [newType] = String(val).split('::');
                updateTriggerConfig({ triggerType: newType });
              }}
              placeholder={t('Select trigger type...')}
            />

            {/* Event Type (only for event trigger) */}
            {currentTriggerType === 'event' && (
              <>
                <CustomDropdown
                  label={t('Event Type')}
                  values={[t('Create'), t('Update'), t('Delete')]}
                  type="single"
                  defaultValue={eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                  onChange={(val) => {
                    const newEventType = String(val).toLowerCase();
                    updateTriggerConfig({ eventType: newEventType });
                  }}
                  placeholder={t('Select event type...')}
                />
                
                <CustomDropdown
                  label={t('Entity Type')}
                  values={models.map(m => `${m}::${formatModelName(m)}`)}
                  type="single"
                  defaultValue={entityDisplayValue}
                  onChange={(val) => {
                    const str = String(val || '');
                    const [modelName] = str.split('::');
                    updateTriggerConfig({ sourceEntity: modelName });
                  }}
                  placeholder={t('Select entity type...')}
                />
              </>
            )}

            {/* Webhook config (only for webhook trigger) */}
            {currentTriggerType === 'webhook' && (
              <div className="property-info-box" style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 }}>{t('Webhook Configuration')}</h4>
                
                {/* Show webhook URL if available */}
                {config.webhook?.url ? (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      {t('Webhook URL')}
                    </label>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      padding: '8px',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <code style={{ 
                        fontSize: '11px', 
                        color: 'var(--text-primary)',
                        wordBreak: 'break-all',
                        flex: 1
                      }}>
                        {config.webhook.url}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(config.webhook.url);
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          backgroundColor: 'var(--action-color)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {t('Copy')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {t('Save the workflow to generate a webhook URL.')}
                  </div>
                )}
                
                <CustomDropdown
                  label={t('Authentication Type')}
                  values={[
                    `none::${t('None')}`,
                    `api_key::${t('API Key')}`,
                    `bearer::${t('Bearer Token')}`,
                  ]}
                  type="single"
                  defaultValue={`${config.webhook?.authType || 'none'}::${config.webhook?.authType === 'api_key' ? t('API Key') : config.webhook?.authType === 'bearer' ? t('Bearer Token') : t('None')}`}
                  onChange={(val) => {
                    const [authType] = String(val).split('::');
                    updateTriggerConfig({ webhook: { ...config.webhook, authType } });
                  }}
                  placeholder={t('Select auth type...')}
                />
                
                {config.webhook?.authType && config.webhook?.authType !== 'none' && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    {config.webhook?.authType === 'api_key' && t('Send API key in X-Api-Key header')}
                    {config.webhook?.authType === 'bearer' && t('Send token in Authorization: Bearer <token> header')}
                  </div>
                )}
              </div>
            )}

            {/* Schedule config (only for scheduled trigger) */}
            {currentTriggerType === 'scheduled' && (
              <div className="property-info-box" style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 }}>{t('Schedule Configuration')}</h4>
                
                {/* Schedule Type */}
                <CustomDropdown
                  label={t('Repeat')}
                  values={[
                    `once::${t('Once (One-time)')}`,
                    `daily::${t('Daily')}`,
                    `weekly::${t('Weekly')}`,
                    `monthly::${t('Monthly')}`
                  ]}
                  type="single"
                  defaultValue={`${config.schedule?.repeatType || 'once'}::${
                    config.schedule?.repeatType === 'daily' ? t('Daily') :
                    config.schedule?.repeatType === 'weekly' ? t('Weekly') :
                    config.schedule?.repeatType === 'monthly' ? t('Monthly') :
                    t('Once (One-time)')
                  }`}
                  onChange={(val) => {
                    const [repeatType] = String(val).split('::');
                    updateTriggerConfig({ schedule: { ...config.schedule, repeatType } });
                  }}
                  placeholder={t('Select frequency...')}
                />

                {/* Date picker for one-time schedule */}
                {(config.schedule?.repeatType === 'once' || !config.schedule?.repeatType) && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                      {t('Date & Time')}
                    </label>
                    <input
                      type="datetime-local"
                      value={config.schedule?.scheduledDateTime || ''}
                      onChange={(e) => {
                        updateTriggerConfig({ schedule: { ...config.schedule, scheduledDateTime: e.target.value } });
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                    />
                  </div>
                )}

                {/* Time picker for recurring schedules */}
                {config.schedule?.repeatType && config.schedule?.repeatType !== 'once' && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                      {t('Time')}
                    </label>
                    <input
                      type="time"
                      value={config.schedule?.time || '09:00'}
                      onChange={(e) => {
                        updateTriggerConfig({ schedule: { ...config.schedule, time: e.target.value } });
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                    />
                  </div>
                )}

                {/* Day of week selection for weekly */}
                {config.schedule?.repeatType === 'weekly' && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                      {t('Days')}
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        { key: 'sun', label: t('Sun') },
                        { key: 'mon', label: t('Mon') },
                        { key: 'tue', label: t('Tue') },
                        { key: 'wed', label: t('Wed') },
                        { key: 'thu', label: t('Thu') },
                        { key: 'fri', label: t('Fri') },
                        { key: 'sat', label: t('Sat') }
                      ].map(day => {
                        const selectedDays = config.schedule?.daysOfWeek || [];
                        const isSelected = selectedDays.includes(day.key);
                        return (
                          <button
                            key={day.key}
                            type="button"
                            onClick={() => {
                              const newDays = isSelected
                                ? selectedDays.filter((d: string) => d !== day.key)
                                : [...selectedDays, day.key];
                              updateTriggerConfig({ schedule: { ...config.schedule, daysOfWeek: newDays } });
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: `1px solid ${isSelected ? 'var(--action-color)' : 'var(--border-color)'}`,
                              backgroundColor: isSelected ? 'var(--action-color)' : 'transparent',
                              color: isSelected ? 'white' : 'var(--text-secondary)',
                              fontSize: '11px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Day of month selection for monthly */}
                {config.schedule?.repeatType === 'monthly' && (
                  <div style={{ marginTop: '12px' }}>
                    <CustomInput
                      label={t('Day of Month')}
                      type="number"
                      value={String(config.schedule?.dayOfMonth || 1)}
                      onChange={(val) => {
                        const day = Math.min(Math.max(parseInt(val) || 1, 1), 31);
                        updateTriggerConfig({ schedule: { ...config.schedule, dayOfMonth: day } });
                      }}
                      placeholder="1"
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {t('Enter a day between 1-31')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Exception List Section */}
            <div className="property-info-box" style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{t('Exception List')}</h4>
                <IOSCheckbox
                  checked={exceptions.enabled ?? false}
                  onChange={(checked) => {
                    updateTriggerConfig({ exceptions: { ...exceptions, enabled: checked } });
                  }}
                  label=""
                  name="exceptionsEnabled"
                />
              </div>
              
              {exceptions.enabled && (
                <>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {t('Users in this list will bypass approval and auto-execute the action.')}
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <IOSCheckbox
                      checked={exceptions.bypassApproval ?? true}
                      onChange={(checked) => {
                        updateTriggerConfig({ exceptions: { ...exceptions, bypassApproval: checked } });
                      }}
                      label={t('Bypass Approval')}
                      name="bypassApproval"
                    />
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <IOSCheckbox
                      checked={exceptions.autoExecuteAction ?? true}
                      onChange={(checked) => {
                        updateTriggerConfig({ exceptions: { ...exceptions, autoExecuteAction: checked } });
                      }}
                      label={t('Auto-execute Action')}
                      name="autoExecuteAction"
                    />
                  </div>
                  
                  {/* Exception Employees */}
                  <CustomDropdown
                    label={t('Excepted Employees')}
                    values={people.map(p => `${p.id}::${p.name}`)}
                    type="multi"
                    defaultValue={(exceptions.employees || []).map((e: any) => `${e.userId}::${e.name}`)}
                    onChange={(vals) => {
                      const arr = Array.isArray(vals) ? vals : [];
                      const employees = arr.map(v => {
                        const [idStr, name] = String(v).split('::');
                        return { userId: Number(idStr), name, reason: 'Manual exception' };
                      });
                      updateTriggerConfig({ exceptions: { ...exceptions, employees } });
                    }}
                    placeholder={t('Select employees who bypass approval...')}
                  />
                </>
              )}
            </div>
          </>
        );
      }

      case NodeType.PERSON: {
        const personData = nodeData as Partial<PersonNodeData>;
        return (
          <>
            <CustomDropdown
              label={t('Assign To')}
              values={people.map(p => `${p.id}::${p.name}`)}
              type="single"
              defaultValue={personData.assignedToId ? `${personData.assignedToId}::${personData.assignedTo || people.find(p=>p.id===personData.assignedToId)?.name || ''}` : undefined}
              onChange={(val) => {
                const str = String(val || '');
                const [idStr, name] = str.split('::');
                const id = Number(idStr);
                const finalName = name || people.find(p => p.id === id)?.name || '';
                const updated = { ...personData, assignedToId: id, assignedTo: finalName } as PersonNodeData;
                setNodeData(updated as unknown as NodeData);
                onUpdateNode(selectedNode!.id, { assignedToId: id, assignedTo: finalName } as any);
              }}
              placeholder={t('Select person...')}
            />
            <CustomDropdown
              label={t('Task Priority')}
              values={[t('Low'), t('Medium'), t('High'), t('Urgent')]}
              type="single"
              defaultValue={personData.priority ?? 'Medium'}
              onChange={(val) => {
                const updated = { ...personData, priority: String(val) } as PersonNodeData;
                setNodeData(updated as unknown as NodeData);
                onUpdateNode(selectedNode!.id, { priority: String(val) } as any);
              }}
            />
            <CustomInput
              label={t('Due In (Hours)')}
              type="number"
              value={String(personData.dueInHours ?? 24)}
              onChange={(val) => {
                const num = parseInt(val) || 24;
                const updated = { ...personData, dueInHours: num };
                setNodeData(updated as NodeData);
                onUpdateNode(selectedNode!.id, { dueInHours: num });
              }}
              placeholder="24"
            />
            <label className="property-label">{t('Instructions')}</label>
            <textarea name="instructions" value={personData.instructions ?? ''} onChange={handleInputChange} className="property-textarea" placeholder={t('Task instructions...')}/>
          </>
        );
      }

      case NodeType.APPROVAL: {
        const approvalData = nodeData as Partial<ApprovalNodeData>;
        const deadline = (approvalData as any).deadline || { enabled: false, days: 3, businessDaysOnly: true };
        const escalation = (approvalData as any).escalation || { enabled: false, escalateTo: 'manager', escalationAction: 'reassign' };
        
        // Helper to update approval config
        const updateApprovalConfig = (updates: any) => {
          const updated = { ...approvalData, ...updates };
          setNodeData(updated as NodeData);
          onUpdateNode(selectedNode!.id, updates);
        };
        
        return (
          <>
            <CustomDropdown
              label={t('Approval Type')}
              values={[t('Sequential (One by One)'), t('Parallel (All at Once)'), t('Any (First to Respond)')]}
              type="single"
              defaultValue={approvalData.approvalType === 'Sequential' ? t('Sequential (One by One)') : 
                          approvalData.approvalType === 'Parallel' ? t('Parallel (All at Once)') : 
                          approvalData.approvalType === 'Any' ? t('Any (First to Respond)') : t('Sequential (One by One)')}
              onChange={(val) => {
                const selected = String(val);
                let approvalType: 'Sequential' | 'Parallel' | 'Any' = 'Sequential';
                if (selected.includes('Parallel')) approvalType = 'Parallel';
                else if (selected.includes('Any')) approvalType = 'Any';
                updateApprovalConfig({ approvalType });
              }}
              placeholder={t('Select approval type...')}
            />
            <CustomDropdown
              label={t('Approvers')}
              values={people.map(p => `${p.id}::${p.name}`)}
              type="multi"
              defaultValue={((approvalData as any).approverIds ?? []).map((id: number) => `${id}::${people.find(p=>p.id===id)?.name || ''}`)}
              onChange={(vals) => {
                const arr = Array.isArray(vals) ? vals : [];
                const ids = arr.map(v => Number(String(v).split('::')[0])).filter(Boolean);
                const names = people.filter(p => ids.includes(p.id)).map(p => p.name);
                updateApprovalConfig({ approverIds: ids, approvers: names });
              }}
              placeholder={t('Select approvers...')}
            />
            <CustomInput
              label={t('Required Approvals')}
              type="number"
              value={String((approvalData as any).requiredApprovals ?? 1)}
              onChange={(val) => {
                const num = parseInt(val) || 1;
                updateApprovalConfig({ requiredApprovals: num });
              }}
              placeholder="1"
            />
            <div style={{ marginTop: '12px' }}>
              <IOSCheckbox
                checked={(approvalData as any).requireComments ?? false}
                onChange={(checked) => {
                  updateApprovalConfig({ requireComments: checked });
                }}
                label={t('Require Comments')}
                name="requireComments"
              />
            </div>

            {/* Deadline Section */}
            <div className="property-info-box" style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{t('Deadline')}</h4>
                <IOSCheckbox
                  checked={deadline.enabled ?? false}
                  onChange={(checked) => {
                    updateApprovalConfig({ deadline: { ...deadline, enabled: checked } });
                  }}
                  label=""
                  name="deadlineEnabled"
                />
              </div>
              
              {deadline.enabled && (
                <>
                  <CustomInput
                    label={t('Days to Complete')}
                    type="number"
                    value={String(deadline.days ?? 3)}
                    onChange={(val) => {
                      const days = parseInt(val) || 3;
                      updateApprovalConfig({ deadline: { ...deadline, days } });
                    }}
                    placeholder="3"
                  />
                  
                  <div style={{ marginTop: '12px' }}>
                    <IOSCheckbox
                      checked={deadline.businessDaysOnly ?? true}
                      onChange={(checked) => {
                        updateApprovalConfig({ deadline: { ...deadline, businessDaysOnly: checked } });
                      }}
                      label={t('Business Days Only')}
                      name="businessDaysOnly"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Escalation Section (only visible when deadline is enabled) */}
            {deadline.enabled && (
              <div className="property-info-box" style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{t('Escalation')}</h4>
                  <IOSCheckbox
                    checked={escalation.enabled ?? false}
                    onChange={(checked) => {
                      updateApprovalConfig({ escalation: { ...escalation, enabled: checked } });
                    }}
                    label=""
                    name="escalationEnabled"
                  />
                </div>
                
                {escalation.enabled && (
                  <>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      {t('When deadline passes, automatically escalate to manager.')}
                    </div>
                    
                    <CustomDropdown
                      label={t('Escalate To')}
                      values={[
                        `manager::${t('Manager (from hierarchy)')}`,
                        `specific::${t('Specific Person')}`
                      ]}
                      type="single"
                      defaultValue={`${escalation.escalateTo}::${escalation.escalateTo === 'manager' ? t('Manager (from hierarchy)') : t('Specific Person')}`}
                      onChange={(val) => {
                        const [escalateTo] = String(val).split('::');
                        updateApprovalConfig({ escalation: { ...escalation, escalateTo } });
                      }}
                      placeholder={t('Select escalation target...')}
                    />
                    
                    {escalation.escalateTo === 'specific' && (
                      <CustomDropdown
                        label={t('Specific Person')}
                        values={people.map(p => `${p.id}::${p.name}`)}
                        type="single"
                        defaultValue={escalation.specificUserId ? `${escalation.specificUserId}::${people.find(p=>p.id===escalation.specificUserId)?.name || ''}` : undefined}
                        onChange={(val) => {
                          const [idStr] = String(val).split('::');
                          updateApprovalConfig({ escalation: { ...escalation, specificUserId: Number(idStr) } });
                        }}
                        placeholder={t('Select person...')}
                      />
                    )}
                    
                    <CustomDropdown
                      label={t('Escalation Action')}
                      values={[
                        `reassign::${t('Reassign to Manager')}`,
                        `notify::${t('Notify Manager Only')}`,
                        `auto_approve::${t('Auto-Approve')}`,
                        `auto_reject::${t('Auto-Reject')}`,
                        `skip::${t('Skip Task')}`
                      ]}
                      type="single"
                      defaultValue={`${escalation.escalationAction}::${
                        escalation.escalationAction === 'reassign' ? t('Reassign to Manager') :
                        escalation.escalationAction === 'notify' ? t('Notify Manager Only') :
                        escalation.escalationAction === 'auto_approve' ? t('Auto-Approve') :
                        escalation.escalationAction === 'auto_reject' ? t('Auto-Reject') :
                        t('Skip Task')
                      }`}
                      onChange={(val) => {
                        const [escalationAction] = String(val).split('::');
                        updateApprovalConfig({ escalation: { ...escalation, escalationAction } });
                      }}
                      placeholder={t('Select action...')}
                    />
                    
                    <div style={{ marginTop: '12px' }}>
                      <IOSCheckbox
                        checked={escalation.notifyOriginalApprover ?? true}
                        onChange={(checked) => {
                          updateApprovalConfig({ escalation: { ...escalation, notifyOriginalApprover: checked } });
                        }}
                        label={t('Notify Original Approver')}
                        name="notifyOriginalApprover"
                      />
                    </div>
                    
                    <CustomInput
                      label={t('Max Escalation Levels')}
                      type="number"
                      value={String(escalation.maxEscalationLevels ?? 3)}
                      onChange={(val) => {
                        const maxLevels = Math.min(Math.max(parseInt(val) || 1, 1), 10);
                        updateApprovalConfig({ escalation: { ...escalation, maxEscalationLevels: maxLevels } });
                      }}
                      placeholder="3"
                    />
                  </>
                )}
              </div>
            )}
          </>
        );
      }

      case NodeType.CONDITION: {
        const conditionData = nodeData as Partial<ConditionNodeData>;
        return (
          <>
            <label className="property-label">{t('Condition Type')}</label>
            <select
              name="conditionType"
              value={conditionData.conditionType ?? 'Field Value'}
              onChange={handleInputChange}
              className="property-select"
            >
              <option value="Field Value">{t('Field Value')}</option>
              <option value="Approval Result">{t('Approval Result')}</option>
              <option value="Amount">{t('Amount')}</option>
              <option value="Custom Expression">{t('Custom Expression')}</option>
            </select>
            <label className="property-label">{t('Condition Expression')}</label>
            <textarea
              name="expression"
              value={conditionData.expression ?? ''}
              onChange={handleInputChange}
              className="property-textarea"
              placeholder="e.g., amount > 1000"
            />
          </>
        );
      }

      case NodeType.NOTIFICATION: {
        const notificationData = nodeData as Partial<NotificationNodeData>;
        const channels = (notificationData as any).channels || [];
        const smtpConfig = (notificationData as any).smtpConfig || {};
        
        const updateNotificationConfig = (updates: any) => {
          const updated = { ...notificationData, ...updates };
          setNodeData(updated as NodeData);
          onUpdateNode(selectedNode!.id, updates);
        };
        
        const testSmtpConnection = async () => {
          if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.fromEmail) {
            // Show error toast - would need toast context
            alert(t('Please fill in all required SMTP fields'));
            return;
          }
          
          setTestingSmtp(true);
          try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...getTenantHeaders(),
            };
            const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/smtp/test`, {
              method: 'POST',
              headers,
              body: JSON.stringify(smtpConfig),
            });
            
            const data = await res.json();
            if (data.success) {
              // Save SMTP settings
              const saveRes = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/smtp`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ ...smtpConfig, name: smtpConfig.name || 'Default SMTP' }),
              });
              
              const saveData = await saveRes.json();
              if (saveData.success) {
                alert(t('SMTP settings saved successfully!'));
                updateNotificationConfig({ smtpId: saveData.data.id });
              } else {
                alert(t('SMTP connection successful but failed to save: ') + saveData.message);
              }
            } else {
              alert(t('SMTP connection failed: ') + data.message);
            }
          } catch (error: any) {
            alert(t('SMTP connection failed: ') + error.message);
          } finally {
            setTestingSmtp(false);
          }
        };
        
        return (
          <>
            {/* Notification Channels - Multi-select */}
            <CustomDropdown
              label={t('Notification Channels')}
              values={[
                `email::${t('Email')}`,
                `in-app::${t('In-App')}`,
                `sms::${t('SMS')}`
              ]}
              type="multi"
              defaultValue={channels.map((c: string) => `${c}::${c === 'email' ? t('Email') : c === 'in-app' ? t('In-App') : t('SMS')}`)}
              onChange={(vals) => {
                const arr = Array.isArray(vals) ? vals : [];
                const selectedChannels = arr.map(v => String(v).split('::')[0]);
                updateNotificationConfig({ channels: selectedChannels });
              }}
              placeholder={t('Select channels...')}
            />
            
            {/* Email Template Selection - only when email channel is selected */}
            {channels.includes('email') && (
              <CustomDropdown
                label={t('Email Template')}
                values={emailTemplates.map((tmpl: any) => `${tmpl.id}::${tmpl.name}`)}
                type="single"
                defaultValue={(notificationData as any).templateId ? `${(notificationData as any).templateId}::${emailTemplates.find((tmpl: any) => tmpl.id === (notificationData as any).templateId)?.name || ''}` : undefined}
                onChange={(val) => {
                  const [idStr] = String(val || '').split('::');
                  const id = Number(idStr);
                  updateNotificationConfig({ templateId: id });
                }}
                placeholder={t('Select an email template...')}
              />
            )}
            
            {/* Recipients - Multi-select dropdown from res.users */}
            <CustomDropdown
              label={t('Recipients')}
              values={usersWithEmail.map((user) => `${user.email}::${user.name}`)}
              type="multi"
              defaultValue={(notificationData.recipients ?? []).map((email: string) => {
                const user = usersWithEmail.find(u => u.email === email);
                return user ? `${user.email}::${user.name}` : undefined;
              }).filter(Boolean)}
              onChange={(vals) => {
                const arr = Array.isArray(vals) ? vals : [];
                // Extract email addresses from the selected values
                const selectedEmails = arr
                  .map(v => String(v).split('::')[0])
                  .filter(email => email);
                updateNotificationConfig({ recipients: selectedEmails });
              }}
              placeholder={t('Select recipients...')}
            />
            <CustomInput
              label={t('Subject')}
              type="text"
              value={notificationData.subject ?? ''}
              onChange={(val) => {
                updateNotificationConfig({ subject: val });
              }}
              placeholder={t('Notification subject')}
            />
            <label className="property-label">{t('Message')}</label>
            <textarea name="message" value={notificationData.message ?? ''} onChange={handleInputChange} className="property-textarea" placeholder={t('Notification message...')}/>
            
            {/* SMTP Settings - Only show when email channel is selected */}
            {channels.includes('email') && (
              <div className="property-info-box" style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600 }}>{t('Email SMTP Settings')}</h4>
                
                <CustomInput
                  label={t('SMTP Host')}
                  type="text"
                  value={smtpConfig.host || ''}
                  onChange={(val) => {
                    updateNotificationConfig({ smtpConfig: { ...smtpConfig, host: val } });
                  }}
                  placeholder="smtp.example.com"
                />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <CustomInput
                    label={t('Port')}
                    type="number"
                    value={String(smtpConfig.port || 587)}
                    onChange={(val) => {
                      updateNotificationConfig({ smtpConfig: { ...smtpConfig, port: parseInt(val) || 587 } });
                    }}
                    placeholder="587"
                  />
                  <CustomDropdown
                    label={t('Encryption')}
                    values={[
                      `tls::TLS`,
                      `ssl::SSL`,
                      `none::${t('None')}`
                    ]}
                    type="single"
                    defaultValue={`${smtpConfig.encryption || 'tls'}::${smtpConfig.encryption === 'ssl' ? 'SSL' : smtpConfig.encryption === 'none' ? t('None') : 'TLS'}`}
                    onChange={(val) => {
                      const [encryption] = String(val).split('::');
                      updateNotificationConfig({ smtpConfig: { ...smtpConfig, encryption } });
                    }}
                    placeholder={t('Select...')}
                  />
                </div>
                
                <CustomInput
                  label={t('Username')}
                  type="text"
                  value={smtpConfig.username || ''}
                  onChange={(val) => {
                    updateNotificationConfig({ smtpConfig: { ...smtpConfig, username: val } });
                  }}
                  placeholder={t('SMTP username')}
                />
                
                <CustomInput
                  label={t('Password')}
                  type="text"
                  value={smtpConfig.password || ''}
                  onChange={(val) => {
                    updateNotificationConfig({ smtpConfig: { ...smtpConfig, password: val } });
                  }}
                  placeholder={t('SMTP password')}
                />
                
                <CustomInput
                  label={t('From Email')}
                  type="text"
                  value={smtpConfig.fromEmail || ''}
                  onChange={(val) => {
                    updateNotificationConfig({ smtpConfig: { ...smtpConfig, fromEmail: val } });
                  }}
                  placeholder="noreply@example.com"
                />
                
                <CustomInput
                  label={t('From Name')}
                  type="text"
                  value={smtpConfig.fromName || ''}
                  onChange={(val) => {
                    updateNotificationConfig({ smtpConfig: { ...smtpConfig, fromName: val } });
                  }}
                  placeholder={t('Sender name')}
                />
                
                <button
                  type="button"
                  onClick={testSmtpConnection}
                  disabled={testingSmtp}
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'var(--action-color, #3b82f6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: testingSmtp ? 'not-allowed' : 'pointer',
                    opacity: testingSmtp ? 0.7 : 1
                  }}
                >
                  {testingSmtp ? t('Testing...') : t('Test & Save SMTP Settings')}
                </button>
                
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  {t('SMTP settings will be tested before saving. Once saved, they will be used for all email notifications.')}
                </div>
              </div>
            )}
          </>
        );
      }

      case NodeType.DOCUMENT: {
        const documentData = nodeData as Partial<DocumentNodeData>;
        return (
          <>
            <label className="property-label">{t('Document Action')}</label>
            <select name="documentAction" value={documentData.documentAction ?? 'Review'} onChange={handleInputChange} className="property-select">
              <option value="Review">{t('Review')}</option>
              <option value="Generate">{t('Generate')}</option>
              <option value="Upload">{t('Upload')}</option>
              <option value="Archive">{t('Archive')}</option>
              <option value="Sign">{t('Sign')}</option>
            </select>
            <label className="property-label">{t('Template (if generating)')}</label>
            <CustomInput
              label={t('Template ID')}
              type="text"
              value={documentData.templateId ?? ''}
              onChange={(val) => {
                const updated = { ...documentData, templateId: val };
                setNodeData(updated as NodeData);
                onUpdateNode(selectedNode!.id, { templateId: val });
              }}
              placeholder={t('Template ID')}
            />
            <label className="property-label">{t('Required Fields')}</label>
            <textarea name="requiredFields" value={(documentData.requiredFields ?? []).join(', ')} onChange={(e) => {
              const values = e.target.value ? e.target.value.split(',').map(v => v.trim()) : [];
              const updatedData = { ...documentData, requiredFields: values };
              setNodeData(updatedData as NodeData);
              onUpdateNode(selectedNode!.id, { requiredFields: values });
            }} className="property-textarea" placeholder="field1, field2, field3"/>
          </>
        );
      }

      case NodeType.ESCALATION: {
        const escalationData = nodeData as Partial<EscalationNodeData>;
        return (
          <>
            <CustomInput
              label={t('Escalate After (Hours)')}
              type="number"
              value={String(escalationData.escalateAfterHours ?? 24)}
              onChange={(val) => {
                const num = parseInt(val) || 24;
                const updated = { ...escalationData, escalateAfterHours: num };
                setNodeData(updated as NodeData);
                onUpdateNode(selectedNode!.id, { escalateAfterHours: num });
              }}
              placeholder="24"
            />
            <label className="property-label">{t('Escalate To')}</label>
            <select name="escalateTo" value={escalationData.escalateTo ?? ''} onChange={handleInputChange} className="property-select">
              <option value="">{t('Select person...')}</option>
              {AVAILABLE_USERS_AND_ROLES.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
            <label className="property-label">{t('Escalation Action')}</label>
            <select name="escalationAction" value={escalationData.escalationAction ?? 'Notify'} onChange={handleInputChange} className="property-select">
              <option value="Notify">{t('Notify Only')}</option>
              <option value="Reassign">{t('Reassign Task')}</option>
              <option value="Skip">{t('Skip Task')}</option>
              <option value="Cancel">{t('Cancel Workflow')}</option>
            </select>
          </>
        );
      }

      case NodeType.DELAY: {
        const delayData = nodeData as Partial<DelayNodeData>;
        return (
          <>
            <CustomInput
              label={t('Delay Amount')}
              type="number"
              value={String(delayData.delayAmount ?? 1)}
              onChange={(val) => {
                const num = parseInt(val) || 1;
                const updated = { ...delayData, delayAmount: num };
                setNodeData(updated as NodeData);
                onUpdateNode(selectedNode!.id, { delayAmount: num });
              }}
              placeholder="1"
            />
            <label className="property-label">{t('Delay Unit')}</label>
            <select name="delayUnit" value={delayData.delayUnit ?? 'hours'} onChange={handleInputChange} className="property-select">
              <option value="minutes">{t('Minutes')}</option>
              <option value="hours">{t('Hours')}</option>
              <option value="days">{t('Days')}</option>
              <option value="weeks">{t('Weeks')}</option>
            </select>
            <label className="property-label">{t('Description')}</label>
            <textarea name="delayDescription" value={delayData.delayDescription ?? ''} onChange={handleInputChange} className="property-textarea" placeholder={t('Why this delay is needed...')}/>
          </>
        );
      }

      case NodeType.END: {
        const endData = nodeData as Partial<EndNodeData>;
        return (
          <>
            <label className="property-label">{t('Outcome')}</label>
            <select name="outcome" value={endData.outcome ?? 'Completed'} onChange={handleInputChange} className="property-select">
              <option value="Completed">{t('Completed')}</option>
              <option value="Approved">{t('Approved')}</option>
              <option value="Rejected">{t('Rejected')}</option>
              <option value="Cancelled">{t('Cancelled')}</option>
              <option value="Failed">{t('Failed')}</option>
            </select>
            <label className="property-label">{t('Final Message')}</label>
            <textarea name="finalMessage" value={endData.finalMessage ?? ''} onChange={handleInputChange} className="property-textarea" placeholder={t('Workflow completion message...')}/>
          </>
        );
      }

      case NodeType.PARALLEL: {
        const parallelData = nodeData as any;
        return (
          <>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {t('Split workflow into multiple parallel branches. Connect each output to different nodes.')}
            </div>
            <CustomInput
              label={t('Number of Branches')}
              type="number"
              value={String(parallelData.branchCount ?? 2)}
              onChange={(val) => {
                const num = Math.max(2, Math.min(parseInt(val) || 2, 10));
                const updated = { ...parallelData, branchCount: num };
                setNodeData(updated as NodeData);
                onUpdateNode(selectedNode!.id, { branchCount: num });
              }}
              placeholder="2"
            />
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {t('Minimum 2, maximum 10 branches')}
            </div>
          </>
        );
      }

      case NodeType.MERGE: {
        const mergeData = nodeData as any;
        const timeout = mergeData.timeout || { enabled: false, hours: 24, action: 'continue' };
        
        return (
          <>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {t('Wait for parallel branches to complete before continuing.')}
            </div>
            
            <CustomDropdown
              label={t('Merge Condition')}
              values={[
                `all::${t('All branches must complete')}`,
                `any::${t('Any one branch completes')}`,
                `count::${t('Specific number of branches')}`,
                `first_success::${t('First successful branch')}`
              ]}
              type="single"
              defaultValue={`${mergeData.mergeCondition || 'all'}::${
                mergeData.mergeCondition === 'any' ? t('Any one branch completes') :
                mergeData.mergeCondition === 'count' ? t('Specific number of branches') :
                mergeData.mergeCondition === 'first_success' ? t('First successful branch') :
                t('All branches must complete')
              }`}
              onChange={(val) => {
                const [condition] = String(val).split('::');
                const updated = { ...mergeData, mergeCondition: condition };
                setNodeData(updated as NodeData);
                onUpdateNode(selectedNode!.id, { mergeCondition: condition });
              }}
              placeholder={t('Select condition...')}
            />
            
            {mergeData.mergeCondition === 'count' && (
              <CustomInput
                label={t('Required Branch Count')}
                type="number"
                value={String(mergeData.requiredBranchCount ?? 1)}
                onChange={(val) => {
                  const num = Math.max(1, parseInt(val) || 1);
                  const updated = { ...mergeData, requiredBranchCount: num };
                  setNodeData(updated as NodeData);
                  onUpdateNode(selectedNode!.id, { requiredBranchCount: num });
                }}
                placeholder="1"
              />
            )}

            {/* Timeout Section */}
            <div className="property-info-box" style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{t('Timeout')}</h4>
                <IOSCheckbox
                  checked={timeout.enabled ?? false}
                  onChange={(checked) => {
                    const updated = { ...mergeData, timeout: { ...timeout, enabled: checked } };
                    setNodeData(updated as NodeData);
                    onUpdateNode(selectedNode!.id, { timeout: { ...timeout, enabled: checked } });
                  }}
                  label=""
                  name="timeoutEnabled"
                />
              </div>
              
              {timeout.enabled && (
                <>
                  <CustomInput
                    label={t('Timeout Hours')}
                    type="number"
                    value={String(timeout.hours ?? 24)}
                    onChange={(val) => {
                      const hours = Math.max(1, parseInt(val) || 24);
                      const updated = { ...mergeData, timeout: { ...timeout, hours } };
                      setNodeData(updated as NodeData);
                      onUpdateNode(selectedNode!.id, { timeout: { ...timeout, hours } });
                    }}
                    placeholder="24"
                  />
                  
                  <label className="property-label" style={{ marginTop: '12px' }}>{t('Timeout Action')}</label>
                  <select 
                    value={timeout.action ?? 'continue'} 
                    onChange={(e) => {
                      const updated = { ...mergeData, timeout: { ...timeout, action: e.target.value } };
                      setNodeData(updated as NodeData);
                      onUpdateNode(selectedNode!.id, { timeout: { ...timeout, action: e.target.value } });
                    }}
                    className="property-select"
                  >
                    <option value="continue">{t('Continue (ignore pending)')}</option>
                    <option value="cancel">{t('Cancel workflow')}</option>
                    <option value="skip_remaining">{t('Skip remaining branches')}</option>
                  </select>
                </>
              )}
            </div>
          </>
        );
      }

      case NodeType.AI_AGENT: {
        const aiData = nodeData as any;
        const tools = aiData.tools || [];
        const currentProvider = aiData.provider || 'openai';
        const availableModels = PROVIDER_MODELS[currentProvider] || [];
        
        return (
          <>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {t('Configure AI agent with model selection, prompts, and tools.')}
            </div>
            
            {/* Provider Selection */}
            <CustomDropdown
              label={t('AI Provider')}
              values={[
                `openai::OpenAI`,
                `anthropic::Anthropic`,
                `google::Google AI`,
                `ollama::Ollama (Local)`,
                `custom::Custom`
              ]}
              type="single"
              defaultValue={`${aiData.provider || 'openai'}::${
                aiData.provider === 'anthropic' ? 'Anthropic' :
                aiData.provider === 'google' ? 'Google AI' :
                aiData.provider === 'ollama' ? 'Ollama (Local)' :
                aiData.provider === 'custom' ? 'Custom' :
                'OpenAI'
              }`}
              onChange={(val) => {
                const [provider] = String(val).split('::');
                const updated = { ...aiData, provider };
                setNodeData(updated as NodeData);
                onUpdateNode(selectedNode!.id, { provider });
              }}
              placeholder={t('Select provider...')}
            />
            
            {/* Model Selection - provider-aware */}
            {availableModels.length > 0 ? (
              <CustomDropdown
                label={t('Model')}
                values={availableModels}
                type="single"
                defaultValue={aiData.model || availableModels[0]}
                onChange={(val) => {
                  const model = String(val || '');
                  const updated = { ...aiData, model };
                  setNodeData(updated as NodeData);
                  onUpdateNode(selectedNode!.id, { model });
                }}
                placeholder={t('Select model...')}
              />
            ) : (
              <CustomInput
                label={t('Model')}
                type="text"
                value={aiData.model || 'gpt-4'}
                onChange={(val) => {
                  const updated = { ...aiData, model: val };
                  setNodeData(updated as NodeData);
                  onUpdateNode(selectedNode!.id, { model: val });
                }}
                placeholder="gpt-4, claude-3-opus, gemini-pro..."
              />
            )}
            
            {/* API Credential */}
            <div className="property-info-box" style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 }}>{t('API Credentials')}</h4>
              <CustomInput
                label={t('Credential ID')}
                type="text"
                value={aiData.credentialId || ''}
                onChange={(val) => {
                  const updated = { ...aiData, credentialId: val };
                  setNodeData(updated as NodeData);
                  onUpdateNode(selectedNode!.id, { credentialId: val });
                }}
                placeholder={t('Select or enter credential ID...')}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {t('Credentials are stored securely in the database')}
              </div>
            </div>
            
            {/* Ollama Config (when Ollama selected) */}
            {aiData.provider === 'ollama' && (
              <div className="property-info-box" style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 }}>{t('Ollama Configuration')}</h4>
                <CustomInput
                  label={t('Base URL')}
                  type="text"
                  value={aiData.ollamaBaseUrl || 'http://localhost:11434'}
                  onChange={(val) => {
                    const updated = { ...aiData, ollamaBaseUrl: val };
                    setNodeData(updated as NodeData);
                    onUpdateNode(selectedNode!.id, { ollamaBaseUrl: val });
                  }}
                  placeholder="http://localhost:11434"
                />
              </div>
            )}
            
            {/* System Prompt */}
            <div style={{ marginTop: '16px' }}>
              <label className="property-label">{t('System Prompt')}</label>
              <textarea
                className="property-textarea"
                value={aiData.systemPrompt || ''}
                onChange={(e) => {
                  const updated = { ...aiData, systemPrompt: e.target.value };
                  setNodeData(updated as NodeData);
                  onUpdateNode(selectedNode!.id, { systemPrompt: e.target.value });
                }}
                placeholder={t('You are a helpful assistant...')}
                rows={4}
                style={{ minHeight: '80px' }}
              />
            </div>
            
            {/* User Prompt */}
            <div style={{ marginTop: '12px' }}>
              <label className="property-label">{t('User Prompt')}</label>
              <textarea
                className="property-textarea"
                value={aiData.userPrompt || ''}
                onChange={(e) => {
                  const updated = { ...aiData, userPrompt: e.target.value };
                  setNodeData(updated as NodeData);
                  onUpdateNode(selectedNode!.id, { userPrompt: e.target.value });
                }}
                placeholder={t('Use {{variable}} to reference context data...')}
                rows={3}
                style={{ minHeight: '60px' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {t('Use {{input}} for previous node output, {{contextData.field}} for workflow context')}
              </div>
            </div>
            
            {/* Temperature & Max Tokens */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <CustomInput
                label={t('Temperature')}
                type="number"
                value={String(aiData.temperature ?? 0.7)}
                onChange={(val) => {
                  const temp = Math.max(0, Math.min(parseFloat(val) || 0.7, 2));
                  const updated = { ...aiData, temperature: temp };
                  setNodeData(updated as NodeData);
                  onUpdateNode(selectedNode!.id, { temperature: temp });
                }}
                placeholder="0.7"
              />
              <CustomInput
                label={t('Max Tokens')}
                type="number"
                value={String(aiData.maxTokens ?? 1000)}
                onChange={(val) => {
                  const tokens = Math.max(1, parseInt(val) || 1000);
                  const updated = { ...aiData, maxTokens: tokens };
                  setNodeData(updated as NodeData);
                  onUpdateNode(selectedNode!.id, { maxTokens: tokens });
                }}
                placeholder="1000"
              />
            </div>
            
            {/* Output Variable */}
            <CustomInput
              label={t('Output Variable')}
              type="text"
              value={aiData.outputVariable || 'aiResponse'}
              onChange={(val) => {
                const updated = { ...aiData, outputVariable: val };
                setNodeData(updated as NodeData);
                onUpdateNode(selectedNode!.id, { outputVariable: val });
              }}
              placeholder="aiResponse"
            />
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {t('Variable name to store AI response in context')}
            </div>
            
            {/* Tools Section */}
            <div className="property-info-box" style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 }}>{t('Connected Tools')}</h4>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {t('Connect Tool nodes to the left handle of this AI Agent to enable tool usage.')}
              </div>
              {tools.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {tools.map((tool: any, idx: number) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      padding: '6px 8px',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <span style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: tool.enabled ? '#10b981' : '#6b7280' 
                      }} />
                      <span style={{ flex: 1 }}>{tool.displayName || tool.name}</span>
                      <span style={{ 
                        fontSize: '10px', 
                        color: 'var(--text-secondary)',
                        textTransform: 'capitalize'
                      }}>
                        {tool.category}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: '4px'
                }}>
                  {t('No tools connected')}
                </div>
              )}
            </div>
          </>
        );
      }

      case NodeType.TOOL: {
        const toolData = nodeData as any;
        
        return (
          <>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {t('Configure a tool that can be used by AI Agent nodes.')}
            </div>
            
            {/* Tool Selection */}
            <CustomDropdown
              label={t('Tool')}
              values={[
                `search_database::Search Database`,
                `send_email::Send Email`,
                `http_request::HTTP Request`,
                `create_task::Create Task`,
                `get_employee_info::Get Employee Info`,
                `calculate::Calculate`,
                `format_date::Format Date`,
                `generate_document::Generate Document`
              ]}
              type="single"
              defaultValue={toolData.toolName ? `${toolData.toolName}::${toolData.label || toolData.toolName}` : ''}
              onChange={(val) => {
                const [toolName, displayName] = String(val).split('::');
                const updated = { ...toolData, toolName, label: displayName };
                setNodeData(updated as NodeData);
                onUpdateNode(selectedNode!.id, { toolName, label: displayName });
              }}
              placeholder={t('Select a tool...')}
            />
            
            {/* Category */}
            <CustomDropdown
              label={t('Category')}
              values={[
                `data::${t('Data')}`,
                `communication::${t('Communication')}`,
                `integration::${t('Integration')}`,
                `workflow::${t('Workflow')}`,
                `utility::${t('Utility')}`,
                `document::${t('Document')}`
              ]}
              type="single"
              defaultValue={`${toolData.category || 'utility'}::${
                toolData.category === 'data' ? t('Data') :
                toolData.category === 'communication' ? t('Communication') :
                toolData.category === 'integration' ? t('Integration') :
                toolData.category === 'workflow' ? t('Workflow') :
                toolData.category === 'document' ? t('Document') :
                t('Utility')
              }`}
              onChange={(val) => {
                const [category] = String(val).split('::');
                const updated = { ...toolData, category };
                setNodeData(updated as NodeData);
                onUpdateNode(selectedNode!.id, { category });
              }}
              placeholder={t('Select category...')}
            />
            
            {/* Description */}
            <div style={{ marginTop: '12px' }}>
              <label className="property-label">{t('Description')}</label>
              <textarea
                className="property-textarea"
                value={toolData.description || ''}
                onChange={(e) => {
                  const updated = { ...toolData, description: e.target.value };
                  setNodeData(updated as NodeData);
                  onUpdateNode(selectedNode!.id, { description: e.target.value });
                }}
                placeholder={t('Describe what this tool does...')}
                rows={2}
              />
            </div>
            
            {/* Connection Info */}
            <div className="property-info-box" style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 }}>{t('Connection')}</h4>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {t('Connect the right handle of this Tool to the left (tools) handle of an AI Agent node.')}
              </div>
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="properties-bar">
      <div className="properties-bar-header">
        <h3>{t('Properties')}</h3>
        <button onClick={onClose} className="properties-bar-close">
          <X size={18} />
        </button>
      </div>

      <div className="properties-bar-content">
        {selectedNode && nodeData && (
          <>
            <div className="properties-section">
              <div className="properties-section-title">{t('Basic Information')}</div>
              
              <div className="property-field">
                <label className="property-label">{t('Label')}</label>
                <input
                  type="text"
                  className="property-input"
                  name="label"
                  value={nodeData?.label ?? ''}
                  onChange={handleInputChange}
                  placeholder={t('Enter label')}
                />
              </div>

              <div className="property-field">
                <label className="property-label">{t('Description')}</label>
                <textarea
                  className="property-textarea"
                  name="description"
                  value={(nodeData as any)?.description ?? ''}
                  onChange={handleInputChange}
                  placeholder={t('Enter description')}
                  rows={3}
                />
              </div>

              <div className="property-field">
                <label className="property-label">{t('Node Type')}</label>
                <input
                  type="text"
                  className="property-input"
                  value={selectedNode.type || ''}
                  disabled
                />
              </div>
            </div>

            <div className="properties-section">
              <div className="properties-section-title">{t('Node Settings')}</div>
              {renderSettings()}
            </div>

            <div className="properties-section">
              <div className="properties-section-title">{t('Appearance')}</div>
              <div className="property-field">
                <label className="property-label">{t('Border Color')}</label>
                <div className="property-color-picker">
                  {Object.values(NODE_COLORS).map(color => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`property-color-button ${(nodeData as any)?.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="properties-section">
              <button onClick={handleDeleteNode} className="property-delete-button">
                <Trash2 size={16} />
                {t('Delete Node')}
              </button>
            </div>
          </>
        )}

        {selectedEdge && edgeData && (
          <div className="properties-section">
            <div className="properties-section-title">{t('Connection Settings')}</div>
            
            {/* Label */}
            <CustomInput
              label={t('Label')}
                type="text"
              value={(edgeData.label as string) || ''}
              onChange={(val) => {
                const newLabel = val;
                const updatedEdge = { ...edgeData, label: newLabel };
                setEdgeData(updatedEdge);
                if (onUpdateEdge) {
                  onUpdateEdge(selectedEdge.id, { label: newLabel });
                }
              }}
              placeholder={t('Enter label')}
            />

            {/* Animation */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="property-label" style={{ marginBottom: '0.5rem', display: 'block' }}>{t('Animation')}</label>
              <button
                onClick={() => {
                  const newAnimated = !edgeData.animated;
                  const updatedEdge = { ...edgeData, animated: newAnimated };
                  setEdgeData(updatedEdge);
                  if (onUpdateEdge) {
                    onUpdateEdge(selectedEdge.id, { animated: newAnimated });
                  }
                }}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  height: '24px',
                  width: '44px',
                  alignItems: 'center',
                  borderRadius: '9999px',
                  transition: 'background-color 0.2s',
                  backgroundColor: edgeData.animated ? '#3b82f6' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    height: '16px',
                    width: '16px',
                    transform: edgeData.animated ? 'translateX(20px)' : 'translateX(4px)',
                    borderRadius: '9999px',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>
            </div>

            {/* Direction */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="property-label" style={{ marginBottom: '0.5rem', display: 'block' }}>{t('Direction')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    const newEdge = {
                      ...edgeData,
                      source: edgeData.target,
                      target: edgeData.source,
                      sourceHandle: edgeData.targetHandle,
                      targetHandle: edgeData.sourceHandle,
                    };
                    setEdgeData(newEdge);
                    if (onUpdateEdge) {
                      onUpdateEdge(selectedEdge.id, {
                        source: newEdge.source,
                        target: newEdge.target,
                        sourceHandle: newEdge.sourceHandle,
                        targetHandle: newEdge.targetHandle,
                      });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Reverse direction"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={() => {
                    const newEdge = {
                      ...edgeData,
                      source: edgeData.source,
                      target: edgeData.target,
                      sourceHandle: edgeData.sourceHandle,
                      targetHandle: edgeData.targetHandle,
                    };
                    setEdgeData(newEdge);
                    if (onUpdateEdge) {
                      onUpdateEdge(selectedEdge.id, {
                        source: newEdge.source,
                        target: newEdge.target,
                        sourceHandle: newEdge.sourceHandle,
                        targetHandle: newEdge.targetHandle,
                      });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Forward direction"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Start Marker */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="property-label" style={{ marginBottom: '0.5rem', display: 'block' }}>{t('Start Marker')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    const updatedEdge = { ...edgeData, markerStart: undefined };
                    setEdgeData(updatedEdge);
                    if (onUpdateEdge) {
                      onUpdateEdge(selectedEdge.id, { markerStart: undefined });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: `1px solid ${!edgeData.markerStart ? '#9ca3af' : '#d1d5db'}`,
                    borderRadius: '0.375rem',
                    backgroundColor: !edgeData.markerStart ? '#f3f4f6' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="No arrow"
                >
                  <Minus size={16} />
                </button>
                <button
                  onClick={() => {
                    const markerStart = { type: 'arrow' as const, color: (edgeData.style as any)?.stroke || '#6b7280' };
                    const updatedEdge = { ...edgeData, markerStart };
                    setEdgeData(updatedEdge);
                    if (onUpdateEdge) {
                      onUpdateEdge(selectedEdge.id, { markerStart });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: `1px solid ${edgeData.markerStart ? '#9ca3af' : '#d1d5db'}`,
                    borderRadius: '0.375rem',
                    backgroundColor: edgeData.markerStart ? '#f3f4f6' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Arrow start"
                >
                  <ArrowLeft size={16} />
                </button>
              </div>
            </div>

            {/* End Marker */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="property-label" style={{ marginBottom: '0.5rem', display: 'block' }}>{t('End Marker')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    const updatedEdge = { ...edgeData, markerEnd: undefined };
                    setEdgeData(updatedEdge);
                    if (onUpdateEdge) {
                      onUpdateEdge(selectedEdge.id, { markerEnd: undefined });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: `1px solid ${!edgeData.markerEnd ? '#9ca3af' : '#d1d5db'}`,
                    borderRadius: '0.375rem',
                    backgroundColor: !edgeData.markerEnd ? '#f3f4f6' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="No arrow"
                >
                  <Minus size={16} />
                </button>
                <button
                  onClick={() => {
                    const markerEnd = { type: 'arrowclosed' as const, color: (edgeData.style as any)?.stroke || '#6b7280' };
                    const updatedEdge = { ...edgeData, markerEnd };
                    setEdgeData(updatedEdge);
                    if (onUpdateEdge) {
                      onUpdateEdge(selectedEdge.id, { markerEnd });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: `1px solid ${edgeData.markerEnd ? '#9ca3af' : '#d1d5db'}`,
                    borderRadius: '0.375rem',
                    backgroundColor: edgeData.markerEnd ? '#f3f4f6' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Arrow end"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Line Style */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="property-label" style={{ marginBottom: '0.5rem', display: 'block' }}>{t('Line Style')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    const updatedEdge = { ...edgeData, type: 'default' };
                    setEdgeData(updatedEdge);
                    if (onUpdateEdge) {
                      onUpdateEdge(selectedEdge.id, { type: 'default' });
                    }
                  }}
                  style={{
                    padding: '0.5rem',
                    border: `1px solid ${(edgeData.type === 'default' || !edgeData.type) ? '#9ca3af' : '#d1d5db'}`,
                    borderRadius: '0.375rem',
                    backgroundColor: (edgeData.type === 'default' || !edgeData.type) ? '#f3f4f6' : 'white',
                    cursor: 'pointer',
                  }}
                  title="Bezier curve"
                >
                  <svg style={{ width: '100%', height: '20px' }} viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M 2 12 Q 15 2, 30 12 T 58 12" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const updatedEdge = { ...edgeData, type: 'step' };
                    setEdgeData(updatedEdge);
                    if (onUpdateEdge) {
                      onUpdateEdge(selectedEdge.id, { type: 'step' });
                    }
                  }}
                  style={{
                    padding: '0.5rem',
                    border: `1px solid ${edgeData.type === 'step' ? '#9ca3af' : '#d1d5db'}`,
                    borderRadius: '0.375rem',
                    backgroundColor: edgeData.type === 'step' ? '#f3f4f6' : 'white',
                    cursor: 'pointer',
                  }}
                  title="Step line"
                >
                  <svg style={{ width: '100%', height: '20px' }} viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M 2 12 L 20 12 L 20 6 L 40 6 L 40 12 L 58 12" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const updatedEdge = { ...edgeData, type: 'straight' };
                    setEdgeData(updatedEdge);
                    if (onUpdateEdge) {
                      onUpdateEdge(selectedEdge.id, { type: 'straight' });
                    }
                  }}
                  style={{
                    padding: '0.5rem',
                    border: `1px solid ${edgeData.type === 'straight' ? '#9ca3af' : '#d1d5db'}`,
                    borderRadius: '0.375rem',
                    backgroundColor: edgeData.type === 'straight' ? '#f3f4f6' : 'white',
                    cursor: 'pointer',
                  }}
                  title="Straight line"
                >
                  <svg style={{ width: '100%', height: '20px' }} viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="2" y1="12" x2="58" y2="12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stroke Width */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="property-label" style={{ marginBottom: '0.5rem', display: 'block' }}>{t('Stroke Width')}</label>
              <input
                type="range"
                min="1"
                max="10"
                value={(edgeData.style as any)?.strokeWidth || 2}
                onChange={(e) => {
                  const strokeWidth = parseInt(e.target.value);
                  const newStyle = { ...(edgeData.style || {}), strokeWidth };
                  const updatedEdge = { ...edgeData, style: newStyle };
                  setEdgeData(updatedEdge);
                  if (onUpdateEdge) {
                    onUpdateEdge(selectedEdge.id, { style: newStyle });
                  }
                }}
                style={{ width: '100%', height: '8px', borderRadius: '0.5rem', cursor: 'pointer' }}
              />
              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '0.25rem' }}>
                {(edgeData.style as any)?.strokeWidth || 2}px
              </div>
            </div>

            {/* Color */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="property-label" style={{ marginBottom: '0.5rem', display: 'block' }}>{t('Color')}</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {EDGE_COLORS.map((color) => {
                  const currentColor = (edgeData.style as any)?.stroke || '#6b7280';
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        const newStyle = { ...(edgeData.style || {}), stroke: color };
                        const updatedEdge = { ...edgeData, style: newStyle };
                        setEdgeData(updatedEdge);
                        if (onUpdateEdge) {
                          onUpdateEdge(selectedEdge.id, { style: newStyle });
                        }
                      }}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '0.375rem',
                        border: `2px solid ${currentColor === color ? '#1f2937' : '#d1d5db'}`,
                        backgroundColor: color,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      title={color}
                    />
                  );
                })}
              </div>
            </div>

            {/* Delete Button */}
            {onDeleteEdge && (
              <button
                onClick={() => {
                  if (onDeleteEdge) {
                    onDeleteEdge(selectedEdge.id);
                  }
                }}
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                }}
              >
                <Trash2 size={16} />
                {t('Delete Connection')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
