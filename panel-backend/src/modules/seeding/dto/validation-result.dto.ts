export interface ValidationError {
  row: number;
  field?: string;
  value?: any;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  warnings?: string[];
}

export interface SeedingResult extends ValidationResult {
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
}
