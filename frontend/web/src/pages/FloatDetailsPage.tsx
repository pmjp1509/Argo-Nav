import 'leaflet/dist/leaflet.css';
import { ArrowLeft, MapPin, Sparkles } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MapContainer, Polyline, TileLayer } from 'react-leaflet';
import { useNavigate, useParams } from 'react-router-dom';

import { ChartRenderer } from '@/components/charts/ChartRenderer';
import { Page } from '@/components/layout/Page';
import { useSendMessage } from '@/components/assistant/useAssistant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CenterSpinner, EmptyState, ErrorState } from '@/components/ui/states';
import { PARAM_COLORS } from '@/lib/colors';
import { useDepth, useFloat, useParamStats, useTrajectory } from '@/lib/api/hooks';
import { formatDate } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';

const AXIS = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
const TT = { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };

function ParamTrend({ id, parameter }: { id: string; parameter: string }) {
  const { data } = useParamStats(id, parameter);
  const points = data?.points ?? [];
  if (points.length < 2) return null;
  return (
    <Card>
      <CardHeader><CardTitle>{parameter} mean over cycles</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={points} margin={{ top: 4, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="cycle_number" tick={AXIS} stroke="hsl(var(--border))" />
            <YAxis tick={AXIS} stroke="hsl(var(--border))" domain={['auto', 'auto']} />
            <Tooltip contentStyle={TT} />
            <Line type="monotone" dataKey="mean_value" stroke={PARAM_COLORS[parameter] ?? '#22d3ee'} dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TrajectoryMap({ id }: { id: string }) {
  const { data } = useTrajectory(id);
  const pts = (data ?? [])
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => [p.latitude!, p.longitude!] as [number, number]);
  if (pts.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Trajectory · {pts.length} positions</CardTitle></CardHeader>
      <CardContent>
        <div className="h-52 overflow-hidden rounded-md">
          <MapContainer bounds={pts.length > 1 ? pts : undefined} center={pts[0]} zoom={4} className="h-full w-full" scrollWheelZoom={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
            <Polyline positions={pts} pathOptions={{ color: '#22d3ee', weight: 2 }} />
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border/60 py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function FloatDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const send = useSendMessage();
  const setHighlighted = useAppStore((s) => s.setHighlighted);
  const selectFloat = useAppStore((s) => s.selectFloat);

  const { data, isLoading, isError } = useFloat(id);
  const depth = useDepth(id);

  if (isLoading) return <CenterSpinner />;
  if (isError || !data) return <ErrorState message={`Float ${id} not found.`} />;

  const f = data.float as Record<string, unknown>;

  return (
    <Page
      title={`Float ${id}`}
      description={`${data.cycles.length} cycles`}
      wide
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/explorer')}><ArrowLeft className="size-4" /> Back</Button>
          <Button variant="outline" size="sm" onClick={() => { selectFloat(id); setHighlighted([id], true); navigate('/'); }}>
            <MapPin className="size-4" /> Show on map
          </Button>
          <Button size="sm" onClick={() => void send(`Summarize float ${id} and any anomalies.`)}>
            <Sparkles className="size-4" /> AI summary
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Metadata {f.float_type ? <Badge variant="primary">{String(f.float_type)}</Badge> : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Meta label="Platform" value={<span className="font-mono">{id}</span>} />
              <Meta label="Type" value={String(f.platform_type ?? '—')} />
              <Meta label="PI" value={String(f.pi_name ?? '—')} />
              <Meta label="Project" value={String(f.project_name ?? '—')} />
              <Meta label="Data centre" value={String(f.data_centre ?? '—')} />
              <Meta label="Cycles" value={String(f.n_cycles ?? data.cycles.length)} />
              <Meta label="Deployed" value={formatDate(f.deploy_date as string)} />
              <Meta label="Last cycle" value={formatDate(f.last_cycle_at as string)} />
              <Meta label="Status" value={f.is_active ? <Badge variant="success">active</Badge> : <Badge>inactive</Badge>} />
            </CardContent>
          </Card>
          <TrajectoryMap id={id} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Latest depth profile</CardTitle></CardHeader>
            <CardContent>
              {depth.isLoading ? (
                <CenterSpinner />
              ) : depth.data?.chart_spec ? (
                <>
                  <ChartRenderer spec={depth.data.chart_spec} height={280} />
                  {depth.data.warnings?.length ? (
                    <p className="mt-2 text-xs text-warning">{depth.data.warnings[0]}</p>
                  ) : null}
                </>
              ) : (
                <EmptyState title="No depth data" hint="This float has no stored Parquet profile." />
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <ParamTrend id={id} parameter="TEMP" />
            <ParamTrend id={id} parameter="PSAL" />
          </div>
        </div>
      </div>
    </Page>
  );
}
