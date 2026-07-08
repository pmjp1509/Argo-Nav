import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { LAYER } from '@/lib/layers';
import { useToastStore, type ToastKind } from '@/store/toastStore';

const ICONS: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};
const COLORS: Record<ToastKind, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-primary',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return createPortal(
    <div className="fixed bottom-4 right-4 flex flex-col gap-2" style={{ zIndex: LAYER.toast }}>
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              className="flex w-80 items-start gap-2.5 rounded-lg border border-border bg-popover p-3 shadow-xl"
            >
              <Icon className={`mt-0.5 size-4 shrink-0 ${COLORS[t.kind]}`} />
              <div className="flex-1 text-sm text-popover-foreground">{t.message}</div>
              <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
