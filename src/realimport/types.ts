/** Wire types of the real-import spike API (`/api/v1/ri/*`). Decimals travel as strings (exact). */

export type BatchStatus = 'inspected' | 'validated' | 'confirmed' | 'failed';
export type DataOrigin = 'synthetic' | 'real';

export interface SheetStats {
  sheet: string;
  rows_read: number;
  valid: number;
  rejected: number;
  rejected_by_code: Record<string, number>;
  distinct_keys: number;
  duplicate_keys: number;
  duplicate_key_rows: number;
  gross_cartons: string;
  net_cartons: string;
  invoice_count: number;
  by_brand: Record<string, { rows: number; net: string }>;
}

export interface BatchCounts {
  sheets?: Record<string, SheetStats>;
  roster?: { rows: number; assignments: number; employees: number; employees_with_multiple_assignments: number; without_employee: number };
  targets?: { rows: number; targets: number; references: number };
  issues?: Record<string, number>;
  error?: string;
}

export interface RiBatch {
  id: string;
  workbook: { id: string; file_name: string; sha256: string; size_bytes: number };
  period: { calendar: 'jalali'; year: number; month: number; label: string };
  config: { period: { year: number; month: number }; sheets: Record<string, string>; carton_basis: string; duplicate_key_policy: string };
  status: BatchStatus;
  data_origin: DataOrigin;
  counts: BatchCounts;
  created_at: string;
  validated_at: string | null;
  confirmed_at: string | null;
}

export interface Inspection {
  sheets: { name: string; state: string; rows: number; columns: number }[];
  roles: Record<string, { sheet: string; found: boolean; columns_found: string[]; columns_missing: string[] }>;
  problems: string[];
  data_origin: DataOrigin;
}

export interface RiMeta {
  enabled: boolean;
  notice: string;
  status_legend: Record<string, string>;
  max_upload_mb: number;
}

export interface UploadResult {
  workbook: { id: string; file_name: string; sha256: string };
  batch: RiBatch;
  replayed: boolean;
}

export interface PreviewRow {
  row_number: number;
  source_sheet: string;
  branch: string;
  sales_line: string;
  brand: string;
  sku: string;
  customer: string;
  visitor: string;
  gross_cartons: string | null;
  net_cartons: string | null;
  invoice_count: number | null;
  flags: string[];
}

export interface Preview {
  batch?: RiBatch;
  status: BatchStatus;
  basis_sheet?: string;
  valid_rows: PreviewRow[];
  rejected_rows: { row_number: number; source_sheet: string; errors: { code: string; label: string }[] }[];
  issues: { type: string; label: string; severity: 'info' | 'warning' | 'error'; entities: number }[];
}

export interface MappingIssue {
  type: string;
  label: string;
  severity: 'info' | 'warning' | 'error';
  entity: string;
  detail: Record<string, unknown>;
  status: string;
}

export interface Mappings {
  status_note: string;
  issues: MappingIssue[];
  branch_group_schemes: { code: string; title: string; source: string; status: string; members: { branch: string; group: string }[] }[];
  customer_groups: { source_value: string; main_group: string | null; mapping_status: string }[];
  assignments: { visitor: string; employee: string | null; seller_type: string | null; branch: string | null; sales_line: string | null }[];
  roster: BatchCounts['roster'];
}

export interface Rule {
  id: number;
  code: string;
  version: number;
  rule_type: string;
  org_level: string;
  brand: string;
  params: { thresholds: string[]; [k: string]: unknown };
  status: 'PROPOSED' | 'UNCONFIRMED';
  notes: string | null;
}

export interface Run {
  id: string;
  batch_id: string;
  brand: string;
  org_level: string;
  input_basis: string;
  status: string;
  created_at: string;
  result_count: number;
  error_count: number;
  rule: { id: number; code: string; version: number; status: string };
  totals: { input_cartons: string; target_cartons: string; indicative_reward_rials: string };
}

export interface CalcResult {
  id: number;
  run_id: string;
  import_batch_id: string;
  rule_set_id: number;
  rule_version: number;
  brand: string;
  period: { calendar: string; year: number; month: number };
  org_level: string;
  entity: string;
  entity_key: string;
  input_quantity: string;
  target: string | null;
  achievement: string | null;
  reward_rials: string | null;
  rule_status: string;
  result_status: 'ok' | 'error';
  error: string | null;
  calculated_at: string;
  explain: Record<string, unknown>;
}

export interface Check {
  check_code: string;
  run_id: string | null;
  title: string;
  reference_value: string | null;
  prototype_value: string | null;
  abs_variance: string | null;
  pct_variance: string | null;
  matched: number | null;
  missing: number | null;
  duplicates: number | null;
  unresolved: number | null;
  status: 'match' | 'explained' | 'warning' | 'error';
  explanation: string;
  detail: Record<string, unknown>;
}

export interface TraceInputs {
  result_id: number;
  run_id: string;
  import_batch_id: string;
  rule: { code: string; version: number; status: string };
  total: number;
  limit: number;
  offset: number;
  inputs: { fact_id: number; source_sheet: string; row_number: number; branch: string; sales_line: string; sku: string; customer: string; visitor: string; gross_cartons: string | null; net_cartons: string | null; duplicate_ordinal: number; flags: string[] }[];
}

export interface Decision {
  id: string;
  question: string;
  assumption: string | null;
  impact: string;
  status: string;
  approver: string;
}

export interface Summary {
  batch: RiBatch;
  basis: string;
  brands: { brand: string; rows: number; net_cartons: string; levels: { org_level: string; run_id: string; rule: Run['rule']; results: number; errors: number; input_cartons: string; target_cartons: string; indicative_reward_rials: string }[] }[];
  issues: Record<string, number>;
  notice: string;
}
