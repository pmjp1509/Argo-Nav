import type { ReactNode } from 'react';

export function Page({
  title,
  description,
  actions,
  children,
  wide,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className={`mx-auto ${wide ? 'max-w-[1600px]' : 'max-w-7xl'} p-6`}>
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
        {children}
      </div>
    </div>
  );
}
