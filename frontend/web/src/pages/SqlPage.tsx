import { AlertTriangle, Play, Table2 } from 'lucide-react';
import { useState } from 'react';

import { Page } from '@/components/layout/Page';
import { ResultTable } from '@/components/data/ResultTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, Spinner } from '@/components/ui/states';
import { useSchema, useSqlRun } from '@/lib/api/hooks';

const EXAMPLES = [
  'SELECT platform_number, n_cycles FROM argo.floats ORDER BY n_cycles DESC LIMIT 10',
  "SELECT parameter, round(avg(mean_value)::numeric,2) AS avg FROM argo.profile_param_stats GROUP BY 1",
  'SELECT count(*) FROM argo.profiles WHERE juld >= \'2025-06-01\'',
];

export function SqlPage() {
  const [sql, setSql] = useState(EXAMPLES[0]);
  const run = useSqlRun();
  const schema = useSchema();

  return (
    <Page
      title="SQL Playground"
      description="Read-only, validated SQL against the argo schema. Non-SELECT statements are rejected."
      wide
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              spellCheck={false}
              rows={6}
              className="w-full resize-y bg-transparent p-4 font-mono text-sm outline-none"
            />
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((e, i) => (
                  <button
                    key={i}
                    onClick={() => setSql(e)}
                    className="rounded border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Example {i + 1}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={() => run.mutate(sql)} disabled={run.isPending}>
                {run.isPending ? <Spinner /> : <Play className="size-4" />} Run
              </Button>
            </div>
          </Card>

          {run.isError && (
            <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {(run.error as Error).message}
            </div>
          )}

          {run.data && (
            <Card className="p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="success">{run.data.row_count} rows</Badge>
                {run.data.truncated && <Badge variant="warning">truncated</Badge>}
              </div>
              <ResultTable columns={run.data.columns} rows={run.data.rows} maxHeight={440} />
            </Card>
          )}

          {!run.data && !run.isError && !run.isPending && (
            <EmptyState icon={Table2} title="Run a query to see results" hint="Pick an example or write your own SELECT." />
          )}
        </div>

        <Card className="h-fit">
          <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Schema
          </div>
          <div className="max-h-[520px] overflow-y-auto p-2">
            {schema.data?.tables.map((t) => (
              <details key={t.name} className="mb-1">
                <summary className="cursor-pointer rounded px-2 py-1 font-mono text-xs hover:bg-muted/40">
                  {t.name}
                </summary>
                <div className="pl-4 pt-1">
                  {t.columns.map((c) => (
                    <div key={c.name} className="flex justify-between py-0.5 text-[11px]">
                      <span className="font-mono">{c.name}</span>
                      <span className="text-muted-foreground">{c.type}</span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}
