import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3, BookOpen, Database, Map as MapIcon, Search, Trash2, Waves, type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import { AuthPrompt } from '@/components/auth/AuthPrompt';
import { Button } from '@/components/ui/button';
import { CenterSpinner, EmptyState } from '@/components/ui/states';
import {
  clearConversations, deleteConversation, listConversations, type Conversation, type ConversationKind,
} from '@/lib/conversations';
import { formatDate } from '@/lib/utils';
import { isAuthEnabled, useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

const KIND_ICON: Record<ConversationKind, LucideIcon> = {
  sql: Database,
  knowledge: BookOpen,
  map: MapIcon,
  profile: Waves,
  analytics: BarChart3,
};

export function HistoryView({ onSelect, onGuest }: { onSelect: (c: Conversation) => void; onGuest?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', search],
    queryFn: () => listConversations(search),
    enabled: !!user,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['conversations'] });

  if (!isAuthEnabled || !user) {
    return (
      <div className="p-4">
        <AuthPrompt title="Sign in to view your history" onGuest={onGuest} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {data && data.length > 0 && (
          <Button
            variant={confirmClear ? 'danger' : 'ghost'}
            size="sm"
            onClick={async () => {
              if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
              await clearConversations();
              toast.success('History cleared.');
              setConfirmClear(false);
              refresh();
            }}
          >
            {confirmClear ? 'Confirm clear' : 'Clear all'}
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {isLoading ? (
          <CenterSpinner />
        ) : !data?.length ? (
          <EmptyState title="No conversations yet" hint="Ask the assistant something to start your history." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {data.map((c) => {
              const Icon = KIND_ICON[c.kind] ?? Database;
              return (
                <div
                  key={c.id}
                  className="group flex items-start gap-2.5 rounded-md border border-border bg-card p-2.5 hover:border-primary/40"
                >
                  <button onClick={() => onSelect(c)} className="flex flex-1 items-start gap-2.5 text-left">
                    <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded bg-muted text-muted-foreground">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.title || c.prompt}</div>
                      <div className="text-[11px] text-muted-foreground">{formatDate(c.created_at)}</div>
                    </div>
                  </button>
                  <button
                    onClick={async () => { await deleteConversation(c.id); toast.info('Conversation deleted.'); refresh(); }}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
