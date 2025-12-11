import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User, Mail, Phone, X, Edit2, ChevronDown, Check } from 'lucide-react';
import { OrgNode } from './types';
import { useTheme } from '../../../context/theme';
import { buildApiUrl } from '../../config/api';
import Toast from '../Toast';

interface NodeCardProps {
  node: OrgNode;
  onAddChild: (parentId: string) => void;
  onUpdateNode: (node: OrgNode) => void;
  onDeleteNode: (nodeId: string) => void;
}

interface User {
  id: number;
  name: string;
  email: string;
  login: string;
  phone?: string;
}

interface Position {
  id: number;
  name: string;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, onAddChild, onUpdateNode, onDeleteNode }) => {
  const { colors, mode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAddButtonHovered, setIsAddButtonHovered] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [savingPosition, setSavingPosition] = useState(false);
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null);

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state });
  };
  
  // Local state for editing form
  const [formData, setFormData] = useState({ ...node });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(node.user_id || null);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(node.position_id || null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [positionDropdownOpen, setPositionDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const positionDropdownRef = useRef<HTMLDivElement>(null);

  // Load users and positions when editing starts
  useEffect(() => {
    if (isEditing) {
      loadUsers();
      loadPositions();
    }
  }, [isEditing]);

  // Update selected IDs when node changes
  useEffect(() => {
    setSelectedUserId(node.user_id || null);
    setSelectedPositionId(node.position_id || null);
    setFormData({ ...node });
  }, [node.id, node.user_id, node.position_id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (positionDropdownRef.current && !positionDropdownRef.current.contains(event.target as Node)) {
        setPositionDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch(buildApiUrl('/v1/employees/users/list'));
      const result = await response.json();
      if (result.success) {
        setUsers(result.data || []);
        // Find current user by email or name
        if (formData.email) {
          const currentUser = result.data.find((u: User) => u.email === formData.email || u.name === formData.name);
          if (currentUser) {
            setSelectedUserId(currentUser.id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadPositions = async () => {
    try {
      setLoadingPositions(true);
      const response = await fetch(buildApiUrl('/v1/employees/positions/list'));
      const result = await response.json();
      if (result.success) {
        setPositions(result.data || []);
        // Find current position by name
        if (formData.position) {
          const currentPosition = result.data.find((p: Position) => p.name === formData.position);
          if (currentPosition) {
            setSelectedPositionId(currentPosition.id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoadingPositions(false);
    }
  };

  const handleSave = () => {
    const selectedUser = users.find(u => u.id === selectedUserId);
    const selectedPosition = positions.find(p => p.id === selectedPositionId);
    
    const updatedNode: OrgNode = {
      ...formData,
      name: selectedUser?.name || formData.name,
      email: selectedUser?.email || '',
      phone: selectedUser?.phone || formData.phone || '',
      position: selectedPosition?.name || formData.position,
      user_id: selectedUserId || undefined,
      position_id: selectedPositionId || undefined,
    };
    
    onUpdateNode(updatedNode);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddPosition = async () => {
    if (!newPositionName.trim()) {
      showToast('Please enter a position name', 'error');
      return;
    }

    try {
      setSavingPosition(true);
      const response = await fetch(buildApiUrl('/v1/employees/positions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newPositionName.trim() }),
      });

      const result = await response.json();
      if (result.success) {
        await loadPositions();
        setSelectedPositionId(result.data.id);
        setNewPositionName('');
        setShowAddPositionModal(false);
        showToast('Position created successfully', 'success');
      } else {
        showToast('Failed to create position: ' + (result.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error creating position:', error);
      showToast('Failed to create position', 'error');
    } finally {
      setSavingPosition(false);
    }
  };

  // Calculate background color based on theme and state
  const getBackgroundColor = () => {
    if (isEditing) {
      return colors.card;
    }
    if (isHovered) {
      return mode === 'dark' ? colors.mutedBg : colors.card;
    }
    return colors.card;
  };

  const selectedUser = users.find(u => u.id === selectedUserId);
  const selectedPosition = positions.find(p => p.id === selectedPositionId);

  return (
    <>
      <motion.div
        key={`${node.id}-${mode}`}
        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative group flex justify-center"
        style={{ zIndex: isEditing ? 1000 : 10 }}
      >
        <div 
          className="relative w-64 p-4 rounded-xl border transition-all duration-300 shadow-lg"
          style={{
            backgroundColor: getBackgroundColor(),
            borderColor: isEditing
              ? colors.action
              : isHovered
                ? `${colors.action}80`
                : colors.border,
            boxShadow: isEditing
              ? `0 0 30px ${colors.action}1A`
              : `0 4px 12px rgba(0, 0, 0, ${mode === 'dark' ? '0.3' : '0.1'})`
          }}
          onMouseEnter={() => {
            if (!isEditing) {
              setIsHovered(true);
            }
          }}
          onMouseLeave={() => {
            if (!isEditing) {
              setIsHovered(false);
            }
          }}
        >
          {/* Header / Avatar Area */}
          <div className="flex items-center space-x-3 mb-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0"
              style={{
                background: mode === 'dark'
                  ? `linear-gradient(135deg, ${colors.mutedBg}, ${colors.background})`
                  : `linear-gradient(135deg, ${colors.border}, ${colors.mutedBg})`,
                borderColor: colors.border
              }}
            >
               <User className="w-5 h-5" style={{ color: colors.textSecondary }} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              {isEditing ? (
                <div className="relative" ref={userDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="w-full rounded px-1 text-sm mb-1 focus:outline-none transition-colors text-left flex items-center justify-between"
                    style={{
                      backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : colors.mutedBg,
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                      padding: '4px 8px'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.action;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.border;
                    }}
                  >
                    <span className="truncate">
                      {selectedUser ? `${selectedUser.name} (${selectedUser.email})` : 'Select User'}
                    </span>
                    <ChevronDown className="w-3 h-3" style={{ color: colors.textSecondary }} />
                  </button>
                  {userDropdownOpen && (
                    <div
                      className="absolute w-full mt-1 rounded-lg shadow-lg"
                      style={{
                        background: colors.card,
                        border: `1px solid ${colors.border}`,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 9999
                      }}
                    >
                      {loadingUsers ? (
                        <div className="p-2 text-xs" style={{ color: colors.textSecondary }}>Loading...</div>
                      ) : (
                        users.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setUserDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left flex items-center justify-between text-xs"
                            style={{
                              color: colors.textPrimary,
                              background: selectedUserId === user.id ? `${colors.action}20` : 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              if (selectedUserId !== user.id) {
                                e.currentTarget.style.background = colors.mutedBg;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedUserId !== user.id) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            <span className="truncate">{user.name} ({user.email})</span>
                            {selectedUserId === user.id && <Check className="w-3 h-3" style={{ color: colors.action }} />}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <h3 
                  className="font-bold truncate text-sm tracking-wide"
                  style={{ color: colors.textPrimary }}
                >
                  {node.name}
                </h3>
              )}
              
              {isEditing ? (
                <div className="relative" ref={positionDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setPositionDropdownOpen(!positionDropdownOpen)}
                    className="w-full rounded px-1 text-xs focus:outline-none transition-colors text-left flex items-center justify-between"
                    style={{
                      backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : colors.mutedBg,
                      border: `1px solid ${colors.border}`,
                      color: colors.action,
                      padding: '4px 8px'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.action;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.border;
                    }}
                  >
                    <span className="truncate">
                      {selectedPosition ? selectedPosition.name : 'Select Position'}
                    </span>
                    <ChevronDown className="w-3 h-3" style={{ color: colors.textSecondary }} />
                  </button>
                  {positionDropdownOpen && (
                    <div
                      className="absolute w-full mt-1 rounded-lg shadow-lg"
                      style={{
                        background: colors.card,
                        border: `1px solid ${colors.border}`,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 9999
                      }}
                    >
                      {loadingPositions ? (
                        <div className="p-2 text-xs" style={{ color: colors.textSecondary }}>Loading...</div>
                      ) : (
                        <>
                          {positions.map((position) => (
                            <button
                              key={position.id}
                              type="button"
                              onClick={() => {
                                setSelectedPositionId(position.id);
                                setPositionDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left flex items-center justify-between text-xs"
                              style={{
                                color: colors.action,
                                background: selectedPositionId === position.id ? `${colors.action}20` : 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedPositionId !== position.id) {
                                  e.currentTarget.style.background = colors.mutedBg;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedPositionId !== position.id) {
                                  e.currentTarget.style.background = 'transparent';
                                }
                              }}
                            >
                              <span className="truncate">{position.name}</span>
                              {selectedPositionId === position.id && <Check className="w-3 h-3" style={{ color: colors.action }} />}
                            </button>
                          ))}
                          <div
                            className="border-t"
                            style={{ borderColor: colors.border }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPositionDropdownOpen(false);
                              setShowAddPositionModal(true);
                            }}
                            className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs"
                            style={{
                              color: colors.action,
                              background: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = colors.mutedBg;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Position</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p 
                  className="text-xs truncate uppercase tracking-wider font-semibold"
                  style={{ color: colors.action }}
                >
                  {node.position}
                </p>
              )}
            </div>
          </div>

          {/* Details Area */}
          <div 
            className="space-y-2 mt-3 pt-3 border-t"
            style={{ borderColor: colors.border }}
          >
           <div 
             className="flex items-center space-x-2 text-xs"
             style={{ color: colors.textSecondary }}
           >
             <Mail className="w-3 h-3 shrink-0" />
             <span className="truncate">
               {isEditing && selectedUser ? selectedUser.email : node.email}
             </span>
           </div>
           <div 
             className="flex items-center space-x-2 text-xs"
             style={{ color: colors.textSecondary }}
           >
             <Phone className="w-3 h-3 shrink-0" />
             <span className="truncate">
               {isEditing && selectedUser ? (selectedUser.phone || node.phone) : node.phone}
             </span>
           </div>
          </div>

        {/* Actions Overlay (Hover) */}
        {!isEditing && (
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-md transition-colors"
                    style={{
                      color: colors.textSecondary
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : colors.mutedBg;
                      e.currentTarget.style.color = colors.textPrimary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = colors.textSecondary;
                    }}
                >
                    <Edit2 className="w-3 h-3" />
                </button>
                <button 
                    onClick={() => onDeleteNode(node.id)}
                    className="p-1.5 rounded-md transition-colors"
                    style={{
                      color: colors.textSecondary
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${colors.cancel}33`;
                      e.currentTarget.style.color = colors.cancel;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = colors.textSecondary;
                    }}
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        )}

        {/* Editing Save/Cancel */}
        {isEditing && (
            <div className="mt-3 flex space-x-2">
                <button 
                    onClick={handleSave}
                    className="flex-1 py-1 text-xs font-bold rounded transition-colors"
                    style={{
                      backgroundColor: colors.action,
                      color: '#FFFFFF'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                >
                    Save
                </button>
                <button 
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({ ...node });
                      setSelectedUserId(null);
                      setSelectedPositionId(null);
                    }}
                    className="flex-1 py-1 text-xs font-bold rounded transition-colors"
                    style={{
                      backgroundColor: mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : colors.mutedBg,
                      color: colors.textPrimary
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : colors.border;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : colors.mutedBg;
                    }}
                >
                    Cancel
                </button>
            </div>
        )}

        {/* Add Child Button - Absolute positioned at bottom center */}
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={() => onAddChild(node.id)}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-lg"
            style={{
              backgroundColor: isAddButtonHovered ? colors.action : colors.card,
              border: `1px solid ${colors.action}`,
              color: isAddButtonHovered ? '#FFFFFF' : colors.action,
              transform: isAddButtonHovered ? 'scale(1.1)' : 'scale(1)'
            }}
            onMouseEnter={() => setIsAddButtonHovered(true)}
            onMouseLeave={() => setIsAddButtonHovered(false)}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>

    {/* Add Position Modal - Rendered via Portal */}
    {typeof window !== 'undefined' && createPortal(
      <AnimatePresence>
        {showAddPositionModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm p-4"
            style={{
              backgroundColor: mode === 'dark' 
                ? 'rgba(0, 0, 0, 0.8)' 
                : 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999
            }}
            onClick={() => setShowAddPositionModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                zIndex: 10000
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowAddPositionModal(false)}
                className="absolute top-4 right-4 transition-colors"
                style={{ color: colors.textSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.textSecondary;
                }}
              >
                <X className="w-5 h-5" />
              </button>

              <h3 
                className="text-xl font-bold mb-4"
                style={{ color: colors.textPrimary }}
              >
                Add New Position
              </h3>

              <input
                type="text"
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
                placeholder="Position name (e.g., Software Engineer)"
                className="w-full rounded-lg px-4 py-3 mb-4 focus:outline-none transition-colors"
                style={{
                  backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : colors.mutedBg,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.action;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddPosition();
                  }
                }}
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddPositionModal(false)}
                  className="flex-1 py-3 font-bold rounded-xl transition-colors"
                  style={{
                    backgroundColor: mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : colors.mutedBg,
                    color: colors.textPrimary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : colors.border;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : colors.mutedBg;
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddPosition}
                  disabled={savingPosition || !newPositionName.trim()}
                  className="flex-1 py-3 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: colors.action,
                    color: '#FFFFFF'
                  }}
                  onMouseEnter={(e) => {
                    if (!savingPosition && newPositionName.trim()) {
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {savingPosition ? 'Creating...' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}

    {/* Toast Notification */}
    {toast && (
      <Toast
        text={toast.text}
        state={toast.state}
        onClose={() => setToast(null)}
      />
    )}
    </>
  );
};

export default NodeCard;
