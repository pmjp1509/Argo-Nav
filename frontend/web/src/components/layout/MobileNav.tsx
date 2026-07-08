import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';

import { Logo } from '@/components/ui/Logo';
import { NAV_ITEMS } from '@/config/nav';
import { LAYER } from '@/lib/layers';
import { cn } from '@/lib/utils';

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          style={{ zIndex: LAYER.dialog }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="flex h-full w-64 flex-col border-r border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <Logo className="size-8 rounded-md" />
                <span className="text-sm font-semibold">ArgoDeep</span>
              </div>
              <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-0.5 p-3">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm',
                      isActive ? 'bg-primary/12 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50',
                    )
                  }
                >
                  <item.icon className="size-[18px]" /> {item.label}
                </NavLink>
              ))}
            </nav>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
