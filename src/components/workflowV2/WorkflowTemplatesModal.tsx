import { useState, useEffect } from 'react';
import { X, Search, FileText, Calendar, User, Square, Trash2, Archive, Upload, Pen, PenOff, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_CONFIG, getTenantHeaders, tenantFetch } from '../../config/api';
import { ConfirmationModal } from '../ConfirmationModal';
import { IOSCheckbox } from '../IOSCheckbox';
import { useTheme } from '../../../context/theme';
import { useCasl } from '../../../context/casl';
import './WorkflowTemplatesModal.css';

interface Workflow {
  id: string | number;
  name: string;
  description: string;
  status: string;
  updated_at: string;
  created_at: string;
  node_count?: number;
  triggerType?: string;
  triggerEntity?: string;
}

interface WorkflowTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWorkflow: (workflowId: string | number) => void;
  currentWorkflowId?: string | number;
  onToast?: (text: string, state: 'success' | 'error') => void;
}

export const WorkflowTemplatesModal = ({
  isOpen,
  onClose,
  onSelectWorkflow,
  currentWorkflowId,
  onToast,
}: WorkflowTemplatesModalProps) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const { canCreatePage } = useCasl();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<Set<string | number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (isOpen) {
      loadWorkflows();
      setIsSelectionMode(false);
      setSelectedWorkflowIds(new Set());
    }
  }, [isOpen]);

  const toggleSelection = (workflowId: string | number) => {
    const newSelected = new Set(selectedWorkflowIds);
    if (newSelected.has(workflowId)) {
      newSelected.delete(workflowId);
    } else {
      newSelected.add(workflowId);
    }
    setSelectedWorkflowIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedWorkflowIds.size === filteredWorkflows.length) {
      setSelectedWorkflowIds(new Set());
    } else {
      setSelectedWorkflowIds(new Set(filteredWorkflows.map(w => w.id)));
    }
  };

  const handleDelete = () => {
    if (selectedWorkflowIds.size === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: t('Delete Workflows'),
      message: t('Are you sure you want to delete {{count}} workflow(s)? This action cannot be undone.', { count: selectedWorkflowIds.size }),
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        setProcessing(true);
        const token = localStorage.getItem('token');
        let successCount = 0;
        let failCount = 0;

        try {
          for (const id of selectedWorkflowIds) {
            try {
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...getTenantHeaders(),
              };
              const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${id}`, {
                method: 'DELETE',
                headers,
              });

              if (res.ok) {
                successCount++;
              } else {
                failCount++;
              }
            } catch (error) {
              failCount++;
            }
          }

          if (successCount > 0) {
            await loadWorkflows();
            setSelectedWorkflowIds(new Set());
            if (onToast) {
              onToast(
                `Successfully deleted ${successCount} workflow(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
                failCount > 0 ? 'error' : 'success'
              );
            }
          } else if (failCount > 0 && onToast) {
            onToast(`Failed to delete ${failCount} workflow(s)`, 'error');
          }
        } catch (error) {
          console.error('[WorkflowTemplatesModal] Delete error', error);
          if (onToast) {
            onToast('Error deleting workflows', 'error');
          }
        } finally {
          setProcessing(false);
        }
      },
    });
  };

  const handleArchive = async () => {
    if (selectedWorkflowIds.size === 0) return;

    setProcessing(true);
    const token = localStorage.getItem('token');
    let successCount = 0;
    let failCount = 0;

    try {
      for (const id of selectedWorkflowIds) {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...getTenantHeaders(),
          };
          const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${id}/unpublish`, {
            method: 'POST',
            headers,
          });

          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        await loadWorkflows();
        setSelectedWorkflowIds(new Set());
        if (onToast) {
          onToast(
            `Successfully archived ${successCount} workflow(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
            failCount > 0 ? 'error' : 'success'
          );
        }
      } else if (failCount > 0 && onToast) {
        onToast(`Failed to archive ${failCount} workflow(s)`, 'error');
      }
    } catch (error) {
      console.error('[WorkflowTemplatesModal] Archive error', error);
      if (onToast) {
        onToast('Error archiving workflows', 'error');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (selectedWorkflowIds.size === 0) return;

    setProcessing(true);
    const token = localStorage.getItem('token');
    let successCount = 0;
    let failCount = 0;

    try {
      for (const id of selectedWorkflowIds) {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...getTenantHeaders(),
          };
          const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${id}/publish`, {
            method: 'POST',
            headers,
          });

          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        await loadWorkflows();
        setSelectedWorkflowIds(new Set());
        if (onToast) {
          onToast(
            `Successfully published ${successCount} workflow(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
            failCount > 0 ? 'error' : 'success'
          );
        }
      } else if (failCount > 0 && onToast) {
        onToast(`Failed to publish ${failCount} workflow(s)`, 'error');
      }
    } catch (error) {
      console.error('[WorkflowTemplatesModal] Publish error', error);
      if (onToast) {
        onToast('Error publishing workflows', 'error');
      }
    } finally {
      setProcessing(false);
    }
  };

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const res = await tenantFetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows`);
      if (!res.ok) throw new Error(`Failed to fetch workflows (${res.status})`);
      const json = await res.json().catch(() => ({}));
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      
      // Fetch trigger information for each workflow
      const workflowsWithTriggers = await Promise.all(
        list.map(async (w: any) => {
          let triggerType: string | undefined;
          let triggerEntity: string | undefined;
          
          try {
            // Fetch workflow details to get nodes
            const workflowRes = await tenantFetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${w.id}`);
            if (workflowRes.ok) {
              const workflowJson = await workflowRes.json().catch(() => ({}));
              const nodes = Array.isArray(workflowJson?.data?.nodes) ? workflowJson.data.nodes : [];
              
              // Find trigger node
              const triggerNode = nodes.find((node: any) => node.type === 'trigger' || node.node_type === 'trigger');
              
              if (triggerNode) {
                // The API transforms nodes with parsed config spread into data object
                // So triggerType and sourceEntity should be directly in data
                const nodeData = triggerNode.data || triggerNode;
                
                // Check various possible locations for the trigger info
                triggerType = nodeData.triggerType || nodeData.trigger_type || nodeData.triggerType;
                triggerEntity = nodeData.sourceEntity || nodeData.source_entity || nodeData.entity;
                
                // If not found in data, try parsing config if it exists as string
                if (!triggerType && !triggerEntity && triggerNode.config) {
                  try {
                    const config = typeof triggerNode.config === 'string' 
                      ? JSON.parse(triggerNode.config) 
                      : triggerNode.config;
                    triggerType = config.triggerType || config.trigger_type;
                    triggerEntity = config.sourceEntity || config.source_entity || config.entity;
                  } catch {
                    // Config parsing failed, skip
                  }
                }
              }
            }
          } catch (error) {
            console.error(`[WorkflowTemplatesModal] Error fetching trigger for workflow ${w.id}:`, error);
          }
          
          return {
            id: w.id,
            name: String(w.name || `Workflow ${w.id}`),
            description: String(w.description || ''),
            status: (w.status as any) || 'draft',
            updated_at: w.updated_at || w.created_at || '',
            created_at: w.created_at || '',
            node_count: Number(w.node_count || w.nodes?.length || 0),
            triggerType,
            triggerEntity,
          };
        })
      );
      
      setWorkflows(workflowsWithTriggers);
    } catch (e) {
      console.error('[WorkflowTemplatesModal] Fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkflows = workflows.filter((workflow) =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#22c55e';
      case 'draft':
        return '#f59e0b';
      case 'archived':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const formatEntity = (entity: string) => {
    if (!entity) return entity;
    // Replace dots with spaces and capitalize each word
    return entity
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleCreate = () => {
    onClose();
    navigate('/workflow-v2');
  };

  if (!isOpen) return null;

  return (
    <div className="workflow-templates-modal-overlay" onClick={onClose}>
      <div className="workflow-templates-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="workflow-templates-modal-header">
          <div>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              color: colors.textPrimary, 
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              {t('Workflow Templates')}
            </h2>
            <p style={{ 
              fontSize: '0.875rem', 
              color: colors.textSecondary, 
              margin: '0.25rem 0 0 0' 
            }}>
              {isSelectionMode ? t('Select workflows to manage ({{count}} selected)', { count: selectedWorkflowIds.size }) : t('Select a workflow to load and edit')}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: colors.mutedBg,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.border;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.mutedBg;
            }}
          >
            <X size={18} style={{ color: colors.textSecondary }} />
          </button>
        </div>

        {/* Search and Select All (in selection mode) */}
        <div style={{ 
          padding: '0 24px 16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          
          <div style={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: 1
          }}>
            <Search 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                color: colors.textSecondary,
                pointerEvents: 'none'
              }} 
            />
            <input
              type="text"
              placeholder={t('Search workflows...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                fontSize: '0.875rem',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                backgroundColor: colors.card,
                color: colors.textPrimary,
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Workflows List */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '16px 24px'
        }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '3rem 0',
              color: colors.textSecondary,
              fontSize: '0.875rem'
            }}>
              {t('Loading workflows...')}
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '3rem 0',
              color: colors.textSecondary,
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              <FileText size={48} style={{ color: colors.border, marginBottom: '1rem' }} />
              <p style={{ margin: 0, fontWeight: '500', color: colors.textPrimary }}>
                {searchQuery ? t('No workflows found') : t('No workflows available')}
              </p>
              {searchQuery && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8125rem', color: colors.textSecondary }}>
                  {t('Try a different search term')}
                </p>
              )}
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '16px' 
            }}>
              {filteredWorkflows.map((workflow) => {
                const isCurrent = String(workflow.id) === String(currentWorkflowId);
                const isSelected = selectedWorkflowIds.has(workflow.id);
                return (
                  <div
                    key={workflow.id}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelection(workflow.id);
                      } else {
                        onSelectWorkflow(workflow.id);
                        onClose();
                      }
                    }}
                    style={{
                      backgroundColor: isSelected ? colors.mutedBg : isCurrent ? colors.mutedBg : colors.card,
                      border: `2px solid ${isSelected ? '#3b82f6' : isCurrent ? '#3b82f6' : colors.border}`,
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent && !isSelected) {
                        e.currentTarget.style.borderColor = colors.textSecondary;
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent && !isSelected) {
                        e.currentTarget.style.borderColor = colors.border;
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {(isSelectionMode || isCurrent) && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        {isCurrent && !isSelectionMode && (
                          <div style={{
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '4px 8px',
                            borderRadius: '4px',
                          }}>
                            {t('Current')}
                          </div>
                        )}
                        {isSelectionMode && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            <IOSCheckbox
                              checked={isSelected}
                              onChange={(checked) => {
                                toggleSelection(workflow.id);
                              }}
                              color="blue"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ 
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: colors.textPrimary,
                          margin: '0 0 4px 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {workflow.name}
                        </h3>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          backgroundColor: getStatusColor(workflow.status) + '20',
                          color: getStatusColor(workflow.status),
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          textTransform: 'capitalize',
                        }}>
                          {workflow.status}
                        </div>
                      </div>
                    </div>
                    {workflow.description && (
                      <p style={{ 
                        fontSize: '0.8125rem',
                        color: colors.textSecondary,
                        margin: '0 0 12px 0',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {workflow.description}
                      </p>
                    )}
                    {(workflow.triggerType || workflow.triggerEntity) && (
                      <div style={{ 
                        marginBottom: '12px',
                        padding: '8px 12px',
                        backgroundColor: colors.mutedBg,
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                      }}>
                        {workflow.triggerType && (
                          <div style={{ 
                            fontSize: '0.8125rem',
                            color: colors.textSecondary,
                            marginBottom: workflow.triggerEntity ? '4px' : '0',
                          }}>
                            <span style={{ fontWeight: '600', color: colors.textPrimary }}>{t('Type:')} </span>
                            <span style={{ textTransform: 'capitalize' }}>{workflow.triggerType}</span>
                          </div>
                        )}
                        {workflow.triggerEntity && (
                          <div style={{ 
                            fontSize: '0.8125rem',
                            color: colors.textSecondary,
                          }}>
                            <span style={{ fontWeight: '600', color: colors.textPrimary }}>{t('Entity:')} </span>
                            <span>{formatEntity(workflow.triggerEntity)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '16px',
                      fontSize: '0.75rem',
                      color: colors.textSecondary,
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: `1px solid ${colors.border}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={14} />
                        <span>{workflow.node_count || 0} {t('nodes')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        <span>{formatDate(workflow.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.card,
        }}>
          {canCreatePage("workflow-v2") && (
            <button
              onClick={handleCreate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#ffffff',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              <Plus size={14} />
              {t('Create')}
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedWorkflowIds(new Set());
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#475569',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            {isSelectionMode ? <PenOff size={14} /> : <Pen size={14} />}
            {isSelectionMode ? t('Cancel') : t('Edit')}
          </button>
          {isSelectionMode && selectedWorkflowIds.size > 0 && (
            <>
              <button
                onClick={handlePublish}
                disabled={processing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#475569',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!processing) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!processing) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }
                }}
              >
                <Upload size={14} />
                {t('Publish')}
              </button>
              <button
                onClick={handleArchive}
                disabled={processing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#475569',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!processing) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!processing) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }
                }}
              >
                <Archive size={14} />
                {t('Archive')}
              </button>
              <button
                onClick={handleDelete}
                disabled={processing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#dc2626',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!processing) {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!processing) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }
                }}
              >
                <Trash2 size={14} />
                {t('Delete')}
              </button>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
};

