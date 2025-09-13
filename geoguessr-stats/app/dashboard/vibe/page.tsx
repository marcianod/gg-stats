'use client';

import { useState, useEffect, useMemo } from 'react';
import { Duel, GeoJson, CountryData } from '@/lib/types';
import dynamic from 'next/dynamic';
import { Rnd } from 'react-rnd';
import { Lock, Unlock } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function VibePage() {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [geoJson, setGeoJson] = useState<GeoJson | null>(null);
  const [activeLocation, setActiveLocation] = useState<{ lat: number; lng: number; heading?: number; pitch?: number; zoom?: number } | null>(null);
  const [cachedLocations, setCachedLocations] = useState<{ lat: number; lng: number; heading?: number; pitch?: number; zoom?: number }[]>([]);
  const [windowSize, setWindowSize] = useState({ width: 640, height: 480 });
  const [windowPosition, setWindowPosition] = useState({ x: 50, y: 50 });
  const [isLocked, setIsLocked] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const CACHE_LIMIT = 10;

  useEffect(() => {
    const savedSize = localStorage.getItem('vibe-window-size');
    if (savedSize) {
      setWindowSize(JSON.parse(savedSize));
    }
    const savedPosition = localStorage.getItem('vibe-window-position');
    if (savedPosition) {
      setWindowPosition(JSON.parse(savedPosition));
    }
    const savedLockState = localStorage.getItem('vibe-window-locked');
    if (savedLockState) {
      setIsLocked(JSON.parse(savedLockState));
    }
    fetch('/data/geoguessr_stats.json')
      .then((res) => res.json())
      .then((data) => setDuels(data))
      .catch(error => console.error('Error fetching duels:', error));
    fetch('/data/countries.geojson')
      .then((res) => res.json())
      .then((data) => setGeoJson(data))
      .catch(error => console.error('Error fetching geojson:', error));
  }, []);

  const countryStats = useMemo(() => {
    const stats: { [key: string]: CountryData } = {};
    duels.forEach(duel => {
      if (duel.rounds) {
        duel.rounds.forEach(round => {
          const countryCode = round.panorama?.countryCode;
          if (countryCode) {
            if (!stats[countryCode]) {
              stats[countryCode] = {
                countryCode,
                wins: 0,
                losses: 0,
                draws: 0,
                totalRounds: 0,
                totalScoreDelta: 0,
                rounds: [],
                winRate: 0,
                avgScoreDelta: 0,
              };
            }
            stats[countryCode].totalRounds++;
          }
        });
      }
    });
    return Object.values(stats);
  }, [duels]);

  const allLocations = useMemo(() => {
    const locations: { lat: number; lng: number; heading?: number; pitch?: number; zoom?: number }[] = [];
    duels.forEach(duel => {
      if (duel.rounds) {
        duel.rounds.forEach(round => {
          if (round.panorama) {
            locations.push({
              lat: round.panorama.lat,
              lng: round.panorama.lng,
              heading: round.panorama.heading,
              pitch: round.panorama.pitch,
              zoom: round.panorama.zoom,
            });
          }
        });
      }
    });
    return locations;
  }, [duels]);

  const handleCountryClick = (countryCode: string) => {
    setActiveLocation(null);
  };

  const handleLocationClick = (location: { lat: number; lng: number; heading?: number; pitch?: number; zoom?: number }) => {
    setActiveLocation(location);
    if (!cachedLocations.find(l => l.lat === location.lat && l.lng === location.lng)) {
      setCachedLocations(prev => {
        const updatedCache = [...prev, location];
        if (updatedCache.length > CACHE_LIMIT) {
          return updatedCache.slice(1);
        }
        return updatedCache;
      });
    }
  };

  return (
    <div className="h-full w-full relative p-4">
      {geoJson && (
        <Map
          geoJson={geoJson}
          onCountryClick={handleCountryClick}
          locations={allLocations}
          countryStats={countryStats}
          onLocationClick={handleLocationClick}
          cachedLocations={cachedLocations}
          activeLocation={activeLocation}
        />
      )}
      {cachedLocations.length > 0 && (
        <Rnd
          style={{ display: activeLocation ? 'block' : 'none' }}
          className="z-[1000]"
          size={windowSize}
          position={windowPosition}
          onDragStop={(e, d) => {
            const newPosition = { x: d.x, y: d.y };
            setWindowPosition(newPosition);
            localStorage.setItem('vibe-window-position', JSON.stringify(newPosition));
          }}
          onResizeStop={(e, direction, ref) => {
            const newSize = {
              width: parseInt(ref.style.width, 10),
              height: parseInt(ref.style.height, 10),
            };
            setWindowSize(newSize);
            localStorage.setItem('vibe-window-size', JSON.stringify(newSize));
          }}
          disableDragging={isLocked}
          enableResizing={!isLocked}
        >
          <div className="h-full w-full bg-white p-4 rounded shadow-lg relative">
            {cachedLocations.map(location => (
              <div
                key={`${location.lat}-${location.lng}`}
                className={`w-full h-full ${
                  activeLocation?.lat === location.lat && activeLocation?.lng === location.lng ? 'block' : 'hidden'
                }`}
              >
                <iframe
                  className="w-full h-full rounded"
                  src={`https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${location.lat},${location.lng}&heading=${location.heading || 0}&pitch=${location.pitch || 0}&fov=90`}
                  allowFullScreen
                ></iframe>
              </div>
            ))}
            <button
              onClick={() => {
                setIsLocked(!isLocked);
                localStorage.setItem('vibe-window-locked', JSON.stringify(!isLocked));
              }}
              className="absolute top-2 left-2 z-10 bg-white rounded-full p-1 text-gray-500 hover:text-gray-800"
            >
              {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
            </button>
            <button
              onClick={() => setActiveLocation(null)}
              className="absolute top-2 right-2 z-10 bg-white rounded-full p-1 text-gray-500 hover:text-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </Rnd>
      )}
    </div>
  );
}
