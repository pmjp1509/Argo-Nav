import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSendMessage } from '@/components/assistant/useAssistant';
import { NAV_ITEMS } from '@/config/nav';
import { LAYER } from '@/lib/layers';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const send = useSendMessage();
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const matches = useMemo(
    () => NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  function askAI() {
    const query = q.trim();
    onClose();
    if (query) void send(query);
    else setChatOpen(true);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={{ zIndex: LAYER.dialog }}
          className="fixed inset-0 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[12vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Sparkles className="size-4 text-primary" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') askAI();
                  if (e.key === 'Escape') onClose();
                }}
                placeholder="Ask the AI or jump to a page…"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              <button
                onClick={askAI}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted/60"
              >
                <Sparkles className="size-4 text-primary" />
                <span className="flex-1">
                  Ask AI{q && <span className="text-muted-foreground">: “{q}”</span>}
                </span>
                <CornerDownLeft className="size-3.5 text-muted-foreground" />
              </button>

              {matches.length > 0 && (
                <div className="mt-1 px-3 pb-1 pt-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">
                  Pages
                </div>
              )}
              {matches.map((item) => (
                <button
                  key={item.to}
                  onClick={() => {
                    onClose();
                    navigate(item.to);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60',
                  )}
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
