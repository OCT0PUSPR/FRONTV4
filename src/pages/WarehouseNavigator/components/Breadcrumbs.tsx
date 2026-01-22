// Breadcrumbs Component - Navigation path display

import { useMemo } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';
import { LocationNode } from '../types';
import { findNodeById, getAncestorIds } from '../utils/hierarchyBuilder';

interface BreadcrumbsProps {
  locations: LocationNode[];
  selectedLocationId: number | null;
  warehouseName?: string;
  onNavigate: (id: number | null) => void;
}

interface BreadcrumbItem {
  id: number | null;
  name: string;
  isLast: boolean;
}

export function Breadcrumbs({
  locations,
  selectedLocationId,
  warehouseName,
  onNavigate,
}: BreadcrumbsProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const isRTL = i18n.dir() === 'rtl';

  // Build breadcrumb path
  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      {
        id: null,
        name: warehouseName || t('warehouse_navigator.warehouse', 'Warehouse'),
        isLast: selectedLocationId === null,
      },
    ];

    if (selectedLocationId !== null) {
      // Get ancestor IDs
      const ancestorIds = getAncestorIds(locations, selectedLocationId);

      if (ancestorIds) {
        // Add each ancestor
        ancestorIds.forEach(id => {
          const node = findNodeById(locations, id);
          if (node) {
            items.push({
              id: node.id,
              name: node.name,
              isLast: false,
            });
          }
        });
      }

      // Add the selected node
      const selectedNode = findNodeById(locations, selectedLocationId);
      if (selectedNode) {
        items.push({
          id: selectedNode.id,
          name: selectedNode.name,
          isLast: true,
        });
      }
    }

    return items;
  }, [locations, selectedLocationId, warehouseName, t]);

  return (
    <nav
      className="flex items-center gap-1 px-3 py-2 text-sm overflow-x-auto"
      aria-label={t('warehouse_navigator.breadcrumbs', 'Breadcrumbs')}
    >
      {breadcrumbs.map((item, index) => (
        <div key={item.id ?? 'root'} className="flex items-center gap-1 flex-shrink-0">
          {/* Separator */}
          {index > 0 && (
            <ChevronRight
              className={`h-4 w-4 flex-shrink-0 ${isRTL ? 'rotate-180' : ''}`}
              style={{ color: colors.textSecondary }}
            />
          )}

          {/* Breadcrumb item */}
          {item.isLast ? (
            <span
              className="font-medium px-1"
              style={{ color: colors.textPrimary }}
            >
              {index === 0 && (
                <Home
                  className="h-4 w-4 inline-block mr-1 -mt-0.5"
                  style={{ color: '#e07020' }}
                />
              )}
              {item.name}
            </span>
          ) : (
            <button
              onClick={() => onNavigate(item.id)}
              className="
                px-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800
                transition-colors
              "
              style={{ color: colors.textSecondary }}
            >
              {index === 0 && (
                <Home className="h-4 w-4 inline-block mr-1 -mt-0.5" />
              )}
              {item.name}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}
