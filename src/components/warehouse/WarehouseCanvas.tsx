import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AisleColumn, RackCell, RackStatus, ViewState } from './types';
import { CELL_SIZE, CELL_GAP, MAX_ZOOM, MIN_ZOOM } from './constants';
import { Tooltip } from './Tooltip';

interface WarehouseCanvasProps {
  data: AisleColumn[];
  onRackSelect: (rack: RackCell) => void;
  selectedRackId: string | null;
  colors: any;
}

export const WarehouseCanvas: React.FC<WarehouseCanvasProps> = ({ 
  data, 
  onRackSelect,
  selectedRackId,
  colors
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewState>({ scale: 0.8, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [hoveredRack, setHoveredRack] = useState<RackCell | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Reset view slightly when data changes (new warehouse loaded)
    setView(prev => ({ ...prev, x: 50, y: 50, scale: 0.6 }));
  }, [data]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - view.x) / view.scale;
    const worldY = (mouseY - view.y) / view.scale;

    const scaleAmount = -e.deltaY * 0.0015;
    const newScale = Math.min(Math.max(view.scale + scaleAmount, MIN_ZOOM), MAX_ZOOM);

    const newX = mouseX - worldX * newScale;
    const newY = mouseY - worldY * newScale;

    setView({ scale: newScale, x: newX, y: newY });
  }, [view]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPan({ x: e.clientX - view.x, y: e.clientY - view.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (isDragging) {
      e.preventDefault();
      setView(prev => ({
        ...prev,
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Detect light mode by checking if background is light
  const isLightMode = colors.background === '#ffffff' || colors.background === '#FFFFFF' || colors.background.toLowerCase() === '#ffffff';

  const getCellColor = (status: RackStatus, isSelected: boolean) => {
    if (isSelected) return 'bg-zinc-900 ring-2 ring-zinc-900 ring-offset-2 z-10';

    switch (status) {
      case RackStatus.CRITICAL: return 'bg-red-600 hover:bg-red-500 shadow-md shadow-red-900/20';
      case RackStatus.FULL: return 'bg-zinc-800 hover:bg-zinc-700';
      case RackStatus.PARTIAL: return 'bg-zinc-300 hover:bg-zinc-400';
      case RackStatus.EMPTY: return 'bg-zinc-100 hover:bg-zinc-200 text-zinc-300';
      default: return 'bg-gray-100';
    }
  };

  const getTextColor = (status: RackStatus, isSelected: boolean) => {
    if (isSelected) return 'text-white';

    if (status === RackStatus.CRITICAL || status === RackStatus.FULL) return 'text-white/90';
    if (status === RackStatus.PARTIAL) return 'text-zinc-600';
    return 'text-zinc-400';
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{ background: colors.card }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(${colors.textPrimary} 1px, transparent 1px)`,
          backgroundSize: `${20 * view.scale}px ${20 * view.scale}px`,
          backgroundPosition: `${view.x}px ${view.y}px`
        }}
      />

      <div 
        className="absolute top-0 left-0 transition-transform duration-[50ms] ease-out origin-top-left will-change-transform"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
        }}
      >
        {data.map((aisle) => (
          <div 
            key={aisle.id}
            className="absolute"
            style={{ 
              left: aisle.x, 
              top: aisle.y,
              // For vertical, we fix width (column). For horizontal, width is auto (flex-row).
              width: aisle.orientation === 'vertical' ? CELL_SIZE : undefined,
              height: aisle.orientation === 'horizontal' ? CELL_SIZE : undefined,
            }}
          >
            {/* Aisle Label */}
            {/* Logic: 
                - Vertical: Centered above the column 
                - Horizontal: Centered vertically to the LEFT of the row (no rotation needed for readability)
            */}
            <div 
              className={`absolute text-[10px] font-bold tracking-wider uppercase whitespace-nowrap
                ${aisle.orientation === 'vertical' 
                  ? '-top-5 left-1/2 -translate-x-1/2' 
                  : 'left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-3'
                }
              `}
              style={{ color: colors.textSecondary }}
            >
              {aisle.label}
            </div>

            {/* Cells Container */}
            <div className={`flex ${aisle.orientation === 'vertical' ? 'flex-col' : 'flex-row'}`} style={{ gap: CELL_GAP }}>
              {aisle.cells.map(cell => {
                const isSelected = selectedRackId === cell.id;
                const cellColorClasses = getCellColor(cell.status, isSelected);
                const textColorClasses = getTextColor(cell.status, isSelected);
                return (
                  <div 
                    key={cell.id}
                    onClick={(e) => {
                       e.stopPropagation();
                       onRackSelect(cell);
                    }}
                    onMouseEnter={() => setHoveredRack(cell)}
                    onMouseLeave={() => setHoveredRack(null)}
                    style={{ 
                      width: CELL_SIZE, 
                      height: CELL_SIZE,
                    }}
                    className={`rounded-[4px] flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${cellColorClasses} ${textColorClasses}`}
                  >
                    {cell.label}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Tooltip 
        x={mousePos.x} 
        y={mousePos.y} 
        visible={!!hoveredRack && !isDragging}
        content={hoveredRack ? `${hoveredRack.aisleId} • ${t("Unit")} ${hoveredRack.label}` : ''}
        colors={colors}
      />
      
      <div 
        className="absolute bottom-8 right-8 flex flex-col gap-2 backdrop-blur p-2 rounded-lg shadow-xl"
        style={{ 
          background: isLightMode ? '#ffffffE6' : `${colors.card}`,
          border: `1px solid ${colors.border}`
        }}
      >
        <button 
          className="w-8 h-8 flex items-center justify-center rounded font-bold transition-colors"
          style={{ 
            color: colors.textPrimary,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = isLightMode ? '#f4f4f5' : colors.mutedBg}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          onClick={() => setView(v => ({ ...v, scale: Math.min(v.scale + 0.2, MAX_ZOOM) }))}
        >+</button>
        <div 
          className="w-8 text-center text-[10px] font-mono py-1"
          style={{ color: colors.textSecondary }}
        >
          {Math.round(view.scale * 100)}%
        </div>
        <button 
          className="w-8 h-8 flex items-center justify-center rounded font-bold transition-colors"
          style={{ 
            color: colors.textPrimary,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = isLightMode ? '#f4f4f5' : colors.mutedBg}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          onClick={() => setView(v => ({ ...v, scale: Math.max(v.scale - 0.2, MIN_ZOOM) }))}
        >-</button>
      </div>
    </div>
  );
};