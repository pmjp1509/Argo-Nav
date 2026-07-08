import { cn } from '@/lib/utils';

/** ArgoDeep brand mark. */
export function Logo({ className }: { className?: string }) {
  return <img src="/argo_logo.png" alt="ArgoDeep" className={cn('object-contain', className)} draggable={false} />;
}
