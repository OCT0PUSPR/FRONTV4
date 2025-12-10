import React, { useState, useEffect } from "react"
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
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  CircularProgress,
  Alert,
  FormHelperText
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
  ChevronLeft,
  Info
} from "@mui/icons-material"

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

export default function WidgetConfigModal({ 
  open, 
  onClose, 
  onSubmit,
  apiBaseUrl = '/api/dashboard' 
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  
  // Data from API
  const [availableTables, setAvailableTables] = useState([])
  const [availableFields, setAvailableFields] = useState([])
  const [themes, setThemes] = useState([])
  
  const [config, setConfig] = useState({
    widgetType: '',
    title: '',
    table: '',
    // Main data configuration
    measureType: 'count', // count, field_value
    measureField: '', // Field to measure (for sum/avg/etc)
    measureAggregation: 'sum', // sum, avg, min, max, count
    dimensionField: '', // What to group by (categories, dates, etc)
    secondaryDimension: '', // For multi-series charts
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
    maxCategories: 10,
    // Filters
    additionalFilters: []
  })

  const steps = ['Select Widget Type', 'Configure Data', 'Customize Display']

  useEffect(() => {
    if (open) {
      fetchTables()
      fetchThemes()
    }
  }, [open])

  useEffect(() => {
    if (config.table) {
      fetchFields(config.table)
    }
  }, [config.table])

  const fetchTables = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/tables`)
      const data = await response.json()
      setAvailableTables(Array.isArray(data) ? data : (data?.data ?? []))
    } catch (error) {
      console.error('Failed to fetch tables:', error)
      setAvailableTables([])
    }
  }

  const fetchFields = async (tableName) => {
    setLoadingFields(true)
    try {
      const response = await fetch(`${apiBaseUrl}/tables/${tableName}/fields`)
      const data = await response.json()
      setAvailableFields(Array.isArray(data) ? data : (data?.data ?? []))
    } catch (error) {
      console.error('Failed to fetch fields:', error)
      setAvailableFields([])
    } finally {
      setLoadingFields(false)
    }
  }

  const fetchThemes = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/themes`)
      const data = await response.json()
      setThemes(Array.isArray(data) ? data : (data?.data ?? []))
    } catch (error) {
      console.error('Failed to fetch themes:', error)
      setThemes([])
    }
  }

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, steps.length - 1))
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0))
  const handleChange = (updates) => setConfig(prev => ({ ...prev, ...updates }))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await onSubmit(config)
      onClose()
      setActiveStep(0)
      setConfig({
        widgetType: '',
        title: '',
        table: '',
        measureType: 'count',
        measureField: '',
        measureAggregation: 'sum',
        dimensionField: '',
        secondaryDimension: '',
        displayFields: [],
        sortBy: '',
        sortDirection: 'DESC',
        rowsPerPage: 10,
        theme: 1,
        width: 6,
        height: 4,
        dateRange: 'last_30_days',
        customDateStart: '',
        customDateEnd: '',
        showLegend: true,
        showDataLabels: false,
        showGrid: true,
        stacked: false,
        orientation: 'vertical',
        prefix: '',
        suffix: '',
        comparisonEnabled: false,
        comparisonPeriod: 'previous_period',
        maxCategories: 10,
        additionalFilters: []
      })
    } catch (error) {
      console.error('Failed to create widget:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedWidget = WIDGET_TYPES.find(w => w.id === config.widgetType)
  const aggregatableFields = availableFields.filter(f => f.is_aggregatable)
  const groupableFields = availableFields.filter(f => f.is_groupable)
  const dateFields = availableFields.filter(f => f.is_date_field)

  // Get example based on config
  const getConfigExample = () => {
    const table = availableTables.find(t => t.table_name === config.table)
    const dimension = availableFields.find(f => f.field_name === config.dimensionField)
    const measure = availableFields.find(f => f.field_name === config.measureField)
    const secondary = availableFields.find(f => f.field_name === config.secondaryDimension)

    if (!table || !dimension) return null

    let example = ''
    
    if (config.measureType === 'count') {
      example = `Count of ${table.display_name} by ${dimension.display_label}`
      if (secondary) example += `, grouped by ${secondary.display_label}`
    } else if (config.measureType === 'field_value' && measure) {
      example = `${config.measureAggregation.toUpperCase()} of ${measure.display_label} by ${dimension.display_label}`
      if (secondary) example += `, grouped by ${secondary.display_label}`
    }

    return example
  }

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
    const supportsMultipleSeries = ['bar', 'line', 'area'].includes(config.widgetType)

    const example = getConfigExample()

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
              placeholder="e.g., Products by Category, Monthly Revenue"
              fullWidth
              size="small"
              value={config.title}
              onChange={(e) => handleChange({ title: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            
            <Autocomplete
              options={availableTables}
              groupBy={(option) => option.category}
              getOptionLabel={(option) => option.display_name}
              value={availableTables.find(t => t.table_name === config.table) || null}
              onChange={(_, newValue) => handleChange({ table: newValue?.table_name || '', dimensionField: '', measureField: '', secondaryDimension: '' })}
              renderInput={(params) => (
                <TextField {...params} label="Data Source" size="small" placeholder="Select a table" />
              )}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Box>
        </Box>

        {config.table && (
          <>
            <Divider sx={{ my: 3 }} />

            {loadingFields ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <>
                {/* List Widget Configuration */}
                {isListWidget && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                      Display Configuration
                    </Typography>
                    <Autocomplete
                      multiple
                      options={availableFields.filter(f => f.is_available_for_list)}
                      getOptionLabel={(option) => option.display_label}
                      value={availableFields.filter(f => config.displayFields.includes(f.field_name))}
                      onChange={(_, newValue) => handleChange({ displayFields: newValue.map(v => v.field_name) })}
                      renderInput={(params) => (
                        <TextField {...params} label="Select Fields to Display" size="small" placeholder="Choose columns" />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip key={option.field_name} label={option.display_label} size="small" {...getTagProps({ index })} />
                        ))
                      }
                      sx={{ mb: 2.5 }}
                    />
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Sort By</InputLabel>
                        <Select value={config.sortBy} label="Sort By" onChange={(e) => handleChange({ sortBy: e.target.value })}>
                          {availableFields.map(f => (
                            <MenuItem key={f.field_name} value={f.field_name}>{f.display_label}</MenuItem>
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
                        <InputLabel>What to Measure</InputLabel>
                        <Select value={config.measureType} label="What to Measure" onChange={(e) => handleChange({ measureType: e.target.value, measureField: '' })}>
                          <MenuItem value="count">Count Records</MenuItem>
                          <MenuItem value="field_value">Measure a Field Value</MenuItem>
                        </Select>
                        <FormHelperText>Choose whether to count records or measure a specific field</FormHelperText>
                      </FormControl>

                      {config.measureType === 'field_value' && (
                        <>
                          <FormControl fullWidth size="small">
                            <InputLabel>Field to Measure</InputLabel>
                            <Select value={config.measureField} label="Field to Measure" onChange={(e) => handleChange({ measureField: e.target.value })}>
                              {aggregatableFields.map(f => (
                                <MenuItem key={f.field_name} value={f.field_name}>{f.display_label}</MenuItem>
                              ))}
                            </Select>
                            <FormHelperText>e.g., Total Amount, Quantity, etc.</FormHelperText>
                          </FormControl>

                          <FormControl fullWidth size="small">
                            <InputLabel>Calculation</InputLabel>
                            <Select value={config.measureAggregation} label="Calculation" onChange={(e) => handleChange({ measureAggregation: e.target.value })}>
                              <MenuItem value="sum">Sum (Total)</MenuItem>
                              <MenuItem value="avg">Average</MenuItem>
                              <MenuItem value="min">Minimum</MenuItem>
                              <MenuItem value="max">Maximum</MenuItem>
                              <MenuItem value="count">Count</MenuItem>
                            </Select>
                          </FormControl>
                        </>
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

                {/* Chart Configuration (Bar, Line, Area, Pie, Donut, Scatter) */}
                {!isListWidget && !isStatCard && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                      Data Configuration
                    </Typography>
                    
                    {/* What to Show - The Measure */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'info.50', borderRadius: 1.5, border: '1px solid', borderColor: 'info.200' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Info fontSize="small" color="info" />
                        <Typography variant="subtitle2" fontWeight={600} color="info.main">
                          What to Show
                        </Typography>
                      </Box>
                      
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Measure</InputLabel>
                        <Select value={config.measureType} label="Measure" onChange={(e) => handleChange({ measureType: e.target.value, measureField: '' })}>
                          <MenuItem value="count">Count of Records</MenuItem>
                          <MenuItem value="field_value">Value of a Field</MenuItem>
                        </Select>
                        <FormHelperText>
                          {config.measureType === 'count' ? 'Count how many records exist' : 'Show sum/average of a numeric field'}
                        </FormHelperText>
                      </FormControl>

                      {config.measureType === 'field_value' && (
                        <>
                          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <InputLabel>Which Field?</InputLabel>
                            <Select value={config.measureField} label="Which Field?" onChange={(e) => handleChange({ measureField: e.target.value })}>
                              {aggregatableFields.map(f => (
                                <MenuItem key={f.field_name} value={f.field_name}>{f.display_label}</MenuItem>
                              ))}
                            </Select>
                            <FormHelperText>Select the numeric field to measure (e.g., Amount, Quantity, Price)</FormHelperText>
                          </FormControl>

                          <FormControl fullWidth size="small">
                            <InputLabel>Calculation Method</InputLabel>
                            <Select value={config.measureAggregation} label="Calculation Method" onChange={(e) => handleChange({ measureAggregation: e.target.value })}>
                              <MenuItem value="sum">Sum (Total)</MenuItem>
                              <MenuItem value="avg">Average</MenuItem>
                              <MenuItem value="min">Minimum</MenuItem>
                              <MenuItem value="max">Maximum</MenuItem>
                            </Select>
                          </FormControl>
                        </>
                      )}
                    </Box>

                    {/* How to Group - The Dimension */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'success.50', borderRadius: 1.5, border: '1px solid', borderColor: 'success.200' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Info fontSize="small" color="success" />
                        <Typography variant="subtitle2" fontWeight={600} color="success.main">
                          How to Group
                        </Typography>
                      </Box>

                      <FormControl fullWidth size="small">
                        <InputLabel>Group By</InputLabel>
                        <Select value={config.dimensionField} label="Group By" onChange={(e) => handleChange({ dimensionField: e.target.value })}>
                          {(isLineArea ? dateFields : groupableFields).map(f => (
                            <MenuItem key={f.field_name} value={f.field_name}>{f.display_label}</MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          {isPieDonut && 'Each slice represents a different group (e.g., each category)'}
                          {isBarChart && 'Each bar represents a different group (e.g., each status, category)'}
                          {isLineArea && 'Group data by time period (e.g., by day, month)'}
                          {isScatter && 'This will be your X-axis'}
                        </FormHelperText>
                      </FormControl>
                    </Box>

                    {/* Secondary Grouping for Multi-Series */}
                    {supportsMultipleSeries && (
                      <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.50', borderRadius: 1.5, border: '1px solid', borderColor: 'warning.200' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <Info fontSize="small" color="warning" />
                          <Typography variant="subtitle2" fontWeight={600} color="warning.main">
                            Multiple Series (Optional)
                          </Typography>
                        </Box>

                        <FormControl fullWidth size="small">
                          <InputLabel>Split By (Optional)</InputLabel>
                          <Select value={config.secondaryDimension} label="Split By (Optional)" onChange={(e) => handleChange({ secondaryDimension: e.target.value })}>
                            <MenuItem value="">None</MenuItem>
                            {groupableFields.filter(f => f.field_name !== config.dimensionField).map(f => (
                              <MenuItem key={f.field_name} value={f.field_name}>{f.display_label}</MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>
                            Show multiple {isBarChart ? 'bars' : 'lines'} for different groups (e.g., by Status, by Warehouse)
                          </FormHelperText>
                        </FormControl>
                      </Box>
                    )}

                    {/* Scatter Plot - Y Axis */}
                    {isScatter && (
                      <Box sx={{ mb: 3 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Y-Axis Field</InputLabel>
                          <Select value={config.measureField} label="Y-Axis Field" onChange={(e) => handleChange({ measureField: e.target.value })}>
                            {aggregatableFields.map(f => (
                              <MenuItem key={f.field_name} value={f.field_name}>{f.display_label}</MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>Select the second numeric field for comparison</FormHelperText>
                        </FormControl>
                      </Box>
                    )}

                    {/* Pie/Donut specific - Max categories */}
                    {isPieDonut && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" gutterBottom display="block" sx={{ mb: 1 }}>
                          Maximum slices to show (others will be grouped as "Other")
                        </Typography>
                        <Slider
                          value={config.maxCategories}
                          onChange={(_, value) => handleChange({ maxCategories: value })}
                          min={3}
                          max={20}
                          step={1}
                          marks
                          valueLabelDisplay="auto"
                        />
                      </Box>
                    )}

                    {/* Bar Chart Orientation */}
                    {isBarChart && (
                      <Box sx={{ mt: 3 }}>
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
                          <ToggleButton value="vertical">Vertical Bars</ToggleButton>
                          <ToggleButton value="horizontal">Horizontal Bars</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    )}

                    {/* Example Preview */}
                    {example && (
                      <Alert severity="success" icon={<Info />} sx={{ mt: 3 }}>
                        <Typography variant="caption" fontWeight={600}>
                          Your chart will show:
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {example}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                )}

                {/* Date Range (Common for most widgets except list) */}
                {!isListWidget && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                      Date Range Filter
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
                      <FormHelperText>Filter data by date range</FormHelperText>
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
              Width (columns, 1-12)
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
              Height (rows, 1-10)
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
          {themes.map(theme => {
            const isSelected = config.theme === theme.id
            return (
              <Box
                key={theme.id}
                onClick={() => handleChange({ theme: theme.id })}
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
                  <Box sx={{ flex: 1, height: 24, bgcolor: theme.primary_color, borderRadius: 0.5 }} />
                  <Box sx={{ flex: 1, height: 24, bgcolor: theme.secondary_color, borderRadius: 0.5 }} />
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

      {/* Number Formatting */}
      {config.widgetType !== 'list' && (
        <>
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              Number Formatting
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Prefix"
                size="small"
                value={config.prefix}
                onChange={(e) => handleChange({ prefix: e.target.value })}
                placeholder="$ or €"
                helperText="Shown before the number"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Suffix"
                size="small"
                value={config.suffix}
                onChange={(e) => handleChange({ suffix: e.target.value })}
                placeholder="%, units, kg"
                helperText="Shown after the number"
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />
        </>
      )}

      {/* Advanced Display Options */}
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
              label={<Typography variant="body2">Show Data Labels on Chart</Typography>}
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
    if (activeStep === 1) {
      if (!config.title || !config.table) return false
      
      // Validate based on widget type
      if (config.widgetType === 'list') {
        return config.displayFields.length > 0
      }
      if (config.widgetType === 'stat_card') {
        if (config.measureType === 'field_value') {
          return !!config.measureField
        }
        return true
      }
      // For charts
      if (config.widgetType === 'scatter') {
        return !!config.dimensionField && !!config.measureField
      }
      return !!config.dimensionField
    }
    return true
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
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
      <DialogContent sx={{ px: 4, py: 0, minHeight: 400, maxHeight: '60vh', overflowY: 'auto' }}>
        {activeStep === 0 && renderWidgetSelection()}
        {activeStep === 1 && renderDataConfig()}
        {activeStep === 2 && renderDisplayConfig()}
      </DialogContent>

      <Divider />

      {/* Actions */}
      <DialogActions sx={{ px: 4, py: 3, gap: 1.5 }}>
        <Button
          onClick={onClose}
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
            onClick={handleSubmit}
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