import {
  createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable, type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, MapPin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CenterSpinner, ErrorState } from '@/components/ui/states';
import { useFloats } from '@/lib/api/hooks';
import { formatDate } from '@/lib/utils';
import type { FloatSummary } from '@/lib/api/types';
import { useAppStore } from '@/store/appStore';

const col = createColumnHelper<FloatSummary>();

export function ExplorerPage() {
  const navigate = useNavigate();
  const selectFloat = useAppStore((s) => s.selectFloat);
  const setHighlighted = useAppStore((s) => s.setHighlighted);
  const { data, isLoading, isError } = useFloats({ limit: 5000 });

  const [sorting, setSorting] = useState<SortingState>([{ id: 'n_cycles', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(
    () => [
      col.accessor('platform_number', { header: 'Float', cell: (c) => <span className="font-mono">{c.getValue()}</span> }),
      col.accessor('float_type', { header: 'Type', cell: (c) => <Badge variant={c.getValue() === 'bgc' ? 'primary' : 'outline'}>{c.getValue() ?? 'core'}</Badge> }),
      col.accessor('n_cycles', { header: 'Cycles', cell: (c) => <span className="tabular-nums">{c.getValue() ?? 0}</span> }),
      col.accessor('is_active', { header: 'Status', cell: (c) => (c.getValue() ? <Badge variant="success">active</Badge> : <Badge>inactive</Badge>) }),
      col.accessor('last_cycle_at', { header: 'Last cycle', cell: (c) => <span className="text-muted-foreground">{formatDate(c.getValue())}</span> }),
      col.accessor((r) => `${r.latitude?.toFixed(1) ?? '—'}, ${r.longitude?.toFixed(1) ?? '—'}`, { id: 'pos', header: 'Position' }),
    ],
    [],
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  if (isLoading) return <CenterSpinner />;
  if (isError || !data) return <ErrorState />;

  const highlightFiltered = () => {
    const ids = table.getFilteredRowModel().rows.map((r) => r.original.platform_number);
    setHighlighted(ids, true);
    navigate('/');
  };

  return (
    <Page
      title="Float Explorer"
      description={`${data.total} floats · click a row for details, or highlight the filtered set on the map.`}
      wide
      actions={
        <Button variant="outline" size="sm" onClick={highlightFiltered}>
          <MapPin className="size-4" /> Show on map
        </Button>
      }
    >
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Filter floats…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-2.5 text-left font-medium">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={h.column.getToggleSortingHandler()}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getCanSort() && <ArrowUpDown className="size-3 opacity-50" />}
                      </button>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => {
                    selectFloat(row.original.platform_number);
                    navigate(`/floats/${row.original.platform_number}`);
                  }}
                  className="cursor-pointer border-t border-border hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-4 py-2.5">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · {table.getFilteredRowModel().rows.length} floats
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </Page>
  );
}
