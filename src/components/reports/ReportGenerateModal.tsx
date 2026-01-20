/**
 * Report Generate Modal
 * Modal for selecting records/filters and generating custom warehouse reports
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  Send as GenerateIcon,
} from '@mui/icons-material';
import {
  CustomReportsService,
  CustomReportConfig,
  PickingRecord,
  ProductRecord,
  LocationOption,
  CategoryOption,
} from '../../services/customReports.service';

interface ReportGenerateModalProps {
  open: boolean;
  onClose: () => void;
  report: CustomReportConfig | null;
}

interface FilterValues {
  [key: string]: any;
}

export default function ReportGenerateModal({
  open,
  onClose,
  report,
}: ReportGenerateModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For single record reports
  const [records, setRecords] = useState<(PickingRecord | ProductRecord)[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  // For filters (both single record and list reports)
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [filterOptions, setFilterOptions] = useState<{
    locations: LocationOption[];
    categories: CategoryOption[];
  }>({ locations: [], categories: [] });

  // Load records and filter options when modal opens
  useEffect(() => {
    if (open && report) {
      loadInitialData();
    }

    // Reset state when modal closes
    if (!open) {
      setRecords([]);
      setSelectedRecordId(null);
      setFilterValues({});
      setError(null);
    }
  }, [open, report]);

  const loadInitialData = async () => {
    if (!report) return;

    setLoading(true);
    setError(null);

    try {
      // Load records for single_record reports
      if (report.report_category === 'single_record') {
        const recordsData = await CustomReportsService.getRecordsForSelection(
          report.report_key,
          report.odoo_model,
          report.picking_type_filter,
          200
        );
        setRecords(recordsData);
      }

      // Load filter options if needed
      if (report.available_filters) {
        const filters = report.available_filters;

        // Check if we need locations
        if (filters.location_id?.model === 'stock.location') {
          const locations = await CustomReportsService.getFilterOptions('stock.location');
          setFilterOptions(prev => ({ ...prev, locations: locations as LocationOption[] }));
        }

        // Check if we need categories
        if (filters.category_id?.model === 'product.category') {
          const categories = await CustomReportsService.getFilterOptions('product.category');
          setFilterOptions(prev => ({ ...prev, categories: categories as CategoryOption[] }));
        }

        // Set default date range (last 30 days)
        const defaultFilters: FilterValues = {};
        if (filters.date_from) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          defaultFilters.date_from = thirtyDaysAgo.toISOString().split('T')[0];
        }
        if (filters.date_to) {
          defaultFilters.date_to = new Date().toISOString().split('T')[0];
        }
        if (filters.count_date) {
          defaultFilters.count_date = new Date().toISOString().split('T')[0];
        }
        if (filters.as_of_date) {
          defaultFilters.as_of_date = new Date().toISOString().split('T')[0];
        }
        setFilterValues(defaultFilters);
      }
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error('Error loading modal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async (downloadDirectly: boolean = false) => {
    if (!report) return;

    // Validation for single record reports
    if (report.report_category === 'single_record' && !selectedRecordId) {
      setError('Please select a record');
      return;
    }

    // Validation for required filters
    if (report.available_filters) {
      for (const [key, config] of Object.entries(report.available_filters)) {
        if (config.required && !filterValues[key]) {
          setError(`Please fill in the required field: ${config.label}`);
          return;
        }
      }
    }

    setGenerating(true);
    setError(null);

    try {
      const params = {
        report_key: report.report_key,
        record_id: selectedRecordId || undefined,
        filters: filterValues,
      };

      if (downloadDirectly) {
        // Direct download
        await CustomReportsService.downloadReport(params);
        onClose();
      } else {
        // Generate and redirect to generated reports page
        const result = await CustomReportsService.generateReport(params);
        if (result.success) {
          onClose();
          // Navigate to generated reports page
          navigate('/generated-reports');
        } else {
          setError(result.error || 'Failed to generate report');
        }
      }
    } catch (err) {
      setError('Failed to generate report. Please try again.');
      console.error('Error generating report:', err);
    } finally {
      setGenerating(false);
    }
  };

  const renderRecordSelector = () => {
    if (!report || report.report_category !== 'single_record') return null;

    const isPickingModel = report.odoo_model === 'stock.picking';
    const isProductModel = report.odoo_model === 'product.product';

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          Select Record
        </Typography>
        <Autocomplete
          options={records}
          getOptionLabel={(option) => {
            if (isPickingModel) {
              const picking = option as PickingRecord;
              return `${picking.name} - ${picking.partner_name || 'No Partner'} (${picking.scheduled_date?.split('T')[0] || ''})`;
            }
            if (isProductModel) {
              const product = option as ProductRecord;
              return `[${product.default_code || 'N/A'}] ${product.name}`;
            }
            return String((option as any).name || option);
          }}
          value={records.find((r) => r.id === selectedRecordId) || null}
          onChange={(_, newValue) => setSelectedRecordId(newValue?.id || null)}
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label={isPickingModel ? 'Select Transfer' : 'Select Product'}
              size="small"
              placeholder="Search..."
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => {
            if (isPickingModel) {
              const picking = option as PickingRecord;
              return (
                <li {...props} key={picking.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {picking.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {picking.partner_name || 'No Partner'} | {picking.picking_type_name} | {picking.scheduled_date?.split('T')[0]}
                    </Typography>
                  </Box>
                </li>
              );
            }
            if (isProductModel) {
              const product = option as ProductRecord;
              return (
                <li {...props} key={product.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      [{product.default_code || 'N/A'}] {product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {product.category_name} | Qty: {product.qty_available}
                    </Typography>
                  </Box>
                </li>
              );
            }
            return <li {...props}>{String(option)}</li>;
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
        />
      </Box>
    );
  };

  const renderFilters = () => {
    if (!report?.available_filters) return null;

    const filters = report.available_filters;

    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          {report.report_category === 'list_report' ? 'Report Filters' : 'Additional Options'}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(filters).map(([key, config]) => {
            // Date fields
            if (config.type === 'date') {
              return (
                <TextField
                  key={key}
                  label={config.label}
                  type="date"
                  size="small"
                  fullWidth
                  required={config.required}
                  value={filterValues[key] || ''}
                  onChange={(e) => handleFilterChange(key, e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              );
            }

            // Selection fields with model (location, category)
            if (config.type === 'selection' && config.model) {
              const options =
                config.model === 'stock.location'
                  ? filterOptions.locations
                  : config.model === 'product.category'
                  ? filterOptions.categories
                  : [];

              return (
                <Autocomplete
                  key={key}
                  options={options}
                  getOptionLabel={(option) => option.complete_name || option.name}
                  value={options.find((o) => o.id === filterValues[key]) || null}
                  onChange={(_, newValue) => handleFilterChange(key, newValue?.id || null)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={config.label}
                      size="small"
                      required={config.required}
                    />
                  )}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              );
            }

            // Selection fields with static options
            if (config.type === 'selection' && config.options) {
              return (
                <FormControl key={key} fullWidth size="small">
                  <InputLabel>{config.label}</InputLabel>
                  <Select
                    label={config.label}
                    value={filterValues[key] || ''}
                    onChange={(e) => handleFilterChange(key, e.target.value)}
                    sx={{ borderRadius: 1.5 }}
                  >
                    {config.options.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            }

            return null;
          })}
        </Box>
      </Box>
    );
  };

  if (!report) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PdfIcon sx={{ color: 'error.main', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {report.report_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {report.description || 'Generate warehouse report'}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {renderRecordSelector()}
            {renderFilters()}

            {!report.available_filters && report.report_category === 'single_record' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Select a record above to generate the report.
              </Typography>
            )}
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none' }}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          onClick={() => handleGenerate(true)}
          disabled={generating || loading}
          startIcon={<DownloadIcon />}
          sx={{ textTransform: 'none' }}
        >
          Download Now
        </Button>
        <Button
          variant="contained"
          onClick={() => handleGenerate(false)}
          disabled={generating || loading}
          startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <GenerateIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
          }}
        >
          {generating ? 'Generating...' : 'Generate Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
