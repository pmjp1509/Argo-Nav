import type { LucideIcon } from 'lucide-react';

import { Card } from './card';
import { Skeleton } from './skeleton';

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  loading,
}: {
  label: string;
  value?: string | number;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="grid size-8 place-items-center rounded-md bg-primary/12 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value ?? '—'}</div>
      )}
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
