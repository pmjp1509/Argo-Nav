import React from 'react'
import ReactDOM from 'react-dom/client'
import Dashboard from './pages/dashboard' // Adjust path if you moved it
import './index.css'

// Leaflet fix for marker icons (important!)
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// avoid TypeScript complaint about prototype
(L.Marker as any).prototype.options.icon = DefaultIcon;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>,
)
