'use client'

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapContainer, TileLayer, Marker, Polyline, useMap, GeoJSON, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { RoundData, CountryData, GeoJson, CountryProperties, VibeLocation } from '../lib/types';
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
  locations?: VibeLocation[];
  onLocationClick?: (location: VibeLocation) => void;
  onLocationPin?: (location: VibeLocation) => void;
  onClearActive?: () => void;
  cachedLocations?: VibeLocation[];
  activeLocation?: VibeLocation | null;
  pinnedLocations?: { lat: number; lng: number }[];
  performanceRange?: { min: number; max: number };
  similarRounds?: string[];
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

function HeatmapMarkers({ locations, onLocationClick, onLocationPin, onClearActive, activeLocation, pinnedLocations, performanceRange, similarRounds }: MapProps) {
  const map = useMap();
  const [renderTrigger, setRenderTrigger] = useState(0);
  const isDragging = useRef(false);

  const zoomLevel = map.getZoom();
  const bounds = map.getBounds();

  const getColorFromValue = (value: number, min: number, max: number) => {
    if (max === min) return 'rgb(255, 255, 0)';
    const percentage = (value - min) / (max - min);
    const r = percentage < 0.5 ? 255 : Math.round(255 * (1 - (percentage - 0.5) * 2));
    const g = percentage > 0.5 ? 255 : Math.round(255 * (percentage * 2));
    return `rgb(${r}, ${g}, 0)`;
  };

  useEffect(() => {
    let animationFrameId: number | null = null;

    const update = () => {
      if (animationFrameId) {
        return;
      }
      animationFrameId = requestAnimationFrame(() => {
        map.invalidateSize();
        setRenderTrigger(prev => prev + 1);
        animationFrameId = null;
      });
    };

    const handleDragStart = () => isDragging.current = true;
    const handleDragEnd = () => {
      isDragging.current = false;
      update(); // Ensure a final update on drag end
    };

    map.on('move', update);
    map.on('dragstart', handleDragStart);
    map.on('dragend', handleDragEnd);

    return () => {
      map.off('move', update);
      map.off('dragstart', handleDragStart);
      map.off('dragend', handleDragEnd);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [map]);

  const visibleLocations = locations?.filter(loc => bounds.contains([loc.lat, loc.lng]));

  const getPathOptions = (loc: VibeLocation, isActive: boolean, isPinned: boolean, isSimilar: boolean) => {
    const { min, max } = performanceRange || { min: 0, max: 5000 };
    const color = getColorFromValue(loc.performanceValue, min, max);
    const baseRadius = zoomLevel < 6 ? 2 + zoomLevel * 0.8 : 6 + (zoomLevel - 6) * 1.2;
    const isSimilaritySearchActive = similarRounds && similarRounds.length > 0;

    if (isSimilar) {
      // Style for the highlighted similar rounds
      return { radius: baseRadius + 10, color: '#9333ea', weight: 5, fillColor: color, fillOpacity: 1.0 };
    }
    if (isPinned) {
      return { radius: baseRadius + 2, color: '#800080', fillColor: '#800080', fillOpacity: 1.0, weight: 2, dashArray: '5, 5' };
    }
    if (isActive) {
      return { radius: baseRadius + 15, color: '#000000', weight: 10, fillColor: color, fillOpacity: 1.0 };
    }
    if (isSimilaritySearchActive) {
      // When a search is active, this is the style for the faded out, non-similar rounds
      return { radius: baseRadius, color: '#cccccc', weight: 1, fillColor: '#aaaaaa', fillOpacity: 0.8 };
    }
    // Default style for all rounds when no similarity search is active
    return { radius: baseRadius, color: '#000000d0', weight: 2.5, fillColor: color, fillOpacity: 1.0 };
  };

  return (
    <>
      {visibleLocations?.map((loc, index) => {
        const isActive = activeLocation?.lat === loc.lat && activeLocation?.lng === loc.lng;
        const isPinned = pinnedLocations?.some(p => p.lat === loc.lat && p.lng === loc.lng) ?? false;
        const roundId = `${loc.round.duelId}_${loc.round.roundNumber}`;
        const isSimilar = similarRounds?.includes(roundId) ?? false;
        const pathOptions = getPathOptions(loc, isActive, isPinned, isSimilar);

        return (
          <CircleMarker
            key={`${loc.lat}-${loc.lng}-${index}`}
            center={[loc.lat, loc.lng]}
            radius={pathOptions.radius}
            pathOptions={pathOptions}
            eventHandlers={{
              click: () => {
                if (!isDragging.current) {
                  onLocationClick?.(loc);
                }
              },
              contextmenu: (e: L.LeafletMouseEvent) => { // Right-click on marker
                if (!isDragging.current) {
                  onClearActive?.();
                  L.DomEvent.stop(e.originalEvent);
                }
              },
              mousedown: (e: L.LeafletMouseEvent) => {
                if (!isDragging.current && e.originalEvent.button === 1 && onLocationPin) { // 1 for middle-click
                  onLocationPin(loc);
                  L.DomEvent.stop(e.originalEvent);
                }
              },
            } as any}
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
    if (selectedCountry && geoJson && !roundData) {
        const countryFeature = geoJson.features.find((feature: Feature<Geometry, CountryProperties>) => (feature.properties['ISO3166-1-Alpha-2'] as string).toLowerCase() === selectedCountry.countryCode);
        if (countryFeature) {
            const bounds = L.geoJSON(countryFeature).getBounds();
            map.fitBounds(bounds);
        }
    } else if (!roundData && !selectedCountry && !locations?.length) {
        map.setView([20, 0], 2);
    }
  }, [map, selectedCountry, geoJson, roundData, locations?.length]);

  return null;
}

function MapEvents({ onClearActive }: { onClearActive?: () => void }) {
  useMapEvents({
    contextmenu: (e) => {
      onClearActive?.();
      L.DomEvent.stop(e.originalEvent);
    },
  });
  return null;
}

export default function Map(props: MapProps) {
  const { roundData, onClearActive } = props;

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
    <MapContainer 
      center={[20, 0]} 
      zoom={2} 
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
    >
      <TileLayer
        url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en"
        attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
      />
      {props.activeLocation && (
        <>
          <Marker
            position={props.activeLocation.round.myGuess}
            icon={myIcon}
          />
          <Polyline positions={[props.activeLocation.round.myGuess, props.activeLocation.round.actual]} color="#0d6efd" dashArray="5, 5" />
          <Marker
            position={props.activeLocation.round.opponentGuess}
            icon={oppIcon}
          />
          <Polyline positions={[props.activeLocation.round.opponentGuess, props.activeLocation.round.actual]} color="#dc3545" dashArray="5, 5" />
        </>
      )}
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
      <MapEvents onClearActive={onClearActive} />
    </MapContainer>
  )
}
