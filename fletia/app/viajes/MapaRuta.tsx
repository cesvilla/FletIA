'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix íconos de Leaflet en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const iconOrigen = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const iconDestino = new L.DivIcon({
  html: `<div style="width:20px;height:20px;background:#d4440c;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Marcador del chofer en vivo: camión con halo verde pulsante.
const iconChofer = new L.DivIcon({
  html: `<div style="position:relative;width:34px;height:34px">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(26,107,58,0.35);animation:fletia-pulse 1.6s ease-out infinite"></div>
    <div style="position:absolute;top:5px;left:5px;width:24px;height:24px;background:#1a6b3a;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🚚</div>
  </div>
  <style>@keyframes fletia-pulse{0%{transform:scale(0.6);opacity:0.9}100%{transform:scale(1.8);opacity:0}}</style>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function AjustarVista({ polyline }: { polyline: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (polyline.length > 0) {
      map.fitBounds(L.latLngBounds(polyline), { padding: [40, 40] });
    }
  }, [polyline, map]);
  return null;
}

export interface RutaAlternativa {
  km: number;
  polyline: [number, number][];
  duracionMin?: number;
  peajes?: { plazas: Array<{ nombre: string; ruta: string; precio: number }>; total: number };
}

interface Props {
  polyline: [number, number][];
  origen: { lat: number; lon: number; nombre: string };
  destino: { lat: number; lon: number; nombre: string };
  km: number;
  rutasAlternativas?: RutaAlternativa[];
  onSeleccionarAlternativa?: (index: number) => void;
  posicionChofer?: { lat: number; lon: number } | null;
}

export default function MapaRuta({ polyline, origen, destino, km, rutasAlternativas, onSeleccionarAlternativa, posicionChofer }: Props) {
  const centro: [number, number] = [
    (origen.lat + destino.lat) / 2,
    (origen.lon + destino.lon) / 2,
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* Badge km */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        backgroundColor: '#1a1714', color: 'white',
        padding: '6px 12px', fontSize: '12px', fontFamily: 'DM Mono, monospace',
        fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        📍 {km} km por ruta
      </div>

      <MapContainer
        center={centro}
        zoom={6}
        style={{ height: '300px', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AjustarVista polyline={polyline} />

        {/* Rutas alternativas (en gris, detrás de la principal) */}
        {rutasAlternativas?.map((alt, i) => (
          <Polyline
            key={`alt-${i}`}
            positions={alt.polyline}
            pathOptions={{ color: '#8a8278', weight: 4, opacity: 0.45, dashArray: '8 6' }}
            eventHandlers={{
              click: () => onSeleccionarAlternativa?.(i),
            }}
          />
        ))}

        {/* Línea de ruta principal */}
        <Polyline
          positions={polyline}
          pathOptions={{ color: '#d4440c', weight: 4, opacity: 0.85 }}
        />

        {/* Marcador origen */}
        <Marker position={[origen.lat, origen.lon]} icon={iconOrigen}>
          <Popup><strong>Origen</strong><br />{origen.nombre}</Popup>
        </Marker>

        {/* Marcador destino */}
        <Marker position={[destino.lat, destino.lon]} icon={iconDestino}>
          <Popup><strong>Destino</strong><br />{destino.nombre}</Popup>
        </Marker>

        {/* Marcador del chofer en vivo */}
        {posicionChofer && (
          <Marker position={[posicionChofer.lat, posicionChofer.lon]} icon={iconChofer}>
            <Popup><strong>Chofer</strong><br />Ubicación en vivo</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
