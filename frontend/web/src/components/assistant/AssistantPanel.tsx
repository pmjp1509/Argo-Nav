import { AnimatePresence, motion } from 'framer-motion';
import { Bot, ChevronLeft, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { LAYER } from '@/lib/layers';
import { useAppStore } from '@/store/appStore';
import { Conversation } from './Conversation';

const NAVBAR_H = '3.5rem'; // h-14

export function AssistantPanel() {
  const open = useAppStore((s) => s.chatOpen);
  const setOpen = useAppStore((s) => s.setChatOpen);
  const messages = useAppStore((s) => s.messages);
  const clear = useAppStore((s) => s.clearChat);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const onFullPage = pathname.startsWith('/assistant');

  // Portaled to <body> so no page (Leaflet, transforms) can affect it, but it
  // starts BELOW the navbar so the top navigation always stays visible.
  return createPortal(
    <AnimatePresence>
      {open && !onFullPage && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{ top: NAVBAR_H, zIndex: LAYER.drawer }}
          className="fixed bottom-0 right-0 flex w-full flex-col border-l border-border bg-card shadow-2xl sm:w-[420px]"
        >
          {/* Vertically-centered floating handle on the LEFT edge → full page (#4) */}
          <button
            onClick={() => { setOpen(false); navigate('/assistant'); }}
            aria-label="Open full assistant"
            title="Open full assistant"
            className="group absolute left-0 top-1/2 flex h-14 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          </button>

          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
                <Bot className="size-4" />
              </div>
              <div className="text-sm font-semibold">AI Assistant</div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="icon" onClick={clear} aria-label="Clear conversation">
                  <Trash2 className="size-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1">
            <Conversation variant="drawer" />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body,
  );
}
