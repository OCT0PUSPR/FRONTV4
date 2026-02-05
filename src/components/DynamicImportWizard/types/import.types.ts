/**
 * TypeScript interfaces for Dynamic Import Wizard
 */

export type PatternType = 'hierarchical' | 'dual-column' | 'dual-column-parent' | 'dual-column-child' | 'flat';

export type FieldType = 'char' | 'text' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime' | 'many2one' | 'selection';

export type ImportStep = 'upload' | 'discovery' | 'configuration' | 'preview' | 'importing' | 'complete';

export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'error';

export interface DetectedColumn {
  name: string;
  sampleValues: any[];
}

export interface PatternDetails {
  idColumn?: string | null;
  parentIdColumn?: string | null;
  nameColumn?: string | null;
  hasParent?: boolean;
  parentNameColumn?: string;
  childIdColumn?: string | null;
  childNameColumn?: string;
  allColumns?: string[];
  // Dual-column split fields
  suggestedParentModel?: string;
  suggestedChildModel?: string;
  isParent?: boolean;
  isChild?: boolean;
  parentModelName?: string;
  childModelName?: string;
}

export type RelationSource = 'new' | 'existing';

export interface FieldConfiguration {
  excelColumn: string;
  odooFieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  required: boolean;
  relation?: string;
  relationSource?: RelationSource;
  relationField?: string; // Field to match against (defaults to 'id' if not set)
  selection?: [string, string][];
}

export interface SystemModel {
  model: string;
  name: string;
  fields?: SystemField[];
}

export interface SystemField {
  name: string;
  string: string;
  type: string;
}

export interface DualColumnConfig {
  parentIdColumn: string | null;
  parentNameColumn: string;
  childIdColumn: string | null;
  childNameColumn: string;
}

export interface DetectedSheet {
  sheetName: string;
  sourceSheetName?: string; // Actual Excel sheet name (for dual-column splits)
  displayName?: string; // Display name for UI
  recordCount: number;
  columns: DetectedColumn[];
  pattern: PatternType;
  patternDetails: PatternDetails;
  suggestedModelName: string;
  fields: FieldConfiguration[];
  sampleData: Record<string, any>[];
  selected: boolean;
  // Dual-column split indicators
  isDualColumnParent?: boolean;
  isDualColumnChild?: boolean;
  parentSheetRef?: string; // For child, reference to parent sheet
}

export interface ModelConfiguration {
  sheetName: string;
  sourceSheetName?: string; // Actual Excel sheet name (for dual-column splits)
  modelName: string;
  modelLabel: string;
  description?: string;
  fields: FieldConfiguration[];
  parentField?: string;
  isDualColumn: boolean;
  dualColumnConfig?: DualColumnConfig;
  // New dual-column split fields
  pattern?: PatternType;
  patternDetails?: PatternDetails;
  isDualColumnParent?: boolean;
  isDualColumnChild?: boolean;
  // Existing model support
  useExistingModel?: boolean; // If true, modelName is an existing system model
}

export interface FileAnalysis {
  fileName: string;
  sheetsCount: number;
  sheets: DetectedSheet[];
}

export interface ValidationResult {
  sheetName: string;
  modelName: string;
  valid: boolean;
  errors: string[];
}

export interface StepProgress {
  status: StepStatus;
  current: number;
  total: number;
  created?: number;
  existing?: number;
  label?: string;
  phase?: string;
}

export interface ModelImportResult {
  modelName: string;
  modelCreated: boolean;
  fieldsCreated: number;
  recordsCreated: number;
  recordsExisting: number;
  errors: { phase?: string; field?: string; row?: number; error: string }[];
}

export interface ImportSummary {
  modelsCreated: number;
  modelsExisting: number;
  fieldsCreated: number;
  recordsCreated: number;
  recordsExisting: number;
  totalErrors: number;
}

export interface ImportResults {
  success: boolean;
  models: Record<string, ModelImportResult>;
  summary: ImportSummary;
  errors: { phase: string; error: string }[];
  duration: number;
}

export interface WizardState {
  step: ImportStep;
  file: File | null;
  filePath: string;
  analysis: FileAnalysis | null;
  selectedSheets: string[];
  configurations: ModelConfiguration[];
  stepProgress: Record<string, StepProgress>;
  results: ImportResults | null;
  error: string | null;
  isLoading: boolean;
}

export interface DynamicImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

// Color palette for UI
export const IMPORT_COLORS = {
  primary: '#3b82f6',  // Action color (blue) - not red
  success: '#16a34a',
  error: '#dc2626',
  warning: '#f59e0b',
  info: '#0891b2',
  models: '#8b5cf6',
  fields: '#0284c7',
  data: '#059669',
  pending: '#64748b',
};

// Field type options for dropdown
export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'char', label: 'Text (Short)' },
  { value: 'text', label: 'Text (Long)' },
  { value: 'integer', label: 'Integer' },
  { value: 'float', label: 'Decimal' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'many2one', label: 'Reference' },
  { value: 'selection', label: 'Selection' },
];

// Pattern descriptions
export const PATTERN_DESCRIPTIONS: Record<PatternType, string> = {
  'hierarchical': 'Parent-child hierarchy (e.g., Brand, Manufacturer, Model)',
  'dual-column': 'Two-level structure (e.g., Category-SubCategory)',
  'dual-column-parent': 'Parent model (distinct values extracted)',
  'dual-column-child': 'Child model (with reference to parent)',
  'flat': 'Simple list without hierarchy',
};
