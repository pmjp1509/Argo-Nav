import { Monitor, Moon, Sun, Trash2 } from 'lucide-react';

import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-3 last:border-0">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = (t: 'dark' | 'light') => useAppStore.getState().theme !== t && useAppStore.getState().toggleTheme();
  const clearChat = useAppStore((s) => s.clearChat);

  return (
    <Page title="Settings" description="Appearance, API, and developer options.">
      <div className="grid gap-4 md:max-w-2xl">
        <Card>
          <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
          <CardContent>
            <Field label="Theme">
              <div className="flex gap-1 rounded-md border border-border p-1">
                {(['dark', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      'flex items-center gap-1.5 rounded px-3 py-1 text-xs capitalize',
                      theme === t ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t === 'dark' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />} {t}
                  </button>
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Connection</CardTitle></CardHeader>
          <CardContent>
            <Field label="API base">
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{api.base}</code>
            </Field>
            <Field label="Backend docs">
              <a href={api.base.replace('/api/v1', '/docs')} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <Monitor className="size-3.5" /> Open Swagger
              </a>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Data</CardTitle></CardHeader>
          <CardContent>
            <Field label="Conversation history">
              <Button variant="outline" size="sm" onClick={clearChat}>
                <Trash2 className="size-4" /> Clear
              </Button>
            </Field>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
