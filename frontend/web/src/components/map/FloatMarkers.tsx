import { useMemo } from 'react';
import { CircleMarker, Tooltip as LTooltip } from 'react-leaflet';

import type { FloatSummary } from '@/lib/api/types';
import { useAppStore } from '@/store/appStore';

export function FloatMarkers({ floats }: { floats: FloatSummary[] }) {
  const highlighted = useAppStore((s) => s.highlightedFloatIds);
  const selectedId = useAppStore((s) => s.selectedFloatId);
  const selectFloat = useAppStore((s) => s.selectFloat);

  const hlSet = useMemo(() => new Set(highlighted), [highlighted]);
  const hasHighlight = hlSet.size > 0;

  return (
    <>
      {floats.map((f) => {
        if (f.latitude == null || f.longitude == null) return null;
        const isHl = hlSet.has(f.platform_number);
        const isSel = selectedId === f.platform_number;
        const dim = hasHighlight && !isHl;

        const color = isSel ? '#f472b6' : isHl ? '#f59e0b' : '#22d3ee';
        return (
          <CircleMarker
            key={f.platform_number}
            center={[f.latitude, f.longitude]}
            radius={isSel ? 8 : isHl ? 6 : 4}
            pathOptions={{
              color: isSel || isHl ? '#0b1220' : 'transparent',
              weight: 1,
              fillColor: color,
              fillOpacity: dim ? 0.15 : 0.9,
            }}
            eventHandlers={{ click: () => selectFloat(f.platform_number) }}
          >
            <LTooltip direction="top" offset={[0, -4]}>
              <span className="text-xs">
                {f.platform_number} · {f.n_cycles ?? 0} cycles
              </span>
            </LTooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
