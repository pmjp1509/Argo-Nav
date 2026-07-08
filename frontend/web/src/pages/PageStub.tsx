import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export function PageStub({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="grid h-full place-items-center p-8"
    >
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-xl bg-primary/12 text-primary">
          <Icon className="size-7" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        <p className="mt-4 text-xs text-muted-foreground/70">Building this page next.</p>
      </div>
    </motion.div>
  );
}
