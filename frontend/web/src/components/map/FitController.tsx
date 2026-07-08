import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

import type { FloatSummary } from '@/lib/api/types';
import { useAppStore } from '@/store/appStore';

/** Fits the map to the highlighted floats whenever the AI produces a new set. */
export function FitController({ floats }: { floats: FloatSummary[] }) {
  const map = useMap();
  const fitNonce = useAppStore((s) => s.fitNonce);
  const highlighted = useAppStore((s) => s.highlightedFloatIds);

  useEffect(() => {
    if (!highlighted.length) return;
    const hl = new Set(highlighted);
    const pts = floats
      .filter((f) => hl.has(f.platform_number) && f.latitude != null && f.longitude != null)
      .map((f) => [f.latitude!, f.longitude!] as [number, number]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.flyTo(pts[0], 5, { duration: 0.8 });
    } else {
      map.flyToBounds(L.latLngBounds(pts).pad(0.2), { duration: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitNonce]);

  return null;
}
