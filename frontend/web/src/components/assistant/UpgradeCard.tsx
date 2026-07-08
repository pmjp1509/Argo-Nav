import { Check, Sparkles, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/** UI-only upgrade placeholder shown when free AI credits are exhausted.
 *  No payments are wired up. */
export function UpgradeCard() {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
          <Zap className="size-4" />
        </div>
        <div className="text-sm font-semibold">Upgrade for more AI</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border bg-card p-2.5">
          <div className="text-xs font-medium text-muted-foreground">Free</div>
          <div className="mt-0.5 text-lg font-semibold">$0</div>
          <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
            <li className="flex gap-1"><Check className="size-3 text-success" /> Limited daily queries</li>
            <li className="flex gap-1"><Check className="size-3 text-success" /> Map & data explorer</li>
          </ul>
        </div>
        <div className="rounded-md border border-primary/40 bg-primary/10 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary">Pro</span>
            <Badge variant="primary">Popular</Badge>
          </div>
          <div className="mt-0.5 text-lg font-semibold">
            $20<span className="text-xs font-normal text-muted-foreground">/mo</span>
          </div>
          <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
            <li className="flex gap-1"><Check className="size-3 text-primary" /> Higher AI limits</li>
            <li className="flex gap-1"><Check className="size-3 text-primary" /> Priority models</li>
          </ul>
        </div>
      </div>

      <Button size="sm" className="mt-3 w-full" onClick={() => alert('Payments are not enabled in this demo.')}>
        <Sparkles className="size-4" /> Upgrade to Pro
      </Button>
    </div>
  );
}
