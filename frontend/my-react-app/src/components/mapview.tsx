import type { Float } from '../services/floats';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  floats: Float[];
  loading: boolean;
}

const MapView = ({ floats, loading }: MapViewProps) => {
  if (loading) return <div className="loading">Loading Argo Floats...</div>;

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapContainer center={[20, 80]} zoom={3} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {floats.map((float) => (
          <CircleMarker
            key={float.id}
            center={[float.latitude, float.longitude]}
            radius={5}
            pathOptions={{ 
              fillColor: '#0066ff',   // Red color
              color: '#ffffff',       // White border
              weight: 1, 
              fillOpacity: 0.8 
            }}
            // Hover logic: open popup on mouseover, close on mouseout
            eventHandlers={{
              mouseover: (e: any) => e.target.openPopup(),
              mouseout: (e: any) => e.target.closePopup(),
            }}
          >
            <Popup closeButton={false} autoPan={false}>
              <div style={{ fontSize: '12px' }}>
                <strong>ID:</strong> {float.id} <br />
                <strong>Lat:</strong> {float.latitude.toFixed(2)} <br />
                <strong>Lng:</strong> {float.longitude.toFixed(2)}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;