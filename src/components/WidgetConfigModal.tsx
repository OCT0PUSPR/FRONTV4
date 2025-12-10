import React, { useState } from "react"
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
  Stepper,
  Step,
  StepLabel,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  InputAdornment,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Slider
} from "@mui/material"
import { 
  BarChart as BarIcon,
  ShowChart as LineIcon,
  PieChart as PieIcon,
  ScatterPlot as ScatterIcon,
  TableChart as ListIcon,
  Speed as SparklineIcon,
  Analytics as StatIcon,
  Timeline as AreaIcon,
  DonutLarge as DonutIcon,
  ChevronRight,
  ChevronLeft
} from "@mui/icons-material"

// Widget type definitions
const WIDGET_TYPES = [
  { id: 'stat_card', label: 'Statistic Card', icon: StatIcon, description: 'Display a single key metric' },
  { id: 'bar', label: 'Bar Chart', icon: BarIcon, description: 'Compare values across categories' },
  { id: 'line', label: 'Line Chart', icon: LineIcon, description: 'Show trends over time' },
  { id: 'area', label: 'Area Chart', icon: AreaIcon, description: 'Filled line chart for volumes' },
  { id: 'pie', label: 'Pie Chart', icon: PieIcon, description: 'Show proportions of a whole' },
  { id: 'donut', label: 'Donut Chart', icon: DonutIcon, description: 'Pie chart with center hollow' },
  { id: 'scatter', label: 'Scatter Plot', icon: ScatterIcon, description: 'Show correlation between values' },
  { id: 'sparkline', label: 'Sparkline', icon: SparklineIcon, description: 'Compact trend indicator' },
  { id: 'list', label: 'List', icon: ListIcon, description: 'Display tabular data' }
]

type Props = {
  open: boolean
  loading: boolean
  colors: any
  availableTables: string[]
  themeColors: Record<number, { name: string; primary: string; secondary: string }>
  chartName?: string
  config: {
    title: string
    table: string
    column_y: string
    aggregation: string
    theme_id: number
    width: number
    height: number
  }
  onChange: (next: Partial<any>) => void
  onCancel: () => void
  onCreate: () => void
}

export default function WidgetConfigModal({ open, onCancel, loading, colors, availableTables, themeColors, chartName, config: parentConfig, onChange, onCreate }: Props) {
  const [activeStep, setActiveStep] = useState(0)
  const [config, setConfig] = useState({
    widgetType: '',
    title: '',
    table: '',
    // Data configuration
    xAxis: '',
    yAxis: '',
    categoryField: '',
    valueField: '',
    aggregation: 'count',
    groupBy: '',
    // List specific
    displayFields: [],
    sortBy: '',
    sortDirection: 'DESC',
    rowsPerPage: 10,
    // Display options
    theme: 1,
    width: 6,
    height: 4,
    // Date range
    dateRange: 'last_30_days',
    customDateStart: '',
    customDateEnd: '',
    // Advanced options
    showLegend: true,
    showDataLabels: false,
    showGrid: true,
    stacked: false,
    orientation: 'vertical',
    prefix: '',
    suffix: '',
    comparisonEnabled: false,
    comparisonPeriod: 'previous_period',
    maxCategories: 10
  })

  const steps = ['Select Widget Type', 'Configure Data', 'Customize Display']

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, steps.length - 1))
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0))
  const handleChange = (updates) => setConfig(prev => ({ ...prev, ...updates }))

  const selectedWidget = WIDGET_TYPES.find(w => w.id === config.widgetType)
  const selectedTableFields = []
  const aggregatableFields = []
  const groupableFields = []

  // Step 1: Widget Type Selection
  const renderWidgetSelection = () => (
    <Box sx={{ py: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.875rem' }}>
        Choose the type of visualization that best represents your data
      </Typography>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
        gap: 2 
      }}>
        {WIDGET_TYPES.map((widget) => {
          const Icon = widget.icon
          const isSelected = config.widgetType === widget.id
          return (
            <Box
              key={widget.id}
              onClick={() => handleChange({ widgetType: widget.id })}
              sx={{
                border: '1.5px solid',
                borderColor: isSelected ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 2.5,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                bgcolor: isSelected ? 'primary.50' : 'transparent',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'primary.50',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }
              }}
            >
              <Icon sx={{ 
                fontSize: 32, 
                color: isSelected ? 'primary.main' : 'text.secondary',
                mb: 1.5
              }} />
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                {widget.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                {widget.description}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )

  // Step 2: Data Configuration
  const renderDataConfig = () => {
    if (!config.widgetType) return null

    const isListWidget = config.widgetType === 'list'
    const isStatCard = config.widgetType === 'stat_card'
    const isPieDonut = ['pie', 'donut'].includes(config.widgetType)
    const isLineArea = ['line', 'area', 'sparkline'].includes(config.widgetType)
    const isBarChart = config.widgetType === 'bar'
    const isScatter = config.widgetType === 'scatter'

    return (
      <Box sx={{ py: 2 }}>
        {/* Basic Configuration */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
            Basic Information
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Widget Title"
              placeholder="e.g., Monthly Revenue"
              fullWidth
              size="small"
              value={config.title}
              onChange={(e) => handleChange({ title: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            
            <Autocomplete
              options={availableTables.map((t) => ({ value: t, label: t }))}
              getOptionLabel={(option) => option.label}
              value={config.table ? { value: config.table, label: config.table } : null}
              onChange={(_, newValue) => handleChange({ table: newValue?.value || '' })}
              renderInput={(params) => (
                <TextField {...params} label="Data Source" size="small" />
              )}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Box>
        </Box>

        {config.table && (
          <>
            <Divider sx={{ my: 3 }} />

            {/* List Widget Configuration */}
            {isListWidget && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Display Fields
                </Typography>
                <Autocomplete
                  multiple
                  options={selectedTableFields}
                  getOptionLabel={(option) => option.label}
                  value={selectedTableFields.filter(f => config.displayFields.includes(f.value))}
                  onChange={(_, newValue) => handleChange({ displayFields: newValue.map(v => v.value) })}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Fields" size="small" placeholder="Choose fields to display" />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option.label} size="small" {...getTagProps({ index })} />
                    ))
                  }
                  sx={{ mb: 2.5 }}
                />
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sort By</InputLabel>
                    <Select value={config.sortBy} label="Sort By" onChange={(e) => handleChange({ sortBy: e.target.value })}>
                      {selectedTableFields.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Direction</InputLabel>
                    <Select value={config.sortDirection} label="Direction" onChange={(e) => handleChange({ sortDirection: e.target.value })}>
                      <MenuItem value="ASC">Ascending</MenuItem>
                      <MenuItem value="DESC">Descending</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label="Rows"
                    type="number"
                    size="small"
                    value={config.rowsPerPage}
                    onChange={(e) => handleChange({ rowsPerPage: Number(e.target.value) })}
                    sx={{ width: 100 }}
                    inputProps={{ min: 5, max: 100 }}
                  />
                </Box>
              </Box>
            )}

            {/* Stat Card Configuration */}
            {isStatCard && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Metric Configuration
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Aggregation Type</InputLabel>
                    <Select value={config.aggregation} label="Aggregation Type" onChange={(e) => handleChange({ aggregation: e.target.value })}>
                      <MenuItem value="count">Count Records</MenuItem>
                      <MenuItem value="sum">Sum</MenuItem>
                      <MenuItem value="avg">Average</MenuItem>
                      <MenuItem value="min">Minimum</MenuItem>
                      <MenuItem value="max">Maximum</MenuItem>
                    </Select>
                  </FormControl>

                  {config.aggregation !== 'count' && (
                    <FormControl fullWidth size="small">
                      <InputLabel>Field to Aggregate</InputLabel>
                      <Select value={config.valueField} label="Field to Aggregate" onChange={(e) => handleChange({ valueField: e.target.value })}>
                        {aggregatableFields.map(f => (
                          <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Prefix"
                      size="small"
                      value={config.prefix}
                      onChange={(e) => handleChange({ prefix: e.target.value })}
                      placeholder="$ or €"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Suffix"
                      size="small"
                      value={config.suffix}
                      onChange={(e) => handleChange({ suffix: e.target.value })}
                      placeholder="% or units"
                      sx={{ flex: 1 }}
                    />
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch 
                        checked={config.comparisonEnabled} 
                        onChange={(e) => handleChange({ comparisonEnabled: e.target.checked })}
                      />
                    }
                    label="Show comparison with previous period"
                  />

                  {config.comparisonEnabled && (
                    <FormControl fullWidth size="small">
                      <InputLabel>Compare With</InputLabel>
                      <Select value={config.comparisonPeriod} label="Compare With" onChange={(e) => handleChange({ comparisonPeriod: e.target.value })}>
                        <MenuItem value="previous_period">Previous Period</MenuItem>
                        <MenuItem value="same_period_last_year">Same Period Last Year</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </Box>
              </Box>
            )}

            {/* Pie/Donut Chart Configuration */}
            {isPieDonut && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Chart Data
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category Field</InputLabel>
                    <Select value={config.categoryField} label="Category Field" onChange={(e) => handleChange({ categoryField: e.target.value })}>
                      {groupableFields.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Value Type</InputLabel>
                    <Select value={config.aggregation} label="Value Type" onChange={(e) => handleChange({ aggregation: e.target.value })}>
                      <MenuItem value="count">Count</MenuItem>
                      <MenuItem value="sum">Sum</MenuItem>
                      <MenuItem value="avg">Average</MenuItem>
                    </Select>
                  </FormControl>

                  {config.aggregation !== 'count' && (
                    <FormControl fullWidth size="small">
                      <InputLabel>Value Field</InputLabel>
                      <Select value={config.valueField} label="Value Field" onChange={(e) => handleChange({ valueField: e.target.value })}>
                        {aggregatableFields.map(f => (
                          <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <Box>
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      Maximum slices to show
                    </Typography>
                    <Slider
                      value={config.maxCategories}
                      onChange={(_, value) => handleChange({ maxCategories: value })}
                      min={3}
                      max={20}
                      marks
                      valueLabelDisplay="auto"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Box>
              </Box>
            )}

            {/* Bar Chart Configuration */}
            {isBarChart && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Chart Axes
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>X-Axis (Categories)</InputLabel>
                    <Select value={config.xAxis} label="X-Axis (Categories)" onChange={(e) => handleChange({ xAxis: e.target.value })}>
                      {groupableFields.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Y-Axis Metric</InputLabel>
                    <Select value={config.aggregation} label="Y-Axis Metric" onChange={(e) => handleChange({ aggregation: e.target.value })}>
                      <MenuItem value="count">Count</MenuItem>
                      <MenuItem value="sum">Sum</MenuItem>
                      <MenuItem value="avg">Average</MenuItem>
                    </Select>
                  </FormControl>

                  {config.aggregation !== 'count' && (
                    <FormControl fullWidth size="small">
                      <InputLabel>Y-Axis Field</InputLabel>
                      <Select value={config.yAxis} label="Y-Axis Field" onChange={(e) => handleChange({ yAxis: e.target.value })}>
                        {aggregatableFields.map(f => (
                          <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <Box>
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block" sx={{ mb: 1 }}>
                      Chart Orientation
                    </Typography>
                    <ToggleButtonGroup
                      value={config.orientation}
                      exclusive
                      onChange={(_, value) => value && handleChange({ orientation: value })}
                      size="small"
                      fullWidth
                    >
                      <ToggleButton value="vertical">Vertical</ToggleButton>
                      <ToggleButton value="horizontal">Horizontal</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Line/Area Chart Configuration */}
            {isLineArea && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Time Series Data
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Time Field</InputLabel>
                    <Select value={config.xAxis} label="Time Field" onChange={(e) => handleChange({ xAxis: e.target.value })}>
                      {selectedTableFields.filter(f => f.type === 'date').map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Value Metric</InputLabel>
                    <Select value={config.aggregation} label="Value Metric" onChange={(e) => handleChange({ aggregation: e.target.value })}>
                      <MenuItem value="count">Count</MenuItem>
                      <MenuItem value="sum">Sum</MenuItem>
                      <MenuItem value="avg">Average</MenuItem>
                    </Select>
                  </FormControl>

                  {config.aggregation !== 'count' && (
                    <FormControl fullWidth size="small">
                      <InputLabel>Value Field</InputLabel>
                      <Select value={config.yAxis} label="Value Field" onChange={(e) => handleChange({ yAxis: e.target.value })}>
                        {aggregatableFields.map(f => (
                          <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <FormControl fullWidth size="small">
                    <InputLabel>Group By (Optional)</InputLabel>
                    <Select value={config.groupBy} label="Group By (Optional)" onChange={(e) => handleChange({ groupBy: e.target.value })}>
                      <MenuItem value="">None</MenuItem>
                      {groupableFields.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            )}

            {/* Scatter Chart Configuration */}
            {isScatter && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Scatter Plot Axes
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>X-Axis Field</InputLabel>
                    <Select value={config.xAxis} label="X-Axis Field" onChange={(e) => handleChange({ xAxis: e.target.value })}>
                      {aggregatableFields.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Y-Axis Field</InputLabel>
                    <Select value={config.yAxis} label="Y-Axis Field" onChange={(e) => handleChange({ yAxis: e.target.value })}>
                      {aggregatableFields.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            )}

            {/* Date Range (Common for most widgets) */}
            {!isListWidget && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Date Range
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Time Period</InputLabel>
                  <Select value={config.dateRange} label="Time Period" onChange={(e) => handleChange({ dateRange: e.target.value })}>
                    <MenuItem value="last_7_days">Last 7 Days</MenuItem>
                    <MenuItem value="last_30_days">Last 30 Days</MenuItem>
                    <MenuItem value="last_quarter">Last Quarter</MenuItem>
                    <MenuItem value="last_year">Last Year</MenuItem>
                    <MenuItem value="custom">Custom Range</MenuItem>
                    <MenuItem value="all_time">All Time</MenuItem>
                  </Select>
                </FormControl>

                {config.dateRange === 'custom' && (
                  <Box sx={{ display: 'flex', gap: 2, mt: 2.5 }}>
                    <TextField
                      label="Start Date"
                      type="date"
                      size="small"
                      fullWidth
                      value={config.customDateStart}
                      onChange={(e) => handleChange({ customDateStart: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="End Date"
                      type="date"
                      size="small"
                      fullWidth
                      value={config.customDateEnd}
                      onChange={(e) => handleChange({ customDateEnd: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    )
  }

  // Step 3: Display Customization
  const renderDisplayConfig = () => (
    <Box sx={{ py: 2 }}>
      {/* Size Configuration */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
          Widget Size
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Width (columns)
            </Typography>
            <Slider
              value={config.width}
              onChange={(_, value) => handleChange({ width: value })}
              min={1}
              max={12}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Height (rows)
            </Typography>
            <Slider
              value={config.height}
              onChange={(_, value) => handleChange({ height: value })}
              min={1}
              max={10}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Theme Selection */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
          Color Theme
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5 }}>
          {Object.entries(themeColors).map(([id, theme]) => {
            const themeId = Number(id)
            const isSelected = config.theme === themeId
            return (
              <Box
                key={id}
                onClick={() => handleChange({ theme: themeId })}
                sx={{
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  borderRadius: 1.5,
                  p: 1.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'scale(1.02)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                  <Box sx={{ flex: 1, height: 24, bgcolor: theme.primary, borderRadius: 0.5 }} />
                  <Box sx={{ flex: 1, height: 24, bgcolor: theme.secondary, borderRadius: 0.5 }} />
                </Box>
                <Typography variant="caption" fontWeight={500} sx={{ fontSize: '0.75rem' }}>
                  {theme.name}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Advanced Options */}
      {config.widgetType !== 'list' && config.widgetType !== 'stat_card' && (
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            Display Options
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <FormControlLabel
              control={<Switch checked={config.showLegend} onChange={(e) => handleChange({ showLegend: e.target.checked })} size="small" />}
              label={<Typography variant="body2">Show Legend</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={config.showDataLabels} onChange={(e) => handleChange({ showDataLabels: e.target.checked })} size="small" />}
              label={<Typography variant="body2">Show Data Labels</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={config.showGrid} onChange={(e) => handleChange({ showGrid: e.target.checked })} size="small" />}
              label={<Typography variant="body2">Show Grid Lines</Typography>}
            />
            {['bar', 'area'].includes(config.widgetType) && (
              <FormControlLabel
                control={<Switch checked={config.stacked} onChange={(e) => handleChange({ stacked: e.target.checked })} size="small" />}
                label={<Typography variant="body2">Stacked Display</Typography>}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  )

  const canProceed = () => {
    if (activeStep === 0) return !!config.widgetType
    if (activeStep === 1) return !!config.title && !!config.table
    return true
  }

  return (
    <Dialog 
      open={open} 
      onClose={onCancel} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ px: 4, pt: 4, pb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, letterSpacing: '-0.02em' }}>
            Create New Widget
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {selectedWidget ? `Configure your ${selectedWidget.label.toLowerCase()}` : 'Follow the steps to create your custom widget'}
          </Typography>
        </Box>
      </DialogTitle>

      {/* Stepper */}
      <Box sx={{ px: 4, pt: 2, pb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel
                StepIconProps={{
                  sx: {
                    '&.Mui-active': { color: 'primary.main' },
                    '&.Mui-completed': { color: 'success.main' }
                  }
                }}
              >
                <Typography variant="caption" fontWeight={500}>{label}</Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Divider />

      {/* Content */}
      <DialogContent sx={{ px: 4, py: 0, minHeight: 400 }}>
        {activeStep === 0 && renderWidgetSelection()}
        {activeStep === 1 && renderDataConfig()}
        {activeStep === 2 && renderDisplayConfig()}
      </DialogContent>

      <Divider />

      {/* Actions */}
      <DialogActions sx={{ px: 4, py: 3, gap: 1.5 }}>
        <Button
          onClick={onCancel}
          sx={{ 
            color: 'text.secondary',
            textTransform: 'none',
            fontWeight: 500,
            px: 2.5
          }}
        >
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            startIcon={<ChevronLeft />}
            sx={{ 
              textTransform: 'none',
              fontWeight: 500,
              px: 2.5
            }}
          >
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed()}
            endIcon={<ChevronRight />}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }
            }}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={onCreate}
            disabled={!canProceed() || loading}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              px: 3.5,
              py: 1,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }
            }}
          >
            {loading ? 'Creating...' : 'Create Widget'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}