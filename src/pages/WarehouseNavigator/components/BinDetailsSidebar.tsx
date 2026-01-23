// Bin Details Sidebar - Right panel showing products in selected bin

import { useEffect } from 'react';
import { X, Package, Hash, Ruler, MapPin, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';
import { StockItem, LocationNode } from '../types';
import { findNodeById } from '../utils/hierarchyBuilder';

interface BinDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: number | null;
  locations: LocationNode[];
  stockItems: StockItem[];
  isLoading: boolean;
}

export function BinDetailsSidebar({
  isOpen,
  onClose,
  locationId,
  locations,
  stockItems,
  isLoading,
}: BinDetailsSidebarProps) {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  // Find location node
  const location = locationId ? findNodeById(locations, locationId) : null;

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Parse location path for display
  const locationPath = location?.completeName.split('/') || [];
  const warehouseCode = locationPath[0] || '';
  const rowCode = locationPath[2] || '';
  const bayCode = locationPath[3] || '';
  const levelCode = locationPath[4] || '';
  const binCode = locationPath[5] || '';

  return (
    <div
      className={`
        fixed top-0 right-0 h-full z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
      style={{
        width: '360px',
        backgroundColor: colors.card,
        borderLeft: `1px solid ${colors.border}`,
        boxShadow: isOpen ? '-4px 0 20px rgba(0,0,0,0.15)' : 'none',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: colors.border }}
      >
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: isDark ? 'rgba(224, 112, 32, 0.2)' : '#fff3e8' }}
          >
            <Package className="h-5 w-5" style={{ color: '#e07020' }} />
          </div>
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: colors.textPrimary }}
            >
              {t('warehouse_navigator.bin_contents', 'Bin Contents')}
            </h2>
            {location && (
              <p className="text-xs" style={{ color: colors.textSecondary }}>
                {location.name}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
          style={{ color: colors.textSecondary }}
          aria-label={t('warehouse_navigator.close', 'Close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Location Info */}
      {location && (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4" style={{ color: colors.textSecondary }} />
            <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              {t('warehouse_navigator.location_path', 'Location Path')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {warehouseCode && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: isDark ? 'rgba(100,150,200,0.2)' : '#e8f4fc',
                  color: isDark ? '#8ab4d4' : '#2a5a8a',
                }}
              >
                {warehouseCode}
              </span>
            )}
            {rowCode && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: isDark ? 'rgba(100,180,100,0.2)' : '#e8fce8',
                  color: isDark ? '#8ad48a' : '#2a8a2a',
                }}
              >
                Row {rowCode}
              </span>
            )}
            {bayCode && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: isDark ? 'rgba(200,150,100,0.2)' : '#fcf4e8',
                  color: isDark ? '#d4a478' : '#8a5a2a',
                }}
              >
                Rack {bayCode}
              </span>
            )}
            {levelCode && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: isDark ? 'rgba(150,100,200,0.2)' : '#f4e8fc',
                  color: isDark ? '#b48ad4' : '#5a2a8a',
                }}
              >
                Level {levelCode}
              </span>
            )}
            {binCode && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: isDark ? 'rgba(224, 112, 32, 0.2)' : '#fff3e8',
                  color: '#e07020',
                }}
              >
                Bin {binCode}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stock Summary */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: colors.border }}
      >
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" style={{ color: colors.textSecondary }} />
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            {stockItems.length} {t('warehouse_navigator.products', 'products')}
          </span>
        </div>
        <span className="text-sm font-semibold" style={{ color: '#e07020' }}>
          {Math.round(stockItems.reduce((sum, item) => sum + item.quantity, 0) * 100) / 100} {t('warehouse_navigator.total', 'total')}
        </span>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100% - 200px)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : stockItems.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center px-4"
            style={{ color: colors.textSecondary }}
          >
            <div
              className="p-4 rounded-full mb-4"
              style={{ backgroundColor: isDark ? 'rgba(100,100,100,0.2)' : 'rgba(0,0,0,0.05)' }}
            >
              <Package className="h-10 w-10 opacity-40" />
            </div>
            <p className="text-sm font-medium">
              {t('warehouse_navigator.empty_bin', 'This bin is empty')}
            </p>
            <p className="text-xs mt-1 opacity-70">
              {t('warehouse_navigator.no_products', 'No products stored in this location')}
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {stockItems.map((item, index) => (
              <div
                key={`${item.productId}-${item.lotId || index}`}
                className="flex items-start gap-3 p-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${colors.border}`,
                }}
              >
                {/* Product icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: isDark ? 'rgba(224, 112, 32, 0.15)' : '#fff3e8',
                  }}
                >
                  <Package className="h-5 w-5" style={{ color: '#e07020' }} />
                </div>

                {/* Product details */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium leading-tight"
                    style={{ color: colors.textPrimary }}
                  >
                    {item.productName}
                  </p>

                  {item.lotName && (
                    <p
                      className="text-xs flex items-center gap-1 mt-1"
                      style={{ color: colors.textSecondary }}
                    >
                      <Hash className="h-3 w-3" />
                      Lot: {item.lotName}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="text-lg font-bold"
                      style={{ color: '#e07020' }}
                    >
                      {Math.round(item.quantity * 100) / 100}
                    </span>
                    <span
                      className="text-xs flex items-center gap-0.5"
                      style={{ color: colors.textSecondary }}
                    >
                      <Ruler className="h-3 w-3" />
                      {item.uomName}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
