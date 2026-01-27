// Bin Modal Component - Stock detail view for selected bin

import { useEffect, useCallback } from 'react';
import { X, Package, Hash, Ruler } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';
import { StockItem, LocationNode } from '../types';
import { findNodeById } from '../utils/hierarchyBuilder';

interface BinModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: number | null;
  locations: LocationNode[];
  stockItems: StockItem[];
  isLoading: boolean;
}

export function BinModal({
  isOpen,
  onClose,
  locationId,
  locations,
  stockItems,
  isLoading,
}: BinModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

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

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bin-modal-title"
    >
      <div
        className="
          w-full max-w-md mx-4 rounded-lg shadow-xl
          bg-white dark:bg-zinc-900
          border border-gray-200 dark:border-zinc-700
          max-h-[80vh] flex flex-col
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: colors.border }}
        >
          <div>
            <h2
              id="bin-modal-title"
              className="text-lg font-semibold"
              style={{ color: colors.textPrimary }}
            >
              {t('warehouse_navigator.bin_details', 'Bin Details')}
            </h2>
            {location && (
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {location.completeName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="
              p-1.5 rounded-md transition-colors
              hover:bg-gray-100 dark:hover:bg-zinc-800
              text-gray-500 dark:text-zinc-400
            "
            aria-label={t('warehouse_navigator.close', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : stockItems.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-8 text-center"
              style={{ color: colors.textSecondary }}
            >
              <Package className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">
                {t('warehouse_navigator.no_stock', 'No stock in this location')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stockItems.map((item, index) => (
                <div
                  key={`${item.productId}-${item.lotId || index}`}
                  className="
                    flex items-start gap-3 p-3 rounded-lg
                    bg-gray-50 dark:bg-zinc-800
                    border border-gray-100 dark:border-zinc-700
                  "
                >
                  {/* Product thumbnail placeholder */}
                  <div
                    className="
                      w-10 h-10 rounded flex items-center justify-center flex-shrink-0
                      bg-blue-100 dark:bg-blue-900/30
                    "
                  >
                    <Package className="h-5 w-5 text-blue-500" />
                  </div>

                  {/* Product details */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: colors.textPrimary }}
                    >
                      {item.productName}
                    </p>

                    {item.lotName && (
                      <p
                        className="text-xs flex items-center gap-1 mt-0.5"
                        style={{ color: colors.textSecondary }}
                      >
                        <Hash className="h-3 w-3" />
                        {t('warehouse_navigator.lot', 'Lot')}: {item.lotName}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: '#3b82f6' }}
                    >
                      {Math.round(item.quantity * 100) / 100}
                    </p>
                    <p
                      className="text-xs flex items-center gap-1 justify-end"
                      style={{ color: colors.textSecondary }}
                    >
                      <Ruler className="h-3 w-3" />
                      {item.uomName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: colors.border }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              {t('warehouse_navigator.total_products', 'Total: {{count}} products', {
                count: stockItems.length,
              })}
            </span>
            <span className="text-sm font-medium" style={{ color: '#3b82f6' }}>
              {t('warehouse_navigator.total_quantity', 'Total Qty: {{qty}}', {
                qty: Math.round(stockItems.reduce((sum, item) => sum + item.quantity, 0) * 100) / 100,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
