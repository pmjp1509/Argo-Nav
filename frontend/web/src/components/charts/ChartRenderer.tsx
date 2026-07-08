import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';

import { PARAM_COLORS, seriesColor } from '@/lib/colors';
import type { ChartSpec } from '@/lib/api/types';

const AXIS = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
const GRID = 'hsl(var(--border))';
const TOOLTIP = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
};

function colorFor(param: string | undefined, i: number) {
  return (param && PARAM_COLORS[param]) || seriesColor(i);
}

export function ChartRenderer({ spec, height = 260 }: { spec: ChartSpec; height?: number }) {
  if (!spec?.series?.length) return null;

  // Depth profile: value on X, pressure on Y (inverted so deeper = lower).
  if (spec.kind === 'profile_line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name={spec.x_label} tick={AXIS} stroke={GRID}
                 label={{ value: spec.x_label, position: 'insideBottom', offset: -6, fill: AXIS.fill, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" reversed tick={AXIS} stroke={GRID}
                 label={{ value: spec.y_label, angle: -90, position: 'insideLeft', fill: AXIS.fill, fontSize: 11 }} />
          <Tooltip contentStyle={TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {spec.series.map((s, i) => (
            <Scatter key={s.label} name={s.label} data={s.points} fill={colorFor(s.param, i)}
                     line={{ stroke: colorFor(s.param, i), strokeWidth: 1.5 }} shape="circle"
                     legendType="line" isAnimationActive={false} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // Bar (e.g. per-float value).
  if (spec.kind === 'by_float_bar') {
    const data = spec.series[0]?.points ?? [];
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={AXIS} stroke={GRID} />
          <YAxis type="category" dataKey="y" width={90} tick={AXIS} stroke={GRID} />
          <Tooltip contentStyle={TOOLTIP} />
          <Bar dataKey="x" fill={seriesColor(0)} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Default: time/line series.
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" name={spec.x_label} tick={AXIS} stroke={GRID} />
        <YAxis tick={AXIS} stroke={GRID} />
        <Tooltip contentStyle={TOOLTIP} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {spec.series.map((s, i) => (
          <Line key={s.label} name={s.label} data={s.points} dataKey="y" type="monotone"
                stroke={colorFor(s.param, i)} dot={false} strokeWidth={2} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
