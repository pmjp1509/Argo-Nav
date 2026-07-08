/** Categorical palette for chart series (readable in dark + light). */
export const SERIES_COLORS = [
  '#22d3ee', // cyan
  '#f59e0b', // amber
  '#a78bfa', // violet
  '#34d399', // emerald
  '#f472b6', // pink
  '#60a5fa', // blue
  '#fb7185', // rose
];

export const PARAM_COLORS: Record<string, string> = {
  TEMP: '#f59e0b',
  PSAL: '#22d3ee',
  PRES: '#a78bfa',
  DOXY: '#34d399',
};

export function seriesColor(i: number) {
  return SERIES_COLORS[i % SERIES_COLORS.length];
}
