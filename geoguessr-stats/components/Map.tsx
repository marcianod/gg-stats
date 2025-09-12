'use client'

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Polyline, useMap, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { RoundData, CountryData, GeoJson, CountryProperties } from '../lib/types'
import { Feature, FeatureCollection, Geometry } from 'geojson';

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
  activeTab: string;
  roundData: RoundData | null;
  geoJson: GeoJson | null;
  countryStats: CountryData[];
  selectedCountry: CountryData | null;
  onCountrySelect: (countryCode: string) => void;
}

function getColorForWinRate(winRate: number | undefined): string {
    if (winRate === undefined) return '#e9ecef';
    if (winRate > 70) return '#1a9641';
    if (winRate > 60) return '#a6d96a';
    if (winRate > 50) return '#ffffbf';
    if (winRate > 40) return '#fdae61';
    return '#d7191c';
}

function ChoroplethLayer({ geoJson, countryStats, onCountrySelect, selectedCountry }: MapProps) {
    const geoJsonLayer = useRef<L.GeoJSON | null>(null);

    const style = (feature: Feature<Geometry, CountryProperties> | undefined) => {
        if (!feature || !feature.properties) {
            return {};
        }
        const countryCode = feature.properties['ISO3166-1-Alpha-2'] as string;
        const stats = countryStats.find(c => c.countryCode === countryCode);
        const winRate = stats ? (stats.wins / stats.totalRounds) * 100 : undefined;
        return {
            fillColor: getColorForWinRate(winRate),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    };

    const onEachFeature = (feature: Feature<Geometry, CountryProperties> | undefined, layer: L.Layer) => {
        if (!feature || !feature.properties) {
            return;
        }
        const countryCode = feature.properties['ISO3166-1-Alpha-2'] as string;
        layer.on({
            click: () => onCountrySelect(countryCode)
        });
    };

    useEffect(() => {
        if (geoJsonLayer.current && selectedCountry) {
            const countryLayer = Object.values(geoJsonLayer.current.getLayers()).find((layer) => {
                const l = layer as (L.Layer & { feature?: Feature<Geometry, CountryProperties> });
                return l.feature?.properties?.['ISO3166-1-Alpha-2'] === selectedCountry.countryCode;
            });
            if (countryLayer) {
                (countryLayer as L.Path).bringToFront();
            }
        }
    }, [selectedCountry]);

    return <GeoJSON ref={geoJsonLayer} data={geoJson as FeatureCollection<Geometry, CountryProperties>} style={style} onEachFeature={onEachFeature} />;
}

function MapBounds({ roundData, selectedCountry, geoJson }: { roundData: RoundData | null, selectedCountry: CountryData | null, geoJson: GeoJson | null }) {
  const map = useMap();

  useEffect(() => {
    if (roundData) {
      const bounds = L.latLngBounds([
        roundData.actual,
        roundData.myGuess,
        roundData.opponentGuess,
      ]);
      map.fitBounds(bounds.pad(0.2));
    }
  }, [map, roundData]);

  useEffect(() => {
    if (selectedCountry && geoJson) {
        const countryFeature = geoJson.features.find((feature: Feature<Geometry, CountryProperties>) => feature.properties['ISO3166-1-Alpha-2'] === selectedCountry.countryCode);
        if (countryFeature) {
            const bounds = L.geoJSON(countryFeature).getBounds();
            map.fitBounds(bounds);
        }
    } else if (!roundData) {
        map.setView([20, 0], 2);
    }
  }, [map, selectedCountry, geoJson, roundData]);

  return null;
}

export default function Map(props: MapProps) {
  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {props.activeTab === 'matches' && props.roundData && (
        <>
          <Marker position={props.roundData.actual} icon={correctLocationIcon} />
          <Marker position={props.roundData.myGuess} icon={myIcon} />
          <Marker position={props.roundData.opponentGuess} icon={oppIcon} />
          <Polyline positions={[props.roundData.myGuess, props.roundData.actual]} color="#0d6efd" dashArray="5, 5" />
          <Polyline positions={[props.roundData.opponentGuess, props.roundData.actual]} color="#dc3545" dashArray="5, 5" />
        </>
      )}
      {props.activeTab === 'countries' && props.geoJson && (
          <ChoroplethLayer {...props} />
      )}
      <MapBounds roundData={props.roundData} selectedCountry={props.selectedCountry} geoJson={props.geoJson} />
    </MapContainer>
  )
}
