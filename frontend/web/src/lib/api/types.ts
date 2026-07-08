/**
 * TypeScript mirror of the backend contracts (backend/app/models/*).
 * Single source of truth for the frontend — no duplicated logic, just shapes.
 */

// ---- AI agent (POST /ask) ----
export interface ChartPoint {
  x: number;
  y: number;
  [k: string]: number | string | boolean | undefined;
}
export interface ChartSeries {
  label: string;
  points: ChartPoint[];
  param?: string;
  cycle?: number;
  qc_flagged?: boolean;
}
export type ChartKind = 'profile_line' | 'depth_temp' | 'by_float_bar' | 'timeseries' | 'map';
export interface ChartSpec {
  kind: ChartKind;
  title: string;
  x_label?: string;
  y_label?: string;
  series: ChartSeries[];
  meta?: Record<string, unknown>;
}
export interface Citation {
  doc_id: number | string;
  title: string;
  source?: string | null;
  snippet?: string | null;
}
export interface DataPreview {
  columns?: string[];
  rows?: Record<string, unknown>[];
  row_count?: number;
  profiles?: Record<string, unknown>;
}
export interface AgentResponse {
  context: string;
  sql?: string | null;
  refined_query?: string | null;
  data_preview?: DataPreview | null;
  float_ids: string[];
  chart_data?: ChartSpec | null;
  sources: Citation[];
  confidence?: number | null;
  warnings: string[];
  follow_ups: string[];
  tools_used: string[];
  error_code?: string | null;
}

// ---- Floats ----
export interface FloatSummary {
  platform_number: string;
  latitude?: number | null;
  longitude?: number | null;
  float_type?: string | null;
  n_cycles?: number | null;
  is_active?: boolean | null;
  last_cycle_at?: string | null;
  deploy_date?: string | null;
}
export interface FloatList {
  items: FloatSummary[];
  total: number;
}
export interface FloatFilters {
  bbox?: string;
  float_type?: string;
  active?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}
export interface Cycle {
  cycle_number: number;
  juld?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  max_pres?: number | null;
  data_mode?: string | null;
}
export interface FloatDetail {
  float: Record<string, unknown> & { platform_number: string };
  cycles: Cycle[];
}
export interface TrajectoryPoint {
  cycle_number?: number | null;
  ts: string;
  latitude?: number | null;
  longitude?: number | null;
}
export interface ParamStatPoint {
  cycle_number: number;
  juld?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  mean_value?: number | null;
}
export interface ParamStats {
  parameter: string;
  points: ParamStatPoint[];
}
export interface DepthResult {
  float_id: string;
  cycles: number[];
  parameters: string[];
  summary: Record<string, Record<string, { n: number; min: number; max: number; mean: number }>>;
  warnings: string[];
  series: ChartSeries[];
  chart_spec: ChartSpec;
}

// ---- Knowledge / stats / sql / schema / logs ----
export interface KnowledgeDoc {
  id: number;
  source?: string | null;
  title: string;
  content: string;
  score?: number | null;
}
export interface OverviewStats {
  floats: number;
  profiles: number;
  bgc_floats: number;
  knowledge_docs: number;
  parquet_profiles: number;
  latest_cycle?: string | null;
}
export interface CoverageStats {
  by_month: { month: string; n: number }[];
  by_type: { float_type: string; n: number }[];
  by_param: { parameter: string; n: number }[];
}
export interface SqlRunResult {
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  truncated: boolean;
}
export interface SchemaColumn {
  name: string;
  type: string;
}
export interface SchemaInfo {
  schema: string;
  tables: { name: string; columns: SchemaColumn[] }[];
}
export type LogEntry = Record<string, unknown> & {
  id: number;
  nl_query: string;
  generated_sql?: string | null;
  status?: string | null;
  latency_ms?: number | null;
  created_at?: string | null;
};
