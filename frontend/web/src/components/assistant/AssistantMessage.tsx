import { AlertTriangle, BookText, Wrench } from 'lucide-react';

import { ChartRenderer } from '@/components/charts/ChartRenderer';
import { ResultTable } from '@/components/data/ResultTable';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/states';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import type { ChatMessage } from '@/store/appStore';
import { SqlViewer } from './SqlViewer';
import { UpgradeCard } from './UpgradeCard';

function ConfidenceBadge({ value }: { value?: number | null }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  const variant = value >= 0.7 ? 'success' : value >= 0.45 ? 'warning' : 'danger';
  return <Badge variant={variant}>{pct}% confidence</Badge>;
}

export function AssistantMessage({ msg, onFollowUp }: { msg: ChatMessage; onFollowUp: (q: string) => void }) {
  const selectFloat = useAppStore((s) => s.selectFloat);
  const setHighlighted = useAppStore((s) => s.setHighlighted);

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Thinking…
      </div>
    );
  }

  // Error state — friendly message only; never the raw backend/provider error.
  if (msg.error) {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-2.5 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {msg.error}
        </div>
        {msg.errorKind === 'credits' && <UpgradeCard />}
      </div>
    );
  }

  const r = msg.response;
  return (
    <div className="flex flex-col gap-2.5">
      {msg.content && (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{msg.content}</div>
      )}

      {r && (
        <>
          {(r.confidence != null || r.tools_used?.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <ConfidenceBadge value={r.confidence} />
              {r.tools_used?.map((t, i) => (
                <Badge key={`${t}-${i}`} variant="outline">
                  <Wrench className="size-3" /> {t}
                </Badge>
              ))}
            </div>
          )}

          {r.warnings?.length > 0 && (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
              {r.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {w}
                </div>
              ))}
            </div>
          )}

          {r.chart_data && (
            <div className="rounded-md border border-border bg-card p-2">
              <ChartRenderer spec={r.chart_data} height={220} />
            </div>
          )}

          {r.data_preview?.rows?.length ? (
            <ResultTable
              columns={r.data_preview.columns}
              rows={r.data_preview.rows}
              onRowClick={(row) => {
                const id = (row.platform_number ?? row.float_id) as string | undefined;
                if (id) selectFloat(String(id));
              }}
            />
          ) : null}

          {r.sql && <SqlViewer sql={r.sql} />}

          {r.float_ids?.length > 0 && (
            <button
              onClick={() => setHighlighted(r.float_ids, true)}
              className="self-start text-xs text-primary hover:underline"
            >
              Highlight {r.float_ids.length} float{r.float_ids.length > 1 ? 's' : ''} on map →
            </button>
          )}

          {r.sources?.length > 0 && (
            <div className="rounded-md border border-border bg-muted/30 p-2">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <BookText className="size-3" /> Sources
              </div>
              <div className="flex flex-col gap-1">
                {r.sources.map((s, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium text-foreground">{s.title}</span>
                    {s.snippet && <span className="text-muted-foreground"> — {s.snippet}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {r.follow_ups?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {r.follow_ups.map((f, i) => (
                <button
                  key={i}
                  onClick={() => onFollowUp(f)}
                  className={cn(
                    'rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground',
                    'hover:border-primary/50 hover:text-foreground transition-colors',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
