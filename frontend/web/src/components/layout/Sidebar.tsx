import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { Logo } from '@/components/ui/Logo';
import { Tooltip } from '@/components/ui/tooltip';
import { NAV_GROUPS, NAV_ITEMS, type NavItem } from '@/config/nav';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';

function Item({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          // Fixed height + fixed-size centered icon slot => no vertical/horizontal jump.
          'flex h-9 items-center rounded-md text-sm transition-colors',
          collapsed ? 'justify-center px-0' : 'gap-3 px-2.5',
          isActive
            ? 'bg-primary/12 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        )
      }
    >
      <item.icon className="size-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
  return collapsed ? <Tooltip label={item.label}>{link}</Tooltip> : link;
}

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col overflow-hidden border-r border-border bg-card/40 md:flex',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex h-14 shrink-0 items-center border-b border-border', collapsed ? 'justify-center' : 'gap-2 px-5')}>
        <Logo className="size-8 shrink-0 rounded-md" />
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-semibold">ArgoDeep</div>
            <div className="text-[11px] text-muted-foreground">Ocean Research</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-3">
            {/* Fixed-height header slot keeps rows in identical vertical positions in both states. */}
            <div className="flex h-6 items-center px-2">
              {collapsed ? (
                <div className="mx-auto h-px w-5 bg-border" />
              ) : (
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              {NAV_ITEMS.filter((i) => i.group === group.id).map((item) => (
                <Item key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={toggle}
        className={cn(
          'flex h-11 shrink-0 items-center border-t border-border text-xs text-muted-foreground hover:text-foreground',
          collapsed ? 'justify-center' : 'gap-2 px-5',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
        {!collapsed && 'Collapse'}
      </button>
    </aside>
  );
}
