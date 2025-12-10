import React, { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import useStore from '../../store/workflowStore';
import { useTheme } from '../../context/theme';
import { Trash2, ArrowRight, ArrowLeft, Minus } from 'lucide-react';
import type { Edge, MarkerType } from 'reactflow';

const EDGE_COLORS = ['#6b7280', '#f97316', '#ef4444', '#14b8a6', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6'];

const EdgeSettingsPanel: React.FC = () => {
  const { selectedEdge, updateEdgeData, deleteEdge } = useStore();
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const [edgeData, setEdgeData] = useState<Edge | null>(null);

  useEffect(() => {
    if (selectedEdge) {
      setEdgeData(selectedEdge);
    } else {
      setEdgeData(null);
    }
  }, [selectedEdge]);

  if (!selectedEdge || !edgeData) {
    return null;
  }

  const handleLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setEdgeData({ ...edgeData, label: newLabel });
    updateEdgeData(selectedEdge.id, { label: newLabel });
  };

  const handleAnimationToggle = () => {
    const newAnimated = !edgeData.animated;
    setEdgeData({ ...edgeData, animated: newAnimated });
    updateEdgeData(selectedEdge.id, { animated: newAnimated });
  };

  const handleDirectionChange = (direction: 'forward' | 'reverse') => {
    if (direction === 'reverse') {
      const newEdge = {
        ...edgeData,
        source: edgeData.target,
        target: edgeData.source,
        sourceHandle: edgeData.targetHandle,
        targetHandle: edgeData.sourceHandle,
      };
      setEdgeData(newEdge);
      updateEdgeData(selectedEdge.id, newEdge);
    }
  };

  const handleStartMarkerChange = (hasArrow: boolean) => {
    const markerStart = hasArrow ? { type: 'arrow' as MarkerType, color: edgeData.style?.stroke || '#6b7280' } : undefined;
    setEdgeData({ ...edgeData, markerStart });
    updateEdgeData(selectedEdge.id, { markerStart });
  };

  const handleEndMarkerChange = (hasArrow: boolean) => {
    const markerEnd = hasArrow ? { type: 'arrowclosed' as MarkerType, color: edgeData.style?.stroke || '#6b7280' } : undefined;
    setEdgeData({ ...edgeData, markerEnd });
    updateEdgeData(selectedEdge.id, { markerEnd });
  };

  const handleLineStyleChange = (type: 'default' | 'step' | 'smoothstep' | 'straight') => {
    setEdgeData({ ...edgeData, type });
    updateEdgeData(selectedEdge.id, { type });
  };

  const handleStrokeWidthChange = (e: ChangeEvent<HTMLInputElement>) => {
    const strokeWidth = parseInt(e.target.value);
    const newStyle = { ...(edgeData.style || {}), strokeWidth };
    setEdgeData({ ...edgeData, style: newStyle });
    updateEdgeData(selectedEdge.id, { style: newStyle });
  };

  const handleColorChange = (color: string) => {
    const newStyle = { ...(edgeData.style || {}), stroke: color };
    setEdgeData({ ...edgeData, style: newStyle });
    updateEdgeData(selectedEdge.id, { style: newStyle });
  };

  const handleDelete = () => {
    deleteEdge(selectedEdge.id);
  };

  const currentStrokeWidth = (edgeData.style as any)?.strokeWidth || 2;
  const currentColor = (edgeData.style as any)?.stroke || '#6b7280';

  return (
    <div 
      className="absolute top-24 right-4 z-10 w-80 rounded-lg shadow-xl p-4 max-h-[calc(100vh-140px)] overflow-y-auto pointer-events-auto"
      style={{ backgroundColor: colors.card }}
    >
      <div 
        className="sticky top-0 pb-3 border-b mb-3"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>Connection Settings</h3>
      </div>

      <div className="space-y-3">
        {/* Label */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>Label</label>
          <input
            type="text"
            value={(edgeData.label as string) || ''}
            onChange={handleLabelChange}
            className="w-full border rounded-md shadow-sm p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ 
              backgroundColor: colors.mutedBg || (isDark ? '#18181b' : '#ffffff'),
              borderColor: colors.border,
              color: colors.textPrimary
            }}
            placeholder="Enter label"
          />
        </div>

        {/* Animation */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>Animation</label>
          <button
            onClick={handleAnimationToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              edgeData.animated ? 'bg-blue-500' : (isDark ? 'bg-zinc-700' : 'bg-gray-300')
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                edgeData.animated ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Direction */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>Direction</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleDirectionChange('reverse')}
              className="flex-1 p-2 border rounded-md transition"
              style={{ 
                borderColor: colors.border,
                color: colors.textPrimary,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Reverse direction"
            >
              <ArrowLeft className="h-4 w-4 mx-auto" />
            </button>
            <button
              onClick={() => handleDirectionChange('forward')}
              className="flex-1 p-2 border rounded-md transition"
              style={{ 
                borderColor: colors.border,
                color: colors.textPrimary,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Forward direction"
            >
              <ArrowRight className="h-4 w-4 mx-auto" />
            </button>
          </div>
        </div>

        {/* Start Marker */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>Start Marker</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleStartMarkerChange(false)}
              className={`flex-1 p-2 border rounded-md transition ${
                !edgeData.markerStart 
                  ? (isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-gray-100 border-gray-400')
                  : (isDark ? 'border-zinc-700 hover:bg-zinc-800/50' : 'border-gray-300 hover:bg-gray-50')
              }`}
              style={{ color: colors.textPrimary }}
              title="No arrow"
            >
              <Minus className="h-4 w-4 mx-auto" />
            </button>
            <button
              onClick={() => handleStartMarkerChange(true)}
              className={`flex-1 p-2 border rounded-md transition ${
                edgeData.markerStart 
                  ? (isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-gray-100 border-gray-400')
                  : (isDark ? 'border-zinc-700 hover:bg-zinc-800/50' : 'border-gray-300 hover:bg-gray-50')
              }`}
              style={{ color: colors.textPrimary }}
              title="Arrow start"
            >
              <ArrowLeft className="h-4 w-4 mx-auto" />
            </button>
          </div>
        </div>

        {/* End Marker */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>End Marker</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleEndMarkerChange(false)}
              className={`flex-1 p-2 border rounded-md transition ${
                !edgeData.markerEnd 
                  ? (isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-gray-100 border-gray-400')
                  : (isDark ? 'border-zinc-700 hover:bg-zinc-800/50' : 'border-gray-300 hover:bg-gray-50')
              }`}
              style={{ color: colors.textPrimary }}
              title="No arrow"
            >
              <Minus className="h-4 w-4 mx-auto" />
            </button>
            <button
              onClick={() => handleEndMarkerChange(true)}
              className={`flex-1 p-2 border rounded-md transition ${
                edgeData.markerEnd 
                  ? (isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-gray-100 border-gray-400')
                  : (isDark ? 'border-zinc-700 hover:bg-zinc-800/50' : 'border-gray-300 hover:bg-gray-50')
              }`}
              style={{ color: colors.textPrimary }}
              title="Arrow end"
            >
              <ArrowRight className="h-4 w-4 mx-auto" />
            </button>
          </div>
        </div>

        {/* Line Style */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>Line Style</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleLineStyleChange('default')}
              className={`p-2 border rounded-md transition ${
                (edgeData.type === 'default' || !edgeData.type) 
                  ? (isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-gray-100 border-gray-400')
                  : (isDark ? 'border-zinc-700 hover:bg-zinc-800/50' : 'border-gray-300 hover:bg-gray-50')
              }`}
              style={{ color: colors.textPrimary }}
              title="Bezier curve"
            >
              <svg className="w-full h-5" viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M 2 12 Q 15 2, 30 12 T 58 12" />
              </svg>
            </button>
            <button
              onClick={() => handleLineStyleChange('step')}
              className={`p-2 border rounded-md transition ${
                edgeData.type === 'step' 
                  ? (isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-gray-100 border-gray-400')
                  : (isDark ? 'border-zinc-700 hover:bg-zinc-800/50' : 'border-gray-300 hover:bg-gray-50')
              }`}
              style={{ color: colors.textPrimary }}
              title="Step line"
            >
              <svg className="w-full h-5" viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M 2 12 L 20 12 L 20 6 L 40 6 L 40 12 L 58 12" />
              </svg>
            </button>
            <button
              onClick={() => handleLineStyleChange('straight')}
              className={`p-2 border rounded-md transition ${
                edgeData.type === 'straight' 
                  ? (isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-gray-100 border-gray-400')
                  : (isDark ? 'border-zinc-700 hover:bg-zinc-800/50' : 'border-gray-300 hover:bg-gray-50')
              }`}
              style={{ color: colors.textPrimary }}
              title="Straight line"
            >
              <svg className="w-full h-5" viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="2" y1="12" x2="58" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stroke Width */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>Stroke Width</label>
          <input
            type="range"
            min="1"
            max="10"
            value={currentStrokeWidth}
            onChange={handleStrokeWidthChange}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500"
            style={{ backgroundColor: isDark ? '#3f3f46' : '#e5e7eb' }}
          />
          <div className="text-xs text-center mt-1" style={{ color: colors.textSecondary }}>{currentStrokeWidth}px</div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>Color</label>
          <div className="flex gap-2 flex-wrap">
            {EDGE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${
                  currentColor === color 
                    ? (isDark ? 'border-zinc-300 ring-2 ring-blue-400' : 'border-gray-800 ring-2 ring-blue-400')
                    : (isDark ? 'border-zinc-700' : 'border-gray-300')
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className={`w-full mt-4 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium ${
            isDark 
              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
              : 'bg-red-50 text-red-600 hover:bg-red-100'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Delete Connection
        </button>
      </div>
    </div>
  );
};

export default EdgeSettingsPanel;