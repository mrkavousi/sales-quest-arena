/** Wire types of the Kiloos demo API (see comu-center/app/api_demo.py). All data is DEMO/SAMPLE. */

export type Position = 'admin' | 'management' | 'branch_manager' | 'supervisor' | 'rep' | 'staff';

export interface SessionUser {
  id: string;
  name: string;
  role: 'visitor' | 'operator' | 'admin';
  position: Position;
  title: string;
  employee_code: string | null;
  branch_code: string | null;
  branch_name: string | null;
  experience: 'game' | 'management';
}

export interface DemoUser extends SessionUser {}

export interface BrandStat {
  brand: string;
  name?: string;
  amount: number;
  quantity: number;
  records?: number;
  target: number;
  attainment_pct: number | null;
}

export interface GameStatus {
  started: boolean;
  xp: number;
  coins: number;
  level: number;
  level_title: string;
  streak: number;
  missions_completed: number;
  achievements: number;
}

export interface RepRow {
  id: string;
  name: string;
  employee_code: string;
  branch_code: string;
  branch_name: string | null;
  supervisor: string | null;
  supervisor_id: string | null;
  amount: number;
  target: number;
  attainment_pct: number | null;
  brands: { brand: string; amount: number; quantity: number; target: number; attainment_pct: number | null }[];
  org_points: number;
  game: GameStatus;
}

export interface Rollup {
  amount: number;
  target: number;
  attainment_pct: number | null;
  reps: number;
  org_points: number;
  game_xp: number;
}

export interface OriginCounts {
  sample?: number;
  imported?: number;
}

export interface Overview {
  is_demo: boolean;
  notice: string;
  empty: boolean;
  viewer: SessionUser;
  periods: string[];
  period: string | null;
  filters: { brand: string | null; branch: string | null };
  last_import: { id: string; file_name: string; status: string; data_origin: string; created_at: string } | null;
  totals?: Rollup;
  brands: BrandStat[];
  branches: (Rollup & { code: string; name: string; manager: string | null })[];
  supervisors?: (Rollup & { id: string | null; name: string; branch_code: string | null })[];
  reps: RepRow[];
  gamification?: { players: number; total_xp: number; missions_completed: number; org_points: number };
  data_origin?: OriginCounts;
}

export interface BranchDetail {
  is_demo: boolean;
  period: string | null;
  branch: { code: string; name: string; manager: string | null };
  totals: Rollup;
  brands: BrandStat[];
  supervisors: (Rollup & { id: string | null; name: string; reps: RepRow[] })[];
  data_origin: OriginCounts;
}

export interface MissionGate {
  eligible: boolean;
  period: string | null;
  minPct: number;
  achieved?: number;
  target?: number;
  attainmentPct?: number | null;
  reason: string | null;
  status: string;
}

export interface RepDetail {
  is_demo: boolean;
  period: string | null;
  rep: RepRow;
  daily: { date: string; amount: number; by_brand: Record<string, number> }[];
  org_points: {
    total: number;
    by_source: Record<string, number>;
    recent: { id: string; source_type: string; rule_code: string; points: number; occurred_at: string; status: string }[];
  };
  rank: { position: number | null; of: number };
  mission_gate: MissionGate;
  data_origin: OriginCounts;
  viewer?: SessionUser;
}

export interface LeaderboardRow {
  rank: number;
  user_id: string;
  name: string;
  employee_code: string | null;
  branch_code: string | null;
  org_points: number;
  game_xp: number;
  level: number;
  is_me: boolean;
}

export interface Leaderboard {
  is_demo: boolean;
  competition: { title: string; starts_at: string; ends_at: string; is_sample: boolean } | null;
  rows: LeaderboardRow[];
  note: string;
}

export interface ImportRow {
  row_number: number;
  external_id: string;
  user_external_id: string;
  sale_date: string | null;
  brand_code: string | null;
  sku_code: string | null;
  quantity: string | null;
  amount: string | null;
  status: string;
  error_code: string | null;
  error: string | null;
}

export interface ImportSummary {
  id: string;
  file_name: string;
  status: 'validated' | 'processing' | 'completed' | 'rejected' | 'failed' | 'uploaded';
  data_origin: 'sample' | 'imported';
  is_sample: boolean;
  created_at: string;
  finished_at: string | null;
  can_process: boolean;
  counts: { total: number; valid: number; pending: number; processed: number; rejected: number; duplicates: number };
  totals: { amount: number; records: number };
  brands: { brand: string; amount: number; records: number }[];
  targets: { rows: number; valid: number; invalid: number };
  target_issues: { row_number: number; user_external_id: string; brand_code: string; period: string; error_message: string }[];
  reconciliation: { rows_ok: boolean; points_ok: boolean; scored_points: number; points_sum: number };
  problem_rows: ImportRow[];
  sample_rows: ImportRow[];
}

export interface ImportListItem {
  id: string;
  file_name: string;
  status: string;
  data_origin: string;
  is_sample: boolean;
  created_at: string;
  uploaded_by: string;
  counts: { total: number; processed: number; pending: number; rejected: number; duplicates: number };
}
