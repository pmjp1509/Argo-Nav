import { motion } from 'framer-motion';
import { ExternalLink, Sparkles, X } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/states';
import { useSendMessage } from '@/components/assistant/useAssistant';
import { useFloat, useParamStats } from '@/lib/api/hooks';
import { LAYER } from '@/lib/layers';
import { formatDate } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function FloatPanel({ id }: { id: string }) {
  const navigate = useNavigate();
  const selectFloat = useAppStore((s) => s.selectFloat);
  const send = useSendMessage();
  const { data, isLoading } = useFloat(id);
  const temp = useParamStats(id, 'TEMP');

  const f = data?.float as Record<string, unknown> | undefined;
  const spark = (temp.data?.points ?? []).map((p) => ({ y: p.mean_value ?? null }));

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ zIndex: LAYER.mapOverlay }}
      className="absolute left-3 top-3 w-72 rounded-lg border border-border bg-card/95 shadow-xl backdrop-blur"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">{id}</span>
          {f?.float_type ? <Badge variant="primary">{String(f.float_type)}</Badge> : null}
        </div>
        <button onClick={() => selectFloat(undefined)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-1.5 p-3">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Spinner /> Loading…
          </div>
        ) : (
          <>
            <Row label="Cycles" value={String(f?.n_cycles ?? '—')} />
            <Row label="PI" value={(f?.pi_name as string) || '—'} />
            <Row label="Deployed" value={formatDate(f?.deploy_date as string)} />
            <Row label="Last cycle" value={formatDate(f?.last_cycle_at as string)} />
            <Row label="Status" value={f?.is_active ? 'Active' : 'Inactive'} />

            {spark.length > 1 && (
              <div className="pt-1">
                <div className="mb-1 text-[11px] text-muted-foreground">Mean temperature over cycles</div>
                <ResponsiveContainer width="100%" height={44}>
                  <LineChart data={spark}>
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Line type="monotone" dataKey="y" stroke="#f59e0b" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1" onClick={() => navigate(`/floats/${id}`)}>
            <ExternalLink className="size-3.5" /> Details
          </Button>
          <Button size="sm" variant="outline" onClick={() => void send(`Tell me about float ${id}`)}>
            <Sparkles className="size-3.5" /> Ask AI
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
