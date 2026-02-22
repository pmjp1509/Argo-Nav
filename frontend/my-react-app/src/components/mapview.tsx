import type { Float } from '../services/floats';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  floats: Float[];
  loading: boolean;
  highlightedFloatIds?: string[];
}

const MapView = ({ floats, loading, highlightedFloatIds = [] }: MapViewProps) => {
  const highlightSet = new Set(highlightedFloatIds);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center text-slate-500 bg-slate-50">
        Loading Argo Floats...
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[20, 80]}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
        worldCopyJump={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {floats.map((float) => {
          const isHighlighted = highlightSet.has(float.id);
          return (
            <CircleMarker
              key={float.id}
              center={[float.latitude, float.longitude]}
              radius={isHighlighted ? 10 : 5}
              pathOptions={{
                fillColor: isHighlighted ? '#f59e0b' : '#2563eb',
                color: isHighlighted ? '#b45309' : '#ffffff',
                weight: isHighlighted ? 2 : 1,
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                mouseover: (e: { target: { openPopup: () => void } }) => e.target.openPopup(),
                mouseout: (e: { target: { closePopup: () => void } }) => e.target.closePopup(),
              }}
            >
              <Popup closeButton={false} autoPan={false}>
                <div className="text-xs text-slate-800">
                  <strong>ID:</strong> {float.id}
                  {isHighlighted && <span className="text-amber-600"> (in result)</span>}
                  <br />
                  <strong>Lat:</strong> {float.latitude?.toFixed(2) ?? '—'} <br />
                  <strong>Lng:</strong> {float.longitude?.toFixed(2) ?? '—'}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
