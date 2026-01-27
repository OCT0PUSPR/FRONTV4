// Location Tree Component - Hierarchical tree view of locations

import { useCallback, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Package, Layers, Grid3X3, Box, Truck, AlertTriangle, CheckCircle, PackageOpen, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';
import { LocationNode, LocationType } from '../types';

interface LocationTreeProps {
  locations: LocationNode[];
  selectedId: number | null;
  expandedNodes: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onDoubleClick?: (id: number) => void;
}

// Icon for each location type
function LocationIcon({ type, hasStock, zoneType }: { type: LocationType; hasStock: boolean; zoneType?: string }) {
  const iconClass = `h-4 w-4 ${hasStock ? 'text-blue-500' : 'text-gray-400 dark:text-zinc-500'}`;

  // Zone-specific icons
  if (type === 'zone' && zoneType) {
    switch (zoneType) {
      case 'dock':
        return <Truck className={`h-4 w-4 text-blue-500`} />;
      case 'staging':
        return <PackageOpen className={`h-4 w-4 text-yellow-500`} />;
      case 'scrap':
        return <AlertTriangle className={`h-4 w-4 text-red-500`} />;
      case 'qc':
        return <CheckCircle className={`h-4 w-4 text-green-500`} />;
      case 'packing':
        return <Package className={`h-4 w-4 text-purple-500`} />;
      case 'floor':
        return <Square className={`h-4 w-4 text-gray-500`} />;
    }
  }

  switch (type) {
    case 'row':
      return <Layers className={iconClass} />;
    case 'bay':
      return <Grid3X3 className={iconClass} />;
    case 'level':
      return <Layers className={iconClass} />;
    case 'bin':
      return hasStock ? <Package className={iconClass} /> : <Box className={iconClass} />;
    case 'zone':
      return <Square className={`h-4 w-4 text-gray-500`} />;
    default:
      return <Box className={iconClass} />;
  }
}

interface TreeNodeProps {
  node: LocationNode;
  selectedId: number | null;
  expandedNodes: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onDoubleClick?: (id: number) => void;
  depth: number;
}

function TreeNode({
  node,
  selectedId,
  expandedNodes,
  onSelect,
  onToggle,
  onDoubleClick,
  depth,
}: TreeNodeProps) {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const [isHovered, setIsHovered] = useState(false);

  const isSelected = node.id === selectedId;
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  }, [node.id, onSelect]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.(node.id);
  }, [node.id, onDoubleClick]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
  }, [node.id, onToggle]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSelect(node.id);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (hasChildren) {
        onToggle(node.id);
      }
    }
  }, [node.id, hasChildren, onSelect, onToggle]);

  // Format the summary text
  const summaryText = useMemo(() => {
    if (node.itemCount === 0) return '';
    const items = t('warehouse_navigator.items', '{{count}} items', { count: node.itemCount });
    const qty = t('warehouse_navigator.total_qty', '{{qty}} qty', { qty: Math.round(node.totalQty) });
    return `${items} | ${qty}`;
  }, [node.itemCount, node.totalQty, t]);

  // Get background color based on state
  const getBackgroundColor = () => {
    if (isSelected) {
      return isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe'; // blue-900/20 or blue-100
    }
    if (isHovered) {
      return isDark ? '#27272a' : '#f3f4f6'; // zinc-800 or gray-100
    }
    return 'transparent';
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors duration-100"
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          backgroundColor: getBackgroundColor(),
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        tabIndex={0}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
      >
        {/* Expand/Collapse toggle */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-zinc-700"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
            )}
          </button>
        ) : (
          <span className="w-4" /> // Spacer for alignment
        )}

        {/* Icon */}
        <LocationIcon type={node.type} hasStock={node.hasStock} zoneType={node.zoneType} />

        {/* Name */}
        <span
          className={`
            flex-1 text-sm truncate
            ${isSelected ? 'font-medium text-blue-700 dark:text-blue-400' : ''}
          `}
          style={{ color: isSelected ? undefined : colors.textPrimary }}
        >
          {node.name}
        </span>

        {/* Stock indicator */}
        {node.hasStock && (
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        )}
      </div>

      {/* Summary line */}
      {summaryText && isExpanded && (
        <div
          className="text-xs pl-10 pb-1"
          style={{
            paddingLeft: `${depth * 16 + 32}px`,
            color: colors.textSecondary,
          }}
        >
          {summaryText}
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              expandedNodes={expandedNodes}
              onSelect={onSelect}
              onToggle={onToggle}
              onDoubleClick={onDoubleClick}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LocationTree({
  locations,
  selectedId,
  expandedNodes,
  onSelect,
  onToggle,
  onDoubleClick,
}: LocationTreeProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (locations.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-8 text-center"
        style={{ color: colors.textSecondary }}
      >
        <Box className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">{t('warehouse_navigator.no_results', 'No locations found')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5" role="tree" aria-label="Location tree">
      {locations.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          expandedNodes={expandedNodes}
          onSelect={onSelect}
          onToggle={onToggle}
          onDoubleClick={onDoubleClick}
          depth={0}
        />
      ))}
    </div>
  );
}
