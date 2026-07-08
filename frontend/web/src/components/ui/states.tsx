import { AlertTriangle, Inbox, Loader2, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} />;
}

export function CenterSpinner({ label }: { label?: string }) {
  return (
    <div className="grid h-full place-items-center p-8 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Spinner /> {label ?? 'Loading…'}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, hint }: { icon?: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="grid place-items-center gap-2 p-8 text-center">
      <Icon className="size-8 text-muted-foreground/50" />
      <div className="text-sm font-medium">{title}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="grid place-items-center gap-2 p-8 text-center">
      <AlertTriangle className="size-8 text-danger/70" />
      <div className="text-sm font-medium">Something went wrong</div>
      <div className="max-w-md text-xs text-muted-foreground">
        {message ?? 'Request failed. Is the backend running on the configured API base?'}
      </div>
    </div>
  );
}
