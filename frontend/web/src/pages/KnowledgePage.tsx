import { ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CenterSpinner, EmptyState } from '@/components/ui/states';
import { useKnowledge } from '@/lib/api/hooks';
import { cn } from '@/lib/utils';
import type { KnowledgeDoc } from '@/lib/api/types';

function Doc({ doc }: { doc: KnowledgeDoc }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30">
        <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
        <span className="flex-1 text-sm font-medium">{doc.title}</span>
        {doc.source && <Badge variant="outline">{doc.source}</Badge>}
        {doc.score != null && <Badge variant="primary">{doc.score.toFixed(2)}</Badge>}
      </button>
      {open && <div className="border-t border-border px-4 py-3 pl-11 text-sm leading-relaxed text-muted-foreground">{doc.content}</div>}
    </Card>
  );
}

export function KnowledgePage() {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const { data, isLoading } = useKnowledge(submitted || undefined);

  const grouped = useMemo(() => {
    const g: Record<string, KnowledgeDoc[]> = {};
    (data ?? []).forEach((d) => {
      (g[d.source ?? 'other'] ??= []).push(d);
    });
    return g;
  }, [data]);

  return (
    <Page title="Knowledge Base" description="Argo terminology, QC flags, variables, and schema documentation — hybrid-searchable.">
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSubmitted(q.trim())}
          placeholder="Search the knowledge base (semantic + keyword)…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {submitted && (
          <button onClick={() => { setQ(''); setSubmitted(''); }} className="text-xs text-muted-foreground hover:text-foreground">
            clear
          </button>
        )}
      </div>

      {isLoading ? (
        <CenterSpinner />
      ) : !data?.length ? (
        <EmptyState title="No documents found" hint="Try a different search term." />
      ) : submitted ? (
        <div className="flex flex-col gap-2">
          {data.map((d) => (
            <Doc key={d.id} doc={d} />
          ))}
        </div>
      ) : (
        Object.entries(grouped).map(([source, docs]) => (
          <div key={source} className="mb-5">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{source}</div>
            <div className="flex flex-col gap-2">
              {docs.map((d) => (
                <Doc key={d.id} doc={d} />
              ))}
            </div>
          </div>
        ))
      )}
    </Page>
  );
}
