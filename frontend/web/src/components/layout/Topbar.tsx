import { Menu, Moon, Search, Sparkles, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NAV_ITEMS } from '@/config/nav';
import { useHealth } from '@/lib/api/hooks';
import { useAppStore } from '@/store/appStore';
import { UserMenu } from './UserMenu';

export function Topbar({ onOpenCommand, onOpenMobileNav }: { onOpenCommand: () => void; onOpenMobileNav: () => void }) {
  const { pathname } = useLocation();
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const chatOpen = useAppStore((s) => s.chatOpen);
  const toggleChat = useAppStore((s) => s.toggleChat);
  const health = useHealth();

  const active = NAV_ITEMS.find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)));
  const title = active?.label ?? (pathname.startsWith('/floats/') ? 'Float Details' : 'ArgoDeep');

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-4">
      {/* Left: menu (mobile) + page title + status */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={onOpenMobileNav} aria-label="Menu">
          <Menu className="size-5" />
        </Button>
        <h1 className="truncate text-sm font-semibold">{title}</h1>
        <Badge variant={health.data ? 'success' : 'outline'} className="hidden shrink-0 sm:inline-flex">
          <span className="size-1.5 rounded-full bg-current" />
          {health.data ? 'API online' : 'connecting…'}
        </Badge>
      </div>

      {/* Right: actions — consistent sizing, no layout shift */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onOpenCommand}
          className="hidden h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 lg:flex"
        >
          <Search className="size-4" />
          <span>Search or ask…</span>
          <kbd className="ml-1 rounded border border-border bg-background px-1.5 font-mono text-[11px]">⌘K</kbd>
        </button>
        <Button
          variant={chatOpen ? 'outline' : 'primary'}
          size="sm"
          onClick={toggleChat}
          className="h-9 gap-1.5"
          aria-pressed={chatOpen}
        >
          <Sparkles className="size-4" />
          <span className="hidden sm:inline">Ask AI</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
