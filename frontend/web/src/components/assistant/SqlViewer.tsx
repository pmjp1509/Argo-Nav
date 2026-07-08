import { Check, ChevronRight, Code2, Copy } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export function SqlViewer({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/30">
      <div className="flex items-center">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
          <Code2 className="size-3.5" /> Generated SQL
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(sql);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Copy SQL"
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      {open && (
        <pre className="max-h-56 overflow-auto border-t border-border bg-background/50 p-2.5 text-[11px] leading-relaxed text-foreground">
          <code className="font-mono">{sql}</code>
        </pre>
      )}
    </div>
  );
}
