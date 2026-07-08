import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Page } from '@/components/layout/Page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CenterSpinner, ErrorState } from '@/components/ui/states';
import { seriesColor } from '@/lib/colors';
import { useCoverage } from '@/lib/api/hooks';

const AXIS = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
const TT = { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };

export function AnalyticsPage() {
  const { data, isLoading, isError } = useCoverage();
  if (isLoading) return <CenterSpinner />;
  if (isError || !data) return <ErrorState />;

  return (
    <Page title="Analytics" description="Coverage and distribution across the dataset.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profiles by month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.by_month} margin={{ top: 4, right: 12, bottom: 4, left: -8 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={AXIS} stroke="hsl(var(--border))" />
                <YAxis tick={AXIS} stroke="hsl(var(--border))" />
                <Tooltip contentStyle={TT} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                <Bar dataKey="n" fill="#22d3ee" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Records by parameter</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.by_param} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={AXIS} stroke="hsl(var(--border))" />
                <YAxis type="category" dataKey="parameter" width={64} tick={AXIS} stroke="hsl(var(--border))" />
                <Tooltip contentStyle={TT} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                <Bar dataKey="n" radius={[0, 3, 3, 0]}>
                  {data.by_param.map((_, i) => (
                    <Cell key={i} fill={seriesColor(i)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Float types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.by_type} dataKey="n" nameKey="float_type" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {data.by_type.map((_, i) => (
                    <Cell key={i} fill={seriesColor(i)} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TT} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              {data.by_type.map((t, i) => (
                <span key={t.float_type} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: seriesColor(i) }} />
                  {t.float_type} ({t.n})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
