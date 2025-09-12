'use client'

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'

// Custom icon definitions
const createPlayerIcon = (color: string) => new L.DivIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path fill="${color}" stroke="#FFFFFF" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path><circle cx="12" cy="9" r="2.5" fill="#FFFFFF"></circle></svg>`,
  className: 'custom-marker-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -34]
});

const correctLocationIcon = new L.DivIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path fill="#28a745" stroke="#FFFFFF" stroke-width="1.5" d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"></path></svg>`,
  className: 'custom-marker-icon',
  iconSize: [32, 32],
  iconAnchor: [5, 32],
  popupAnchor: [6, -30]
});

const myIcon = createPlayerIcon('#0d6efd');
const oppIcon = createPlayerIcon('#dc3545');

interface MapProps {
  roundData: {
    actual: { lat: number; lng: number };
    myGuess: { lat: number; lng: number };
    opponentGuess: { lat: number; lng: number };
  } | null;
}

function MapBounds({ roundData }: MapProps) {
  const map = useMap();
  useEffect(() => {
    if (roundData) {
      const bounds = L.latLngBounds([
        roundData.actual,
        roundData.myGuess,
        roundData.opponentGuess,
      ]);
      map.fitBounds(bounds.pad(0.2));
    } else {
      map.setView([20, 0], 2);
    }
  }, [map, roundData]);
  return null;
}

export default function Map({ roundData }: MapProps) {
  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {roundData && (
        <>
          <Marker position={roundData.actual} icon={correctLocationIcon} />
          <Marker position={roundData.myGuess} icon={myIcon} />
          <Marker position={roundData.opponentGuess} icon={oppIcon} />
          <Polyline positions={[roundData.myGuess, roundData.actual]} color="#0d6efd" dashArray="5, 5" />
          <Polyline positions={[roundData.opponentGuess, roundData.actual]} color="#dc3545" dashArray="5, 5" />
        </>
      )}
      <MapBounds roundData={roundData} />
    </MapContainer>
  )
}
