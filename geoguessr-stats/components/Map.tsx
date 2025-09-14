'use client'

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapContainer, TileLayer, Marker, Polyline, useMap, GeoJSON, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { RoundData, CountryData, GeoJson, CountryProperties } from '../lib/types';
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

export interface MapProps {
  activeTab?: string;
  roundData?: RoundData | null;
  geoJson: GeoJson | null;
  countryStats?: CountryData[];
  selectedCountry?: CountryData | null;
  onCountrySelect?: (countryCode: string) => void;
  onCountryClick?: (countryCode: string) => void;
  locations?: { lat: number; lng: number; heading?: number; pitch?: number; zoom?: number }[];
  onLocationClick?: (location: { lat: number; lng: number; heading?: number; pitch?: number; zoom?: number }) => void;
  onLocationPin?: (location: { lat: number; lng: number; heading?: number; pitch?: number; zoom?: number }) => void;
  cachedLocations?: { lat: number; lng: number }[];
  activeLocation?: { lat: number; lng: number } | null;
  pinnedLocations?: { lat: number; lng: number }[];
}

function getColorForWinRate(winRate: number | undefined): string {
    if (winRate === undefined) return 'transparent';
    if (winRate > 70) return '#1a9641';
    if (winRate > 60) return '#a6d96a';
    if (winRate > 50) return '#ffffbf';
    if (winRate > 40) return '#fdae61';
    return '#d7191c';
}

function ChoroplethLayer({ geoJson, countryStats, onCountrySelect, selectedCountry, onCountryClick }: MapProps) {
    const geoJsonLayer = useRef<L.GeoJSON | null>(null);

    const style = (feature: Feature<Geometry, CountryProperties> | undefined) => {
        if (!feature || !feature.properties) {
            return {};
        }
        const properties = feature.properties as CountryProperties;
        const countryCode = (properties['ISO3166-1-Alpha-2'] as string).toLowerCase();
        const stats = countryStats?.find(c => c.countryCode === countryCode);
        const winRate = stats ? (stats.wins / stats.totalRounds) * 100 : undefined;
        return {
            fillColor: getColorForWinRate(winRate),
            weight: 0,
            opacity: 0,
            color: 'white',
            fillOpacity: 0
        };
    };

    const onEachFeature = (feature: Feature<Geometry, CountryProperties> | undefined, layer: L.Layer) => {
        if (!feature || !feature.properties) {
            return;
        }
        const properties = feature.properties as CountryProperties;
        const countryCode = (properties['ISO3166-1-Alpha-2'] as string).toLowerCase();
        layer.on({
            click: () => {
                if (onCountrySelect) {
                    onCountrySelect(countryCode);
                }
                if (onCountryClick) {
                    onCountryClick(countryCode);
                }
            }
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

function HeatmapMarkers({ locations, onLocationClick, onLocationPin, cachedLocations, activeLocation, pinnedLocations }: MapProps) {
  const map = useMap();
  const [zoomLevel, setZoomLevel] = useState(map.getZoom());
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleZoom = () => setZoomLevel(map.getZoom());
    const handleDragStart = () => setIsDragging(true);
    const handleDragEnd = () => setIsDragging(false);

    map.on('zoomend', handleZoom);
    map.on('dragstart', handleDragStart);
    map.on('dragend', handleDragEnd);

    return () => {
      map.off('zoomend', handleZoom);
      map.off('dragstart', handleDragStart);
      map.off('dragend', handleDragEnd);
    };
  }, [map]);

  const getPathOptions = (loc: { lat: number; lng: number; }, cacheIndex: number, isActive: boolean, isPinned: boolean) => {
    const baseRadius = 0.5 + (zoomLevel / 18) * 15;
    const baseOpacity = 0.1 + (zoomLevel / 18) * 0.8;

    if (isPinned) {
      return { radius: baseRadius + 2, color: '#800080', fillColor: '#800080', fillOpacity: 1.0, weight: 2, dashArray: '5, 5' };
    }
    if (isActive) {
      return { radius: baseRadius + 2, color: '#ff0000', fillColor: '#ff0000', fillOpacity: 1.0 };
    }
    if (cacheIndex !== -1) {
      const factor = cacheIndex / Math.max(1, (cachedLocations?.length || 1) - 1);
      const g = 255 * factor;
      return { radius: baseRadius, color: `rgb(255, ${g}, 0)`, fillColor: `rgb(255, ${g}, 0)`, fillOpacity: baseOpacity + 0.1 };
    }
    return { radius: baseRadius, color: 'blue', fillColor: 'blue', fillOpacity: baseOpacity };
  };

  return (
    <>
      {locations?.map((loc, index) => {
        const cacheIndex = cachedLocations?.findIndex(l => l.lat === loc.lat && l.lng === loc.lng) ?? -1;
        const isActive = activeLocation?.lat === loc.lat && activeLocation?.lng === loc.lng;
        const isPinned = pinnedLocations?.some(p => p.lat === loc.lat && p.lng === loc.lng) ?? false;
        const pathOptions = getPathOptions(loc, cacheIndex, isActive, isPinned);

        return (
          <CircleMarker
            key={index}
            center={[loc.lat, loc.lng]}
            radius={pathOptions.radius}
            pathOptions={pathOptions}
            eventHandlers={{
              click: (e) => {
                if (!isDragging && onLocationClick) {
                  onLocationClick(loc);
                }
              },
              contextmenu: (e) => { // Using contextmenu for right-click
                if (!isDragging && onLocationPin) {
                  onLocationPin(loc);
                }
                L.DomEvent.stopPropagation(e.originalEvent);
                L.DomEvent.preventDefault(e.originalEvent);
              },
              mouseup: (e) => { // Using mouseup for middle-click
                if (!isDragging && e.originalEvent.button === 1 && onLocationPin) {
                  onLocationPin(loc);
                }
              }
            }}
          />
        );
      })}
    </>
  );
}

function MapBounds({ roundData, selectedCountry, geoJson, locations }: { roundData: RoundData | null, selectedCountry: CountryData | null, geoJson: GeoJson | null, locations?: { lat: number; lng: number }[] }) {
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
    if (selectedCountry && geoJson && !roundData && !locations) {
        const countryFeature = geoJson.features.find((feature: Feature<Geometry, CountryProperties>) => (feature.properties['ISO3166-1-Alpha-2'] as string).toLowerCase() === selectedCountry.countryCode);
        if (countryFeature) {
            const bounds = L.geoJSON(countryFeature).getBounds();
            map.fitBounds(bounds);
        }
    } else if (!roundData && !selectedCountry) {
        map.setView([20, 0], 2);
    }
  }, [map, selectedCountry, geoJson, roundData, locations]);

  return null;
}

export default function Map(props: MapProps) {
  const { roundData } = props;

  const handleMarkerClick = (url: string) => {
    window.open(url, '_blank');
  };

  let myReplayUrl: string | undefined,
      oppReplayUrl: string | undefined,
      actualStreetViewUrl: string | undefined;

  if (roundData) {
    myReplayUrl = `https://www.geoguessr.com/duels/${roundData.duelId}/replay?player=${roundData.myPlayerId}&round=${roundData.roundNumber}&step=0`;
    oppReplayUrl = `https://www.geoguessr.com/duels/${roundData.duelId}/replay?player=${roundData.opponentPlayerId}&round=${roundData.roundNumber}&step=0`;
    actualStreetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${roundData.actual.lat},${roundData.actual.lng}`;
    if (roundData.actual.heading !== undefined) {
      actualStreetViewUrl += `&heading=${roundData.actual.heading}`;
    }
    if (roundData.actual.pitch !== undefined) {
      actualStreetViewUrl += `&pitch=0`;
    }
  }

  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}>
      <TileLayer
        url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en"
        attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
      />
      {roundData && (
        <>
          {actualStreetViewUrl && (
            <Marker
              position={roundData.actual}
              icon={correctLocationIcon}
              eventHandlers={{ click: () => handleMarkerClick(actualStreetViewUrl!) }}
            />
          )}
          {myReplayUrl && (
            <Marker
              position={roundData.myGuess}
              icon={myIcon}
              eventHandlers={{ click: () => handleMarkerClick(myReplayUrl!) }}
            />
          )}
          {oppReplayUrl && (
            <Marker
              position={roundData.opponentGuess}
              icon={oppIcon}
              eventHandlers={{ click: () => handleMarkerClick(oppReplayUrl!) }}
            />
          )}
          <Polyline positions={[roundData.myGuess, roundData.actual]} color="#0d6efd" dashArray="5, 5" />
          <Polyline positions={[roundData.opponentGuess, roundData.actual]} color="#dc3545" dashArray="5, 5" />
        </>
      )}
      {(props.activeTab === 'countries' || props.onCountryClick) && props.geoJson && (
          <ChoroplethLayer {...props} />
      )}
      <HeatmapMarkers {...props} />
      <MapBounds roundData={props.roundData ?? null} selectedCountry={props.selectedCountry ?? null} geoJson={props.geoJson} locations={props.locations} />
    </MapContainer>
  )
}
