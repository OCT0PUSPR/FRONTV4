import React, { useState, useEffect } from 'react';
import { OrgNode } from './components/orgchart/types';
import OrgTree from './components/orgchart/OrgTree';
import { Sparkles, ZoomIn, ZoomOut, Maximize, Share2, Download, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/theme';
import { buildApiUrl, getTenantHeaders, tenantFetch } from './config/api';
import Toast from './components/Toast';

// Page styles will be generated dynamically based on theme

const OrgChartPage: React.FC = () => {
  const { colors, mode } = useTheme();
  const [data, setData] = useState<OrgNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Gemini Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ text: string; state: "success" | "error" } | null>(null);

  const showToast = (text: string, state: "success" | "error") => {
    setToast({ text, state });
  };

  // Load orgchart from backend
  useEffect(() => {
    loadOrgChart();
  }, []);

  const loadOrgChart = async () => {
    try {
      setLoading(true);
      const response = await tenantFetch(buildApiUrl('/v1/employees/orgchart'));
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        // If no data, create empty root
        setData({
          id: 'root-1',
          name: 'CEO',
          position: 'Chief Executive Officer',
          email: '',
          phone: '',
          children: []
        });
      }
    } catch (error) {
      console.error('Error loading orgchart:', error);
      // Fallback to empty root
      setData({
        id: 'root-1',
        name: 'CEO',
        position: 'Chief Executive Officer',
        email: '',
        phone: '',
        children: []
      });
    } finally {
      setLoading(false);
    }
  };

  const saveOrgChart = async () => {
    if (!data) return;
    
    try {
      setSaving(true);
      const response = await tenantFetch(buildApiUrl('/v1/employees/orgchart'), {
        method: 'POST',
        headers: getTenantHeaders(),
        body: JSON.stringify({ tree: data }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Reload to get updated IDs
        await loadOrgChart();
        showToast('Orgchart saved successfully!', 'success');
      } else {
        showToast('Failed to save orgchart: ' + (result.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error saving orgchart:', error);
      showToast('Failed to save orgchart', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Dynamic page styles based on theme
  const pageStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

    /* Custom scrollbar for premium feel */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: ${colors.background};
    }
    ::-webkit-scrollbar-thumb {
      background: ${mode === 'dark' ? colors.border : colors.textSecondary};
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: ${mode === 'dark' ? colors.textSecondary : colors.textPrimary};
    }
  `;

  // Helper to find and update a node in the tree
  const updateNodeInTree = (root: OrgNode, updatedNode: OrgNode): OrgNode => {
    if (root.id === updatedNode.id) return updatedNode;
    return {
      ...root,
      children: root.children.map(child => updateNodeInTree(child, updatedNode))
    };
  };

  // Helper to add a child
  const addChildToTree = (root: OrgNode, parentId: string): OrgNode => {
    if (root.id === parentId) {
      return {
        ...root,
        children: [
          ...root.children,
          {
            id: `node-${Date.now()}`,
            name: 'New Member',
            position: 'Position',
            email: 'email@nebula.io',
            phone: 'Phone',
            children: []
          }
        ]
      };
    }
    return {
      ...root,
      children: root.children.map(child => addChildToTree(child, parentId))
    };
  };

  // Helper to delete a node
  const deleteNodeFromTree = (root: OrgNode, nodeId: string): OrgNode => {
    // If we try to delete root, we just reset it or ignore (prevent deleting root for now)
    if (root.id === nodeId) return root; 
    
    return {
        ...root,
        children: root.children
            .filter(child => child.id !== nodeId)
            .map(child => deleteNodeFromTree(child, nodeId))
    };
  };

  const handleUpdateNode = (node: OrgNode) => {
    if (!data) return;
    setData(prev => prev ? updateNodeInTree(prev, node) : null);
  };

  const handleAddChild = (parentId: string) => {
    if (!data) return;
    setData(prev => prev ? addChildToTree(prev, parentId) : null);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!data) return;
    if (nodeId === data.id) {
        // Reset root node user and position instead of deleting
        const resetNode: OrgNode = {
          ...data,
          name: 'CEO',
          position: 'Chief Executive Officer',
          email: '',
          phone: '',
          user_id: undefined,
          position_id: undefined
        };
        setData(resetNode);
        showToast("Root node user and position reset.", 'success');
        return;
    }
    setData(prev => prev ? deleteNodeFromTree(prev, nodeId) : null);
  };

  // Zoom / Pan Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      setZoom(prev => Math.min(Math.max(0.2, prev + delta), 2));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  

  const gridColor = mode === 'dark' 
    ? 'rgba(255,255,255,0.15)' 
    : 'rgba(0,0,0,0.1)';

  return (
    <div 
      className="h-full w-full overflow-hidden relative font-sans"
      style={{ 
        fontFamily: "'Space Grotesk', sans-serif",
        backgroundColor: colors.background,
        color: colors.textPrimary
      }}
    >
      <style>{pageStyles}</style>
      
      {/* Background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, ${gridColor} 1px, transparent 0)`,
          backgroundSize: '40px 40px' 
        }}
      >
      </div>

      {/* UI Controls Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <h1 
            className="text-3xl font-bold tracking-tighter mb-1"
            style={{ color: colors.textPrimary }}
          >
            ORGANIZATION ARCHITECT <span style={{ color: colors.action }}>.</span>
          </h1>
          <p 
            className="text-sm font-mono"
            style={{ color: colors.textSecondary }}
          >
            
          </p>
        </div>

        <div className="flex gap-3 pointer-events-auto">
           <button 
             onClick={saveOrgChart}
             disabled={saving || !data}
             className="flex items-center gap-2 px-4 py-2 font-bold rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
             style={{
               background: colors.action,
               color: '#FFFFFF'
             }}
             onMouseEnter={(e) => {
               if (!saving && data) {
                 e.currentTarget.style.boxShadow = `0 0 20px ${colors.action}40`;
               }
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.boxShadow = 'none';
             }}
           >
             <Save className="w-4 h-4" />
             {saving ? 'Saving...' : 'Save Chart'}
           </button>
           <button 
             onClick={() => setShowAiModal(true)}
             className="flex items-center gap-2 px-4 py-2 font-bold rounded-full transition-all transform hover:scale-105"
             style={{
               background: `linear-gradient(to right, ${colors.action}, ${colors.tableDoneText})`,
               color: '#FFFFFF'
             }}
             onMouseEnter={(e) => {
               e.currentTarget.style.boxShadow = `0 0 20px ${colors.action}40`;
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.boxShadow = 'none';
             }}
           >
             <Sparkles className="w-4 h-4" />
             AI Generate
           </button>
           <button 
             className="p-2 backdrop-blur rounded-full transition-all"
             style={{
               backgroundColor: mode === 'dark' 
                 ? `${colors.card}80` 
                 : `${colors.mutedBg}80`,
               border: `1px solid ${colors.border}`,
               color: colors.textPrimary
             }}
             onMouseEnter={(e) => {
               e.currentTarget.style.backgroundColor = mode === 'dark'
                 ? `${colors.card}`
                 : colors.border;
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.backgroundColor = mode === 'dark'
                 ? `${colors.card}80`
                 : `${colors.mutedBg}80`;
             }}
           >
             <Share2 className="w-5 h-5" />
           </button>
           <button 
             className="p-2 backdrop-blur rounded-full transition-all"
             style={{
               backgroundColor: mode === 'dark' 
                 ? `${colors.card}80` 
                 : `${colors.mutedBg}80`,
               border: `1px solid ${colors.border}`,
               color: colors.textPrimary
             }}
             onMouseEnter={(e) => {
               e.currentTarget.style.backgroundColor = mode === 'dark'
                 ? `${colors.card}`
                 : colors.border;
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.backgroundColor = mode === 'dark'
                 ? `${colors.card}80`
                 : `${colors.mutedBg}80`;
             }}
           >
             <Download className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-auto">
        <button 
          onClick={() => setZoom(z => Math.min(z + 0.1, 2))} 
          className="p-3 rounded-lg transition-colors"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.action;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border;
          }}
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} 
          className="p-3 rounded-lg transition-colors"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.action;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border;
          }}
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button 
          onClick={() => { setZoom(1); setPosition({x:0, y:0}); }} 
          className="p-3 rounded-lg transition-colors"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.action;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border;
          }}
        >
          <Maximize className="w-5 h-5" />
        </button>
      </div>

      {/* Canvas Area */}
      <div 
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="w-full h-full flex items-center justify-center transition-transform duration-75 origin-center"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})` 
          }}
        >
          {loading ? (
            <div style={{ color: colors.textSecondary }}>Loading orgchart...</div>
          ) : data ? (
            <OrgTree 
              data={data} 
              onAddChild={handleAddChild}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
            />
          ) : (
            <div style={{ color: colors.textSecondary }}>No orgchart data</div>
          )}
        </div>
            </div>

      {/* AI Modal */}
      <AnimatePresence>
        {showAiModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4"
            style={{
              backgroundColor: mode === 'dark' 
                ? 'rgba(0, 0, 0, 0.8)' 
                : 'rgba(0, 0, 0, 0.5)'
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="rounded-2xl p-8 w-full max-w-lg shadow-2xl relative"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`
              }}
            >
              <button 
                onClick={() => setShowAiModal(false)}
                className="absolute top-4 right-4 transition-colors"
                style={{ color: colors.textSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.textSecondary;
                }}
              >
                <Maximize className="w-5 h-5 rotate-45" />
              </button>

              <div className="mb-6">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: mode === 'dark'
                      ? `${colors.action}20`
                      : `${colors.action}10`
                  }}
                >
                  <Sparkles className="w-6 h-6" style={{ color: colors.action }} />
                </div>
                <h2 
                  className="text-2xl font-bold mb-2"
                  style={{ color: colors.textPrimary }}
                >
                  Generate with AI
                </h2>
                <p style={{ color: colors.textSecondary }}>
                  Describe your organization structure, and let our AI architect build the hierarchy for you.
                </p>
              </div>

              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. A tech startup with a CEO, a CTO leading 3 devs, and a CMO leading a marketing team of 2..."
                className="w-full h-32 rounded-xl p-4 mb-6 resize-none focus:outline-none transition-colors"
                style={{
                  backgroundColor: mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.4)'
                    : colors.mutedBg,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.action;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                }}
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAiModal(false)}
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      {toast && (
        <Toast
          text={toast.text}
          state={toast.state}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default OrgChartPage;