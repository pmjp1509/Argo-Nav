import { ArrowLeft, History, Send, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { AssistantMessage } from './AssistantMessage';
import { HistoryView } from './HistoryView';
import { useRestoreConversation, useSendMessage } from './useAssistant';

const SUGGESTIONS = [
  'Show floats near India',
  'Highlight floats deployed after 2023',
  'Which float has the most cycles?',
  'What does DATA_MODE mean?',
];

/** Messages + welcome + input, with an in-place History view. Shared by the
 *  drawer and the full page. */
export function Conversation({ variant = 'drawer' }: { variant?: 'drawer' | 'page' }) {
  const messages = useAppStore((s) => s.messages);
  const send = useSendMessage();
  const restore = useRestoreConversation();
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const centered = variant === 'page';

  useEffect(() => {
    if (!showHistory) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showHistory]);

  const submit = () => {
    const q = input.trim();
    if (!q) return;
    setInput('');
    void send(q);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar: History <-> Back toggle (in-place, no route/modal) */}
      <div className="flex h-9 shrink-0 items-center justify-between px-3">
        {showHistory ? (
          <button onClick={() => setShowHistory(false)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to chat
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">{messages.length > 0 ? `${messages.filter((m) => m.role === 'user').length} messages` : ''}</span>
        )}
        {!showHistory && (
          <Tooltip label="History" side="top">
            <button onClick={() => setShowHistory(true)} className="text-muted-foreground hover:text-foreground" aria-label="History">
              <History className="size-4" />
            </button>
          </Tooltip>
        )}
      </div>

      {showHistory ? (
        <HistoryView
          onGuest={() => setShowHistory(false)}
          onSelect={(c) => {
            restore(c.prompt, c.response);
            setShowHistory(false);
          }}
        />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className={cn('flex flex-col gap-4 px-4 pb-4', centered && 'mx-auto w-full max-w-3xl py-2')}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                  <div className="grid size-12 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Ask about the ocean data</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Natural language → SQL, charts, map highlights, and cited answers.
                    </p>
                  </div>
                  <div className={cn('grid w-full gap-1.5', centered ? 'max-w-md grid-cols-2' : 'grid-cols-1')}>
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => void send(s)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => <AssistantMessage key={m.id} msg={m} onFollowUp={(q) => void send(q)} />)
              )}
              <div ref={endRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-border p-3">
            <div className={cn(centered && 'mx-auto w-full max-w-3xl')}>
              <div className="flex items-end gap-2 rounded-lg border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  placeholder="Ask anything…"
                  className="max-h-32 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button size="icon" onClick={submit} disabled={!input.trim()} aria-label="Send">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
