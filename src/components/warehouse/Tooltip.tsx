import React from 'react';

interface TooltipProps {
  x: number;
  y: number;
  content: string;
  visible: boolean;
  colors?: any;
}

export const Tooltip: React.FC<TooltipProps> = ({ x, y, content, visible, colors }) => {
  if (!visible) return null;

  return (
    <div 
      className="pointer-events-none fixed z-50 px-3 py-1.5 text-xs font-medium rounded-md shadow-xl backdrop-blur-sm"
      style={{ 
        left: x + 16, 
        top: y + 16,
        transform: 'translate(0, 0)',
        background: colors?.textPrimary || '#18181b',
        color: colors?.background || '#ffffff',
        border: `1px solid ${colors?.border || '#27272a'}`
      }}
    >
      {content}
    </div>
  );
};