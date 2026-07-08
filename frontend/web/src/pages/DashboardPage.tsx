import { Activity, Database, FileStack, Layers, Sparkles, Waves } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';

import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { useCoverage, useOverview } from '@/lib/api/hooks';
import { fmt, formatDate } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';

const AXIS = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };

export function DashboardPage() {
  const navigate = useNavigate();
  const overview = useOverview();
  const coverage = useCoverage();
  const messages = useAppStore((s) => s.messages);
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const o = overview.data;

  return (
    <Page title="Dashboard" description="Overview of the Argo dataset, knowledge base, and AI activity.">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Floats" value={o && fmt.format(o.floats)} icon={Waves} loading={overview.isLoading} />
        <StatCard label="Profiles" value={o && fmt.format(o.profiles)} icon={Database} loading={overview.isLoading} />
        <StatCard label="Parquet profiles" value={o && fmt.format(o.parquet_profiles)} icon={FileStack} loading={overview.isLoading} hint="depth arrays" />
        <StatCard label="Knowledge docs" value={o && fmt.format(o.knowledge_docs)} icon={Layers} loading={overview.isLoading} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profiles over time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={coverage.data?.by_month ?? []} margin={{ top: 4, right: 12, bottom: 4, left: -8 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={AXIS} stroke="hsl(var(--border))" />
                <YAxis tick={AXIS} stroke="hsl(var(--border))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="n" stroke="#22d3ee" fill="url(#g)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="primary" className="justify-start" onClick={() => setChatOpen(true)}>
              <Sparkles className="size-4" /> Ask the AI assistant
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/')}>
              <Waves className="size-4" /> Explore the map
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/sql')}>
              <Database className="size-4" /> Open SQL playground
            </Button>
            <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                <Activity className="size-3.5" /> Latest cycle
              </div>
              {overview.isLoading ? '…' : formatDate(o?.latest_cycle)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent AI conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet. Ask the assistant anything about the data.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {messages
                .filter((m) => m.role === 'user')
                .slice(-6)
                .reverse()
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setChatOpen(true)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:border-primary/40"
                  >
                    {m.content}
                  </button>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Page>
  );
}
