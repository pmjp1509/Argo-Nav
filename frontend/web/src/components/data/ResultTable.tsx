import { cn } from '@/lib/utils';

function cell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  return String(v);
}

/** Compact scrollable table for SQL/agent result rows. */
export function ResultTable({
  columns,
  rows,
  maxHeight = 260,
  onRowClick,
}: {
  columns?: string[];
  rows?: Record<string, unknown>[];
  maxHeight?: number;
  onRowClick?: (row: Record<string, unknown>) => void;
}) {
  if (!rows?.length) return null;
  const cols = columns?.length ? columns : Object.keys(rows[0]);

  return (
    <div className="overflow-auto rounded-md border border-border" style={{ maxHeight }}>
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-muted/70 backdrop-blur">
          <tr>
            {cols.map((c) => (
              <th key={c} className="whitespace-nowrap px-2.5 py-1.5 text-left font-medium text-muted-foreground">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn(
                'border-t border-border',
                onRowClick && 'cursor-pointer hover:bg-muted/40',
              )}
            >
              {cols.map((c) => (
                <td key={c} className="whitespace-nowrap px-2.5 py-1.5 tabular-nums">
                  {cell(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
