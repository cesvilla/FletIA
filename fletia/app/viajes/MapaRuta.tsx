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

function AjustarVista({ polyline }: { polyline: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (polyline.length > 0) {
      map.fitBounds(L.latLngBounds(polyline), { padding: [40, 40] });
    }
  }, [polyline, map]);
  return null;
}

interface Props {
  polyline: [number, number][];
  origen: { lat: number; lon: number; nombre: string };
  destino: { lat: number; lon: number; nombre: string };
  km: number;
}

export default function MapaRuta({ polyline, origen, destino, km }: Props) {
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

        {/* Línea de ruta */}
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
      </MapContainer>
    </div>
  );
}
