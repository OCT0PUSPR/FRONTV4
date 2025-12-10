import { Database, WidgetConfig } from './types';

// Generators for realistic looking data
const generateSalesData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map(m => ({
    month: m,
    revenue: Math.floor(Math.random() * 50000) + 20000,
    profit: Math.floor(Math.random() * 20000) + 5000,
    units: Math.floor(Math.random() * 1000) + 200,
    customer_sat: Math.floor(Math.random() * 50) + 50, // 50-100 score
  }));
};

const generateInventory = () => [
  { id: 'P001', product: 'Neural Processor X1', stock: 12, category: 'Hardware', status: 'Low', price: 1200 },
  { id: 'P002', product: 'Quantum Core', stock: 145, category: 'Hardware', status: 'Good', price: 2500 },
  { id: 'P003', product: 'Haptic Glove', stock: 4, category: 'Wearable', status: 'Critical', price: 450 },
  { id: 'P004', product: 'Optic Cable 5M', stock: 890, category: 'Accessory', status: 'Good', price: 25 },
  { id: 'P005', product: 'VR Headset Pro', stock: 8, category: 'Wearable', status: 'Low', price: 899 },
  { id: 'P006', product: 'Charging Dock', stock: 230, category: 'Accessory', status: 'Good', price: 75 },
];

const generateTransfers = () => [
  { id: 'TRX-9981', from: 'Warehouse A', to: 'Store 12', amount: 4500, date: '2023-10-24', status: 'Completed' },
  { id: 'TRX-9982', from: 'Supplier X', to: 'Warehouse B', amount: 12000, date: '2023-10-25', status: 'Pending' },
  { id: 'TRX-9983', from: 'Warehouse C', to: 'Store 05', amount: 800, date: '2023-10-25', status: 'Processing' },
  { id: 'TRX-9984', from: 'Store 02', to: 'Repair Center', amount: 0, date: '2023-10-26', status: 'Failed' },
  { id: 'TRX-9985', from: 'Main Vault', to: 'R&D Dept', amount: 250000, date: '2023-10-27', status: 'Completed' },
];

export const MOCK_DB: Database = {
  sales: {
    name: 'sales',
    label: 'Sales Performance',
    columns: ['month', 'revenue', 'profit', 'units', 'customer_sat'],
    data: generateSalesData(),
  },
  inventory: {
    name: 'inventory',
    label: 'Inventory Levels',
    columns: ['product', 'stock', 'category', 'status', 'price'],
    data: generateInventory(),
  },
  transfers: {
    name: 'transfers',
    label: 'Fund Transfers',
    columns: ['id', 'from', 'to', 'amount', 'date', 'status'],
    data: generateTransfers(),
  },
};

// One of every type (excluding stat widgets - those should be user-created)
export const INITIAL_WIDGETS: WidgetConfig[] = [
  {
    id: 'w-line',
    type: 'line',
    title: 'Revenue Trends',
    dataSource: 'sales',
    settings: { xAxisKey: 'month', yAxisKey: 'revenue', color: '#8b5cf6' },
    gridSpan: 2,
  },
  {
    id: 'w-bar',
    type: 'bar',
    title: 'Monthly Units Sold',
    dataSource: 'sales',
    settings: { xAxisKey: 'month', yAxisKey: 'units', color: '#ec4899' },
    gridSpan: 1,
  },
  {
    id: 'w-area',
    type: 'area',
    title: 'Net Profit Growth',
    dataSource: 'sales',
    settings: { xAxisKey: 'month', yAxisKey: 'profit', color: '#06b6d4' },
    gridSpan: 1,
  },
  {
    id: 'w-donut',
    type: 'donut',
    title: 'Stock by Product',
    dataSource: 'inventory',
    settings: { xAxisKey: 'product', yAxisKey: 'stock' },
    gridSpan: 1,
  },
  {
    id: 'w-pie',
    type: 'pie',
    title: 'Revenue Share',
    dataSource: 'sales',
    settings: { xAxisKey: 'month', yAxisKey: 'revenue' },
    gridSpan: 1,
  },
  {
    id: 'w-scatter',
    type: 'scatter',
    title: 'Profit vs. Satisfaction',
    dataSource: 'sales',
    settings: { xAxisKey: 'customer_sat', yAxisKey: 'profit', color: '#f59e0b' },
    gridSpan: 1,
  },
  {
    id: 'w-spark',
    type: 'sparkline',
    title: 'Quick Trends (Units)',
    dataSource: 'sales',
    settings: { yAxisKey: 'units', color: '#6366f1' },
    gridSpan: 1,
  },
  {
    id: 'w-list',
    type: 'list',
    title: 'Product Catalog',
    dataSource: 'inventory',
    settings: { dataKeys: ['product', 'category', 'price'] },
    gridSpan: 1,
  },
  {
    id: 'w-transfers',
    type: 'transfers',
    title: 'Recent Transfers',
    dataSource: 'transfers',
    settings: {},
    gridSpan: 1,
  },
  {
    id: 'w-lowstock',
    type: 'lowStock',
    title: 'Critical Alerts',
    dataSource: 'inventory',
    settings: {},
    gridSpan: 1,
  },
];

export const CHART_TYPES = [
  { type: 'stat', label: 'Stat Card', icon: 'Calculator' },
  { type: 'line', label: 'Line Chart', icon: 'ChartLine' },
  { type: 'bar', label: 'Bar Chart', icon: 'BarChart3' },
  { type: 'area', label: 'Area Chart', icon: 'AreaChart' },
  { type: 'pie', label: 'Pie Chart', icon: 'PieChart' },
  { type: 'donut', label: 'Donut Chart', icon: 'CircleDot' },
  { type: 'scatter', label: 'Scatter Plot', icon: 'ScatterChart' },
  { type: 'sparkline', label: 'Sparkline', icon: 'Activity' },
  { type: 'list', label: 'Custom List', icon: 'List' },
  { type: 'lowStock', label: 'Low Stock Alerts', icon: 'AlertTriangle' },
  { type: 'transfers', label: 'Latest Transfers', icon: 'ArrowRightLeft' },
  { type: 'latestOperations', label: 'Latest Operations', icon: 'Activity' },
];