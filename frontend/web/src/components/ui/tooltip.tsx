import type { ReactNode } from 'react';

import { LAYER } from '@/lib/layers';
import { cn } from '@/lib/utils';

/** Lightweight CSS hover tooltip (used for the collapsed sidebar). */
export function Tooltip({ label, side = 'right', children }: { label: string; side?: 'right' | 'top'; children: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        style={{ zIndex: LAYER.tooltip }}
        className={cn(
          'pointer-events-none absolute whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover/tip:opacity-100',
          side === 'right' ? 'left-full top-1/2 ml-2 -translate-y-1/2' : 'bottom-full left-1/2 mb-2 -translate-x-1/2',
        )}
      >
        {label}
      </span>
    </span>
  );
}
