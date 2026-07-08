import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';
import { MapContainer, TileLayer } from 'react-leaflet';

import { FitController } from '@/components/map/FitController';
import { FloatMarkers } from '@/components/map/FloatMarkers';
import { FloatPanel } from '@/components/map/FloatPanel';
import { CenterSpinner, ErrorState } from '@/components/ui/states';
import { useFloats } from '@/lib/api/hooks';
import { LAYER } from '@/lib/layers';
import { fmt } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';

const TILES = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
};

export function MapPage() {
  const theme = useAppStore((s) => s.theme);
  const selectedId = useAppStore((s) => s.selectedFloatId);
  const highlighted = useAppStore((s) => s.highlightedFloatIds);
  const setHighlighted = useAppStore((s) => s.setHighlighted);
  const { data, isLoading, isError } = useFloats({ limit: 5000 });

  if (isLoading) return <CenterSpinner label="Loading floats…" />;
  if (isError || !data) return <ErrorState />;

  const tile = TILES[theme];

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[10, 75]}
        zoom={3}
        minZoom={2}
        worldCopyJump
        preferCanvas
        className="h-full w-full"
        style={{ background: 'hsl(var(--background))' }}
      >
        <TileLayer key={theme} url={tile.url} attribution={tile.attribution} />
        <FloatMarkers floats={data.items} />
        <FitController floats={data.items} />
      </MapContainer>

      {/* Stats + highlight controls */}
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-2" style={{ zIndex: LAYER.mapOverlay }}>
        <div className="pointer-events-auto rounded-lg border border-border bg-card/90 px-3 py-2 text-xs shadow-lg backdrop-blur">
          <span className="font-semibold text-foreground">{fmt.format(data.total)}</span>{' '}
          <span className="text-muted-foreground">floats</span>
          {highlighted.length > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-warning">{fmt.format(highlighted.length)}</span>{' '}
              <span className="text-muted-foreground">highlighted</span>
            </>
          )}
        </div>
        {highlighted.length > 0 && (
          <button
            onClick={() => setHighlighted([], false)}
            className="pointer-events-auto flex items-center gap-1 rounded-md border border-border bg-card/90 px-2.5 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur hover:text-foreground"
          >
            <X className="size-3.5" /> Clear highlight
          </button>
        )}
      </div>

      {selectedId && <FloatPanel id={selectedId} />}
    </div>
  );
}
