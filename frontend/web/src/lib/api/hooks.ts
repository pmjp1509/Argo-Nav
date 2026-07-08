/** React Query hooks — one per backend endpoint. Strongly typed, cached, retried. */
import { useMutation, useQuery } from '@tanstack/react-query';

import { api, qs } from './client';
import type {
  AgentResponse, CoverageStats, DepthResult, FloatDetail, FloatFilters, FloatList,
  KnowledgeDoc, LogEntry, OverviewStats, ParamStats, SchemaInfo, SqlRunResult, TrajectoryPoint,
} from './types';

// ---- AI agent ----
export function useAsk() {
  return useMutation<AgentResponse, Error, string>({
    mutationFn: (query: string) => api.post<AgentResponse>('/ask', { query }),
  });
}

// ---- Floats ----
export function useFloats(filters: FloatFilters = {}) {
  return useQuery({
    queryKey: ['floats', filters],
    queryFn: () => api.get<FloatList>(`/floats${qs(filters as Record<string, unknown>)}`),
    staleTime: 60_000,
  });
}
export function useFloat(id?: string) {
  return useQuery({
    queryKey: ['float', id],
    queryFn: () => api.get<FloatDetail>(`/floats/${id}`),
    enabled: !!id,
  });
}
export function useTrajectory(id?: string) {
  return useQuery({
    queryKey: ['trajectory', id],
    queryFn: () => api.get<TrajectoryPoint[]>(`/floats/${id}/trajectory`),
    enabled: !!id,
  });
}
export function useParamStats(id?: string, parameter = 'TEMP') {
  return useQuery({
    queryKey: ['param-stats', id, parameter],
    queryFn: () => api.get<ParamStats>(`/floats/${id}/param-stats${qs({ parameter })}`),
    enabled: !!id,
  });
}
export function useDepth(id?: string, cycle?: number, parameters = 'TEMP,PSAL') {
  return useQuery({
    queryKey: ['depth', id, cycle, parameters],
    queryFn: () => api.get<DepthResult>(`/floats/${id}/depth${qs({ cycle, parameters })}`),
    enabled: !!id,
  });
}

// ---- Knowledge ----
export function useKnowledge(query?: string) {
  return useQuery({
    queryKey: ['knowledge', query ?? ''],
    queryFn: () => api.get<KnowledgeDoc[]>(`/knowledge${qs({ q: query, limit: 100 })}`),
    staleTime: 120_000,
  });
}

// ---- Stats ----
export function useOverview() {
  return useQuery({ queryKey: ['overview'], queryFn: () => api.get<OverviewStats>('/stats/overview') });
}
export function useCoverage() {
  return useQuery({ queryKey: ['coverage'], queryFn: () => api.get<CoverageStats>('/stats/coverage') });
}

// ---- SQL playground ----
export function useSqlRun() {
  return useMutation<SqlRunResult, Error, string>({
    mutationFn: (sql: string) => api.post<SqlRunResult>('/sql/run', { sql }),
  });
}
export function useSchema() {
  return useQuery({ queryKey: ['schema'], queryFn: () => api.get<SchemaInfo>('/schema'), staleTime: 300_000 });
}

// ---- Monitor ----
export function useLogs(limit = 100) {
  return useQuery({ queryKey: ['logs', limit], queryFn: () => api.get<LogEntry[]>(`/logs${qs({ limit })}`) });
}
export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: () => api.get<{ status: string }>('/health'), refetchInterval: 30_000 });
}
