import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Truck, Clock, Package, MapPin, AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { API_CONFIG, getTenantHeaders } from '../../config/api';

const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .animate-fade-in {
    animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

interface InboundPicking {
  id: number;
  name: string;
  origin: string;
  partner_name: string;
  scheduled_date: string;
  state: string;
  location_dest_name: string;
  move_count: number;
}

interface InboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseId?: string | number;
  colors: any;
}

export const InboundModal: React.FC<InboundModalProps> = ({ isOpen, onClose, warehouseId, colors }) => {
  const { t } = useTranslation();
  const [pickings, setPickings] = useState<InboundPicking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get session ID from localStorage
  const getSessionId = (): string | null => {
    return localStorage.getItem('sessionId');
  };

  // Build headers with session ID
  const getApiHeaders = (): Record<string, string> => {
    const headers = getTenantHeaders();
    const sessionId = getSessionId();
    if (sessionId) {
      headers['X-Odoo-Session'] = sessionId;
    }
    return headers;
  };

  // Fetch inbound pickings from Odoo
  const fetchInboundPickings = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) {
      setError('No session ID found. Please sign in.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build domain for incoming transfers
      // state not in ('done', 'cancel') - only pending ones
      const domainParts: any[] = [
        ['picking_type_code', '=', 'incoming'],
        ['state', 'not in', ['done', 'cancel']]
      ];

      // Filter by warehouse if provided
      if (warehouseId) {
        const whId = typeof warehouseId === 'string' ? parseInt(warehouseId, 10) : warehouseId;
        if (!isNaN(whId)) {
          domainParts.push(['picking_type_id.warehouse_id', '=', whId]);
        }
      }

      const domain = JSON.stringify(domainParts);

      const response = await fetch(
        `${API_CONFIG.BACKEND_BASE_URL}/smart-fields/data/stock.picking?domain=${encodeURIComponent(domain)}&limit=50`,
        {
          method: 'GET',
          headers: getApiHeaders(),
        }
      );

      const data = await response.json();

      if (data.success && Array.isArray(data.records)) {
        // Map response to our format
        const inboundList: InboundPicking[] = data.records.map((p: any) => ({
          id: p.id,
          name: p.name || '',
          origin: p.origin || '',
          partner_name: Array.isArray(p.partner_id) ? p.partner_id[1] : (p.partner_name || 'Unknown'),
          scheduled_date: p.scheduled_date || '',
          state: p.state || 'draft',
          location_dest_name: Array.isArray(p.location_dest_id) ? p.location_dest_id[1] : (p.location_dest_name || ''),
          move_count: p.move_ids_without_package?.length || p.move_line_count || 0,
        }));

        // Sort by scheduled date
        inboundList.sort((a, b) => {
          const dateA = new Date(a.scheduled_date).getTime() || 0;
          const dateB = new Date(b.scheduled_date).getTime() || 0;
          return dateA - dateB;
        });

        setPickings(inboundList);
      } else {
        setError(data.error || 'Failed to fetch inbound pickings');
      }
    } catch (err) {
      console.error('Error fetching inbound pickings:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  // Fetch when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchInboundPickings();
    }
  }, [isOpen, fetchInboundPickings]);

  if (!isOpen) return null;

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Get status display info
  const getStatusInfo = (state: string) => {
    switch (state) {
      case 'assigned':
        return {
          label: t('Ready'),
          iconBg: 'rgba(16, 185, 129, 0.1)',
          iconColor: '#10b981',
          badgeBg: 'rgba(16, 185, 129, 0.15)',
          badgeColor: '#065f46'
        };
      case 'waiting':
        return {
          label: t('Waiting'),
          iconBg: 'rgba(245, 158, 11, 0.1)',
          iconColor: '#f59e0b',
          badgeBg: 'rgba(245, 158, 11, 0.15)',
          badgeColor: '#92400e'
        };
      case 'confirmed':
        return {
          label: t('Confirmed'),
          iconBg: 'rgba(59, 130, 246, 0.1)',
          iconColor: '#3b82f6',
          badgeBg: 'rgba(59, 130, 246, 0.15)',
          badgeColor: '#1e40af'
        };
      case 'draft':
        return {
          label: t('Draft'),
          iconBg: colors.mutedBg,
          iconColor: colors.textSecondary,
          badgeBg: colors.mutedBg,
          badgeColor: colors.textSecondary
        };
      default:
        return {
          label: state,
          iconBg: colors.mutedBg,
          iconColor: colors.textSecondary,
          badgeBg: colors.mutedBg,
          badgeColor: colors.textSecondary
        };
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 backdrop-blur-sm transition-opacity"
          style={{ background: `${colors.textPrimary}60` }}
          onClick={onClose}
        />

        <div
          className="relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]"
          style={{
            background: colors.card,
          }}
        >

          {/* Header */}
          <div
            className="flex items-center justify-between p-6"
            style={{
              borderBottom: `1px solid ${colors.border}`,
              background: colors.mutedBg
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg shadow-md"
                style={{
                  background: '#1f2937',
                  color: '#ffffff'
                }}
              >
                <Truck size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>{t("Inbound Shipments")}</h2>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  {t("Pending receipts")} ({pickings.length})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchInboundPickings}
                disabled={loading}
                className="p-2 rounded-full transition-colors"
                style={{ color: colors.textSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.border;
                  e.currentTarget.style.color = colors.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = colors.textSecondary;
                }}
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full transition-colors"
                style={{ color: colors.textSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.border;
                  e.currentTarget.style.color = colors.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = colors.textSecondary;
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto p-6 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
                  style={{ borderColor: colors.action || colors.textPrimary }}
                />
              </div>
            ) : error ? (
              <div
                className="text-center py-12 rounded-lg border border-dashed"
                style={{ background: colors.mutedBg, borderColor: colors.border }}
              >
                <AlertCircle size={32} className="mx-auto mb-2 text-red-500" />
                <p className="text-sm text-red-500">{error}</p>
                <button
                  onClick={fetchInboundPickings}
                  className="mt-3 text-sm font-medium px-4 py-2 rounded-lg"
                  style={{ background: colors.border, color: colors.textPrimary }}
                >
                  {t("Retry")}
                </button>
              </div>
            ) : pickings.length === 0 ? (
              <div
                className="text-center py-12 rounded-lg border border-dashed"
                style={{ background: colors.mutedBg, borderColor: colors.border }}
              >
                <Inbox size={48} className="mx-auto mb-3" style={{ color: colors.textSecondary }} />
                <p className="font-medium" style={{ color: colors.textPrimary }}>{t("No pending receipts")}</p>
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {t("All inbound shipments have been processed")}
                </p>
              </div>
            ) : (
              pickings.map((picking) => {
                const statusInfo = getStatusInfo(picking.state);
                return (
                  <div
                    key={picking.id}
                    className="group p-4 border rounded-xl hover:shadow-md transition-all duration-200"
                    style={{
                      background: colors.card,
                      borderColor: colors.border
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = colors.border;
                    }}
                  >
                    <div className="flex items-start justify-between">

                      <div className="flex items-start gap-4">
                        <div
                          className="mt-1 p-2 rounded-lg"
                          style={{
                            background: statusInfo.iconBg,
                            color: statusInfo.iconColor
                          }}
                        >
                          <Package size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg" style={{ color: colors.textPrimary }}>
                            {picking.partner_name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: colors.textSecondary }}>
                            <span
                              className="font-mono px-1.5 rounded"
                              style={{
                                background: colors.mutedBg,
                                color: colors.textPrimary
                              }}
                            >
                              {picking.name}
                            </span>
                            {picking.origin && (
                              <span className="text-xs">
                                {t("Origin")}: {picking.origin}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
                          style={{
                            background: statusInfo.badgeBg,
                            color: statusInfo.badgeColor
                          }}
                        >
                          {picking.state === 'assigned' && <Truck size={12} />}
                          {picking.state === 'waiting' && <Clock size={12} />}
                          {picking.state === 'confirmed' && <Package size={12} />}
                          {picking.state === 'draft' && <Clock size={12} />}
                          {statusInfo.label}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: colors.textSecondary }}>
                          <Clock size={12} />
                          {formatDate(picking.scheduled_date)}
                        </div>
                      </div>

                    </div>

                    <div
                      className="mt-4 pt-3 flex items-center justify-between text-xs"
                      style={{
                        borderTop: `1px solid ${colors.border}`,
                        color: colors.textSecondary
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} />
                        {picking.location_dest_name || t("Warehouse")}
                      </div>
                      <span className="font-medium" style={{ color: colors.textPrimary }}>
                        {picking.move_count} {t("lines")}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            className="p-4 flex justify-end gap-3"
            style={{
              borderTop: `1px solid ${colors.border}`,
              background: colors.mutedBg
            }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                color: colors.textSecondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.textPrimary;
                e.currentTarget.style.background = colors.border;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.textSecondary;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {t("Close")}
            </button>
          </div>

        </div>
      </div>
    </>
  );
};
