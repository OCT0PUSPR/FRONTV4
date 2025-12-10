export type WidgetType = 
  | 'line' 
  | 'bar' 
  | 'area' 
  | 'pie' 
  | 'donut' 
  | 'scatter' 
  | 'sparkline' 
  | 'list' 
  | 'lowStock' 
  | 'transfers'
  | 'stat'
  | 'statcardcount'
  | 'statcardsum'
  | 'statcardaverage'
  | 'statcardmin'
  | 'statcardmax'
  | 'latestOperations';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: string; // Table name
  settings: {
    xAxisKey?: string;
    yAxisKey?: string; // For charts or the main value for stat
    dataKeys?: string[]; // For lists (columns to show)
    color?: string;
    fill?: boolean;
    format?: 'currency' | 'number' | 'text';
    calculationType?: 'count' | 'sum' | 'average' | 'min' | 'max'; // For stat widgets
    aggregateType?: 'count' | 'sum' | 'average' | 'min' | 'max'; // For charts
    operationType?: 'latestTransfers' | 'latestActivities' | 'suppliers' | 'lowStock'; // For latestOperations widget
  };
  gridSpan: number; // 1 (half) or 2 (full width)
}

export interface TableSchema {
  name: string;
  label: string;
  columns: string[];
  data: any[];
}

export interface Database {
  [key: string]: TableSchema;
}