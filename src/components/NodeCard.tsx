import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User, Mail, Phone, X, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { OrgNode } from './types';

interface NodeCardProps {
  node: OrgNode;
  onAddChild: (parentId: string) => void;
  onUpdateNode: (node: OrgNode) => void;
  onDeleteNode: (nodeId: string) => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, onAddChild, onUpdateNode, onDeleteNode }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for editing form
  const [formData, setFormData] = useState({ ...node });

  const handleSave = () => {
    onUpdateNode(formData);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative group z-10 flex justify-center"
    >
      <div 
        className={`
          relative w-64 p-4 rounded-xl backdrop-blur-md border transition-all duration-300
          ${isEditing 
            ? 'bg-nebula-800 border-nebula-accent shadow-[0_0_30px_rgba(204,255,0,0.1)]' 
            : 'bg-nebula-800/60 border-nebula-border hover:border-nebula-accent/50 hover:bg-nebula-800/80 shadow-lg'
          }
        `}
      >
        {/* Header / Avatar Area */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center border border-white/10 shrink-0">
             <User className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            {isEditing ? (
              <input 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-black/30 border border-white/10 rounded px-1 text-sm text-white focus:outline-none focus:border-nebula-accent mb-1"
                placeholder="Name"
              />
            ) : (
              <h3 className="font-bold text-white truncate text-sm tracking-wide">{node.name}</h3>
            )}
            
            {isEditing ? (
              <input 
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full bg-black/30 border border-white/10 rounded px-1 text-xs text-nebula-accent focus:outline-none focus:border-nebula-accent"
                placeholder="Position"
              />
            ) : (
              <p className="text-xs text-nebula-accent truncate uppercase tracking-wider font-semibold">{node.position}</p>
            )}
          </div>
        </div>

        {/* Details Area */}
        <div className="space-y-2 mt-3 pt-3 border-t border-white/5">
           <div className="flex items-center space-x-2 text-xs text-gray-400">
             <Mail className="w-3 h-3 shrink-0" />
             {isEditing ? (
               <input 
                 name="email" 
                 value={formData.email} 
                 onChange={handleChange}
                 className="flex-1 bg-black/30 border border-white/10 rounded px-1 text-xs focus:outline-none focus:border-nebula-accent"
               />
             ) : (
               <span className="truncate">{node.email}</span>
             )}
           </div>
           <div className="flex items-center space-x-2 text-xs text-gray-400">
             <Phone className="w-3 h-3 shrink-0" />
             {isEditing ? (
                <input 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange}
                  className="flex-1 bg-black/30 border border-white/10 rounded px-1 text-xs focus:outline-none focus:border-nebula-accent"
                />
             ) : (
               <span className="truncate">{node.phone}</span>
             )}
           </div>
        </div>

        {/* Actions Overlay (Hover) */}
        {!isEditing && (
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    <Edit2 className="w-3 h-3" />
                </button>
                <button 
                    onClick={() => onDeleteNode(node.id)}
                    className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
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
                    className="flex-1 py-1 bg-nebula-accent text-black text-xs font-bold rounded hover:bg-white transition-colors"
                >
                    Save
                </button>
                <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-1 bg-white/5 text-white text-xs font-bold rounded hover:bg-white/10 transition-colors"
                >
                    Cancel
                </button>
            </div>
        )}

        {/* Add Child Button - Absolute positioned at bottom center */}
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={() => onAddChild(node.id)}
            className="w-6 h-6 rounded-full bg-nebula-700 border border-nebula-accent text-nebula-accent flex items-center justify-center hover:bg-nebula-accent hover:text-black hover:scale-110 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default NodeCard;