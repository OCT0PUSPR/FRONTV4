import React, { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';

import useStore from '../../store/workflowStore';
import { NodeData, NodeType, TriggerNodeData, ApprovalNodeData, ConditionNodeData, NotificationNodeData, EndNodeData, PersonNodeData, DocumentNodeData, EscalationNodeData, DelayNodeData } from '../../types';
import { Trash2 } from 'lucide-react';
import { AVAILABLE_USERS_AND_ROLES, NODE_COLORS } from '../../constants';
import { API_CONFIG } from '../config/api';
import { useAuth } from '../../context/auth';
import { CustomDropdown } from './NewCustomDropdown';

const NodeSettingsPanel: React.FC = () => {
  const { selectedNode, updateNodeData, deleteNode } = useStore();
  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [people, setPeople] = useState<{ id: number; name: string }[]>([]);
  const { sessionId } = useAuth();

  useEffect(() => {
    if (selectedNode) {
      setNodeData((selectedNode as any).data ?? null);
    } else {
      setNodeData(null);
    }
  }, [selectedNode]);

  useEffect(() => {
    const loadPeople = async () => {
      try {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/users`);
        if (!res.ok) throw new Error('Failed to load users');
        const json = await res.json();
        const list = Array.isArray(json?.users) ? json.users : [];
        const mapped = list
          .map((u: any) => ({ id: Number(u.id), name: String(u.name || '') }))
          .filter((u: any) => u.id && u.name);
        setPeople(mapped);
      } catch {
        setPeople(AVAILABLE_USERS_AND_ROLES.map((n, idx) => ({ id: idx + 1, name: n })));
      }
    };
    loadPeople();
  }, [sessionId]);

  if (!selectedNode || !nodeData) {
    return null;
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...nodeData, [name]: value };
    setNodeData(updatedData);
    updateNodeData(selectedNode.id, { [name]: value });
  };
  
  const handleColorChange = (color: string) => {
    const newColor = NODE_COLORS.find(c => c === color) || color;
    const updatedData = { ...nodeData, color: newColor } as NodeData;
    setNodeData(updatedData);
    updateNodeData(selectedNode.id, { color: newColor });
  }

  const renderSettings = () => {
    switch (selectedNode.type as NodeType) {
      case NodeType.TRIGGER:
  const triggerData = nodeData as Partial<TriggerNodeData>;
  return (
    <>
      <label className="block text-sm font-medium text-gray-700 mt-4">Trigger Type</label>
      <select 
        name="triggerType" 
        value={triggerData.triggerType ?? 'Manual'} 
        onChange={handleInputChange} 
        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
      >
        <option value="Manual">Manual</option>
        <option value="Correspondence Created">Correspondence Created</option>
        <option value="Correspondence Updated">Correspondence Updated</option>
        <option value="Status Change">Status Change</option>
        <option value="Scheduled">Scheduled</option>
        <option value="Product Created">Product Created</option>
        <option value="Product Updated">Product Updated</option>
        <option value="Product Deleted">Product Deleted</option>
      </select>
      
      {/* Show entity type based on trigger selection */}
      <label className="block text-sm font-medium text-gray-700 mt-3">Entity Type</label>
      <input 
        type="text" 
        name="sourceEntity" 
        value={
          triggerData.triggerType?.includes('Product') ? 'product' :
          triggerData.triggerType?.includes('Correspondence') ? 'correspondence' :
          triggerData.sourceEntity ?? ''
        }
        onChange={handleInputChange} 
        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm bg-gray-50" 
        placeholder="e.g., product, correspondence"
        readOnly={triggerData.triggerType?.includes('Product') || triggerData.triggerType?.includes('Correspondence')}
      />

      {/* Conditional fields for product triggers */}
      {(triggerData.triggerType === 'Product Updated' || 
        triggerData.triggerType === 'Product Created') && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Trigger Conditions (Optional)</h4>
          <p className="text-xs text-blue-700 mb-3">
            Only trigger this workflow when certain conditions are met
          </p>

          <label className="block text-sm font-medium text-gray-700 mt-2">Field to Check</label>
          <input 
            type="text" 
            name="conditionField" 
            value={(triggerData as any).conditionField ?? ''} 
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" 
            placeholder="e.g., lst_price, standard_price, categ_id"
          />

          <label className="block text-sm font-medium text-gray-700 mt-2">Operator</label>
          <select 
            name="conditionOperator" 
            value={(triggerData as any).conditionOperator ?? 'greater_than'}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
          >
            <option value="equals">Equals (=)</option>
            <option value="not_equals">Not Equals (≠)</option>
            <option value="greater_than">Greater Than (&gt;)</option>
            <option value="less_than">Less Than (&lt;)</option>
            <option value="greater_than_or_equal">Greater Than or Equal (≥)</option>
            <option value="less_than_or_equal">Less Than or Equal (≤)</option>
            <option value="contains">Contains</option>
            <option value="starts_with">Starts With</option>
            <option value="ends_with">Ends With</option>
          </select>

          <label className="block text-sm font-medium text-gray-700 mt-2">Value</label>
          <input 
            type="text" 
            name="conditionValue" 
            value={(triggerData as any).conditionValue ?? ''} 
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" 
            placeholder="e.g., 1000"
          />

          <div className="mt-3 p-2 bg-white rounded text-xs text-gray-600">
            <strong>Example:</strong> Trigger only when price &gt; 1000<br/>
            Field: <code className="bg-gray-100 px-1">lst_price</code><br/>
            Operator: <code className="bg-gray-100 px-1">greater_than</code><br/>
            Value: <code className="bg-gray-100 px-1">1000</code>
          </div>
        </div>
      )}

      {/* Schedule settings for scheduled triggers */}
      {triggerData.triggerType === 'Scheduled' && (
        <>
          <label className="block text-sm font-medium text-gray-700 mt-3">Schedule Time</label>
          <input 
            type="time" 
            name="scheduleTime" 
            value={(triggerData as any).scheduleTime ?? '09:00'} 
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
          />

          <label className="block text-sm font-medium text-gray-700 mt-3">Schedule Days</label>
          <div className="mt-2 space-y-1">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <label key={day} className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={((triggerData as any).scheduleDays || []).includes(day)}
                  onChange={(e) => {
                    const currentDays = (triggerData as any).scheduleDays || [];
                    const newDays = e.target.checked
                      ? [...currentDays, day]
                      : currentDays.filter((d: string) => d !== day);
                    const updated = { ...triggerData, scheduleDays: newDays };
                    setNodeData(updated as NodeData);
                    updateNodeData(selectedNode.id, { scheduleDays: newDays });
                  }}
                  className="mr-2"
                />
                {day}
              </label>
            ))}
          </div>
        </>
      )}

      {/* Info box */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 mb-1">Trigger Information</h4>
        <p className="text-xs text-gray-600">
          {triggerData.triggerType === 'Product Created' && 
            'This workflow will start when a new product is created in the system.'}
          {triggerData.triggerType === 'Product Updated' && 
            'This workflow will start when an existing product is updated.'}
          {triggerData.triggerType === 'Product Deleted' && 
            'This workflow will start when a product is deleted.'}
          {triggerData.triggerType === 'Manual' && 
            'This workflow must be started manually by a user.'}
          {triggerData.triggerType?.includes('Correspondence') && 
            'This workflow will trigger automatically when correspondence is created or updated.'}
          {triggerData.triggerType === 'Scheduled' && 
            'This workflow will run automatically on the specified schedule.'}
        </p>
      </div>
    </>
  );
      case NodeType.PERSON: {
        const personData = nodeData as Partial<PersonNodeData>;
        return (
          <>
            <div className="mt-2">
              <CustomDropdown
                label="Assign To"
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
                  updateNodeData(selectedNode.id, { assignedToId: id, assignedTo: finalName } as any);
                }}
                placeholder="Select person..."
              />
            </div>

            <div className="mt-3">
              <CustomDropdown
                label="Task Priority"
                values={["Low","Medium","High","Urgent"]}
                type="single"
                defaultValue={personData.priority ?? 'Medium'}
                onChange={(val) => {
                  const updated = { ...personData, priority: String(val) } as PersonNodeData;
                  setNodeData(updated as unknown as NodeData);
                  updateNodeData(selectedNode.id, { priority: String(val) } as any);
                }}
              />
            </div>

            <label className="block text-sm font-medium text-gray-700 mt-3">Due In (Hours)</label>
            <input type="number" name="dueInHours" value={personData.dueInHours ?? 24} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" min="1"/>
            
            <label className="block text-sm font-medium text-gray-700 mt-3">Instructions</label>
            <textarea name="instructions" value={personData.instructions ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm h-20" placeholder="Task instructions..."/>
          </>
        );
      }

      case NodeType.APPROVAL: {
        const approvalData = nodeData as Partial<ApprovalNodeData>;
        return (
          <>
            <label className="block text-sm font-medium text-gray-700 mt-4">Approval Type</label>
            <select name="approvalType" value={approvalData.approvalType ?? 'Sequential'} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
              <option value="Sequential">Sequential (One by One)</option>
              <option value="Parallel">Parallel (All at Once)</option>
              <option value="Any">Any (First to Respond)</option>
            </select>

            <div className="mt-3">
              <CustomDropdown
                label="Approvers"
                values={people.map(p => `${p.id}::${p.name}`)}
                type="multi"
                defaultValue={(approvalData.approverIds ?? []).map(id => `${id}::${people.find(p=>p.id===id)?.name || ''}`)}
                onChange={(vals) => {
                  const arr = Array.isArray(vals) ? vals : [];
                  const ids = arr.map(v => Number(String(v).split('::')[0])).filter(Boolean);
                  const names = people.filter(p => ids.includes(p.id)).map(p => p.name);
                  const updatedData = { ...(approvalData as ApprovalNodeData), approverIds: ids, approvers: names } as NodeData;
                  setNodeData(updatedData as NodeData);
                  updateNodeData(selectedNode.id, { approverIds: ids, approvers: names } as any);
                }}
                placeholder="Select approvers..."
              />
            </div>

            <label className="block text-sm font-medium text-gray-700 mt-3">Required Approvals</label>
            <input type="number" name="requiredApprovals" value={approvalData.requiredApprovals ?? 1} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" min="1"/>
            
            <label className="block text-sm font-medium text-gray-700 mt-3">
              <input type="checkbox" name="requireComments" checked={approvalData.requireComments ?? false} onChange={(e) => {
                const updatedData = { ...approvalData, requireComments: e.target.checked };
                setNodeData(updatedData as NodeData);
                updateNodeData(selectedNode.id, { requireComments: e.target.checked });
              }} className="mr-2"/>
              Require Comments
            </label>
          </>
        );
      }

      case NodeType.CONDITION: {
        const conditionData = nodeData as Partial<ConditionNodeData>;
        return (
          <>
            <label className="block text-sm font-medium text-gray-700 mt-4">Condition Type</label>
            <select 
              name="conditionType" 
              value={conditionData.conditionType ?? 'Field Value'} 
              onChange={handleInputChange} 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
            >
              <option value="Field Value">Field Value</option>
              <option value="Approval Result">Approval Result</option>
              <option value="Amount">Amount</option>
              <option value="Custom Expression">Custom Expression</option>
            </select>
      
            <label className="block text-sm font-medium text-gray-700 mt-3">Condition Expression</label>
            <textarea 
              name="expression" 
              value={conditionData.expression ?? ''} 
              onChange={handleInputChange} 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm h-20 font-mono" 
              placeholder="e.g., amount > 1000"
            />
            <p className="text-xs text-gray-500 mt-1">Expression to evaluate (true/false)</p>
      
            {/* Helper examples based on condition type */}
            {conditionData.conditionType === 'Field Value' && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-600">
                <strong>Examples:</strong><br/>
                • price &gt; 1000<br/>
                • status == "pending"<br/>
                • category == "Electronics"
              </div>
            )}
            
            {conditionData.conditionType === 'Approval Result' && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-600">
                <strong>Examples:</strong><br/>
                • lastApprovalResult == "approved"<br/>
                • lastApprovalResult == "rejected"
              </div>
            )}
            
            {conditionData.conditionType === 'Amount' && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-600">
                <strong>Examples:</strong><br/>
                • amount &gt; 1000<br/>
                • amount &lt;= 5000<br/>
                • total &gt;= 10000
              </div>
            )}
          </>
        );
      }

      case NodeType.NOTIFICATION: {
        const notificationData = nodeData as Partial<NotificationNodeData>;
        return (
          <>
            <label className="block text-sm font-medium text-gray-700 mt-4">Notification Type</label>
            <select name="notificationType" value={notificationData.notificationType ?? 'Email'} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
              <option value="Email">Email</option>
              <option value="In-App">In-App</option>
              <option value="SMS">SMS</option>
              <option value="All">All Channels</option>
            </select>

            <label className="block text-sm font-medium text-gray-700 mt-3">Recipients</label>
            <input type="text" name="recipients" value={(notificationData.recipients ?? []).join(',')} onChange={(e) => {
              const values = e.target.value ? e.target.value.split(',').map(v => v.trim()) : [];
              const updatedData = { ...(notificationData as NotificationNodeData), recipients: values } as NodeData;
              setNodeData(updatedData as NodeData);
              updateNodeData(selectedNode.id, { recipients: values });
            }} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" placeholder="Comma-separated names"/>
            
            <label className="block text-sm font-medium text-gray-700 mt-3">Subject</label>
            <input type="text" name="subject" value={notificationData.subject ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" placeholder="Notification subject"/>

            <label className="block text-sm font-medium text-gray-700 mt-3">Message</label>
            <textarea name="message" value={notificationData.message ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm h-24" placeholder="Notification message..."/>
          </>
        );
      }

      case NodeType.DOCUMENT: {
        const documentData = nodeData as Partial<DocumentNodeData>;
        return (
          <>
            <label className="block text-sm font-medium text-gray-700 mt-4">Document Action</label>
            <select name="documentAction" value={documentData.documentAction ?? 'Review'} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
              <option value="Review">Review</option>
              <option value="Generate">Generate</option>
              <option value="Upload">Upload</option>
              <option value="Archive">Archive</option>
              <option value="Sign">Sign</option>
            </select>

            <label className="block text-sm font-medium text-gray-700 mt-3">Template (if generating)</label>
            <input type="text" name="templateId" value={documentData.templateId ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" placeholder="Template ID"/>
            
            <label className="block text-sm font-medium text-gray-700 mt-3">Required Fields</label>
            <textarea name="requiredFields" value={(documentData.requiredFields ?? []).join(', ')} onChange={(e) => {
              const values = e.target.value ? e.target.value.split(',').map(v => v.trim()) : [];
              const updatedData = { ...documentData, requiredFields: values };
              setNodeData(updatedData as NodeData);
              updateNodeData(selectedNode.id, { requiredFields: values });
            }} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm h-16" placeholder="field1, field2, field3"/>
          </>
        );
      }

      case NodeType.ESCALATION: {
        const escalationData = nodeData as Partial<EscalationNodeData>;
        return (
          <>
            <label className="block text-sm font-medium text-gray-700 mt-4">Escalate After (Hours)</label>
            <input type="number" name="escalateAfterHours" value={escalationData.escalateAfterHours ?? 24} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" min="1"/>

            <label className="block text-sm font-medium text-gray-700 mt-3">Escalate To</label>
            <select name="escalateTo" value={escalationData.escalateTo ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
              <option value="">Select person...</option>
              {AVAILABLE_USERS_AND_ROLES.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>

            <label className="block text-sm font-medium text-gray-700 mt-3">Escalation Action</label>
            <select name="escalationAction" value={escalationData.escalationAction ?? 'Notify'} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
              <option value="Notify">Notify Only</option>
              <option value="Reassign">Reassign Task</option>
              <option value="Skip">Skip Task</option>
              <option value="Cancel">Cancel Workflow</option>
            </select>
          </>
        );
      }

      case NodeType.DELAY: {
        const delayData = nodeData as Partial<DelayNodeData>;
        return (
          <>
            <label className="block text-sm font-medium text-gray-700 mt-4">Delay Amount</label>
            <input type="number" name="delayAmount" value={delayData.delayAmount ?? 1} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" min="1"/>

            <label className="block text-sm font-medium text-gray-700 mt-3">Delay Unit</label>
            <select name="delayUnit" value={delayData.delayUnit ?? 'hours'} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </select>

            <label className="block text-sm font-medium text-gray-700 mt-3">Description</label>
            <textarea name="delayDescription" value={delayData.delayDescription ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm h-16" placeholder="Why this delay is needed..."/>
          </>
        );

      }

      case NodeType.END: {
        const endData = nodeData as Partial<EndNodeData>;
        return (
          <>
            <label className="block text-sm font-medium text-gray-700 mt-4">Outcome</label>
            <select name="outcome" value={endData.outcome ?? 'Completed'} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
              <option value="Completed">Completed</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Failed">Failed</option>
            </select>

            <label className="block text-sm font-medium text-gray-700 mt-3">Final Message</label>
            <textarea name="finalMessage" value={endData.finalMessage ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm h-16" placeholder="Workflow completion message..."/>
          </>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="absolute top-24 left-4 z-10 w-80 bg-white rounded-lg shadow-xl p-4 max-h-[calc(100vh-140px)] overflow-y-auto pointer-events-auto">
      <div className="sticky top-0 bg-white pb-3 border-b border-gray-200 mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Node Settings</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Label</label>
          <input type="text" name="label" value={nodeData?.label ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" value={(nodeData as any)?.description ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm h-16 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Optional description..."/>
        </div>
        
        {renderSettings()}
        
        <div className="pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Border Color</label>
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {NODE_COLORS.map(color => (
                <button key={color} onClick={() => handleColorChange(color)} className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${(nodeData as any)?.color === color ? 'border-gray-800 ring-2 ring-blue-400' : 'border-gray-300'}`} style={{ backgroundColor: color }} title={color}/>
              ))}
            </div>
          </div>
        </div>

        <button onClick={() => deleteNode(selectedNode.id)} className="w-full mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-medium">
          <Trash2 className="w-4 h-4" />
          Delete Node
        </button>
      </div>
    </div>
  );
};

export default NodeSettingsPanel;