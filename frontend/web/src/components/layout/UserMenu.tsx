import { LogOut, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { LAYER } from '@/lib/layers';
import { isAuthEnabled, useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

export function UserMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  if (!isAuthEnabled) return null;
  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
        Sign in
      </Button>
    );
  }

  const initial = (user.email ?? 'U').charAt(0).toUpperCase();
  const toggle = () => {
    if (open) return setPos(null);
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="grid size-8 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary transition-colors hover:bg-primary/25"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {initial}
      </button>
      {open &&
        createPortal(
          <>
            <button
              className="fixed inset-0 cursor-default"
              style={{ zIndex: LAYER.dropdown - 1 }}
              onClick={() => setPos(null)}
              aria-hidden
              tabIndex={-1}
            />
            <div
              className="fixed w-48 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-lg"
              style={{ top: pos.top, right: pos.right, zIndex: LAYER.dropdown }}
            >
              <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
              <button
                onClick={() => { setPos(null); navigate('/profile'); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted/60"
              >
                <UserIcon className="size-4" /> Profile
              </button>
              <button
                onClick={async () => { setPos(null); await signOut(); toast.info('Signed out.'); navigate('/'); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted/60"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
