import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AssistantPanel } from '@/components/assistant/AssistantPanel';
import { Toaster } from '@/components/ui/Toaster';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { CommandPalette } from './CommandPalette';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const theme = useAppStore((s) => s.theme);
  const toggleChat = useAppStore((s) => s.toggleChat);
  const initAuth = useAuthStore((s) => s.init);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (meta && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleChat();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleChat]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenCommand={() => setCmdOpen(true)} onOpenMobileNav={() => setMobileNav(true)} />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <AssistantPanel />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <MobileNav open={mobileNav} onClose={() => setMobileNav(false)} />
      <Toaster />
    </div>
  );
}
