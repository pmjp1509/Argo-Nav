import {
  BarChart3, BookOpen, Bot, CircleUser, LayoutDashboard, Map, Settings,
  Table2, Terminal, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  group: 'explore' | 'analyze' | 'system';
  end?: boolean;
}

// The AI Assistant is BOTH a global drawer and this dedicated full page.
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Map', icon: Map, group: 'explore', end: true },
  { to: '/assistant', label: 'AI Assistant', icon: Bot, group: 'explore' },
  { to: '/explorer', label: 'Float Explorer', icon: Table2, group: 'explore' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, group: 'analyze' },
  { to: '/knowledge', label: 'Knowledge Base', icon: BookOpen, group: 'analyze' },
  { to: '/sql', label: 'SQL Playground', icon: Terminal, group: 'analyze' },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'system' },
  { to: '/profile', label: 'Account', icon: CircleUser, group: 'system' },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'system' },
];

export const NAV_GROUPS: { id: NavItem['group']; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'system', label: 'System' },
];
