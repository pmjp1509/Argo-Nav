import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';

const BENEFITS = [
  'Save conversation history',
  'Access previous AI conversations',
  'Sync across devices',
  'Future premium features',
];

/** Shown when a guest opens a feature that needs an account (history, profile).
 *  Guests are never forced to sign in for normal browsing. */
export function AuthPrompt({ title = 'Sign in to unlock this feature', onGuest }: { title?: string; onGuest?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <Logo className="mx-auto mb-3 size-12 rounded-xl" />
      <h3 className="text-base font-semibold">{title}</h3>
      <ul className="my-4 space-y-1.5 text-left text-sm text-muted-foreground">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <Check className="size-4 shrink-0 text-success" /> {b}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <Button onClick={() => navigate('/login')}>Login</Button>
        <Button variant="outline" onClick={() => navigate('/register')}>Create account</Button>
        {onGuest && (
          <button onClick={onGuest} className="mt-1 text-xs text-muted-foreground hover:text-foreground">
            Continue as guest
          </button>
        )}
      </div>
    </div>
  );
}
