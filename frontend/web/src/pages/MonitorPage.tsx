import { Activity, Clock, Cpu, Wrench } from 'lucide-react';
import { useMemo } from 'react';

import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, Spinner } from '@/components/ui/states';
import { StatCard } from '@/components/ui/StatCard';
import { useHealth, useLogs } from '@/lib/api/hooks';
import { formatDate } from '@/lib/utils';
import type { LogEntry } from '@/lib/api/types';

export function MonitorPage() {
  const health = useHealth();
  const { data: logs, isLoading } = useLogs(200);

  const stats = useMemo(() => {
    const rows = logs ?? [];
    const withLatency = rows.filter((r) => typeof r.latency_ms === 'number') as (LogEntry & { latency_ms: number })[];
    const avg = withLatency.length
      ? Math.round(withLatency.reduce((a, r) => a + r.latency_ms, 0) / withLatency.length)
      : undefined;
    const tools: Record<string, number> = {};
    rows.forEach((r) => (Array.isArray(r.tools_used) ? r.tools_used : []).forEach((t: string) => (tools[t] = (tools[t] ?? 0) + 1)));
    return { count: rows.length, avg, tools };
  }, [logs]);

  return (
    <Page title="System Monitor" description="Query logs, latency, tool usage, and provider status." wide>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="API status" value={health.data ? 'Online' : 'Offline'} icon={Activity} />
        <StatCard label="Logged queries" value={stats.count} icon={Cpu} loading={isLoading} />
        <StatCard label="Avg latency" value={stats.avg != null ? `${stats.avg} ms` : '—'} icon={Clock} loading={isLoading} />
        <StatCard label="Tools invoked" value={Object.values(stats.tools).reduce((a, b) => a + b, 0)} icon={Wrench} loading={isLoading} />
      </div>

      {Object.keys(stats.tools).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(stats.tools).map(([t, n]) => (
            <Badge key={t} variant="primary">
              <Wrench className="size-3" /> {t} · {n}
            </Badge>
          ))}
        </div>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent queries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Spinner /> Loading…
            </div>
          ) : !logs?.length ? (
            <EmptyState
              title="No query logs yet"
              hint="Run db/observability.sql and ask the assistant a few questions to populate this."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-3 font-medium">Query</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Latency</th>
                    <th className="py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="max-w-md truncate py-2 pr-3">{r.nl_query}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={r.status === 'ok' ? 'success' : r.status === 'error' ? 'danger' : 'warning'}>
                          {String(r.status ?? '—')}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{r.latency_ms != null ? `${r.latency_ms} ms` : '—'}</td>
                      <td className="py-2 text-muted-foreground">{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </Page>
  );
}
