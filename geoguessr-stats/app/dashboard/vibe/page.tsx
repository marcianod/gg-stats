'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { GeoJson, CountryData, VibeLocation, ProcessedDuel } from '@/lib/types';
import dynamic from 'next/dynamic';
import { Rnd } from 'react-rnd';
import { processDuels } from '@/lib/utils';
import { findSimilarRounds } from '@/lib/similarity';
import { Lock, Unlock } from 'lucide-react';
import { DateRangePopover } from '@/components/ui/date-range-popover';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

interface PinnedLocation extends VibeLocation {
  size: { width: number; height: number };
  position: { x: number; y: number };
  isLocked: boolean;
  zIndex: number;
}

interface HistoryState {
  pinnedLocations: PinnedLocation[];
  activeLocation: VibeLocation | null;
}

export default function VibePage() {
  const [duels, setDuels] = useState<ProcessedDuel[]>([]);
  const [geoJson, setGeoJson] = useState<GeoJson | null>(null);
  const [embeddings, setEmbeddings] = useState<{ [roundId: string]: number[] }>({});
  const [activeLocation, setActiveLocation] = useState<VibeLocation | null>(null);
  const [cachedLocations, setCachedLocations] = useState<VibeLocation[]>([]);
  const [pinnedLocations, setPinnedLocations] = useState<PinnedLocation[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [topZIndex, setTopZIndex] = useState(1001);
  const [activeWindowZIndex, setActiveWindowZIndex] = useState(1000);
  const [windowSize, setWindowSize] = useState({ width: 640, height: 480 });
  const [windowPosition, setWindowPosition] = useState({ x: 50, y: 50 });
  const [isLocked, setIsLocked] = useState(false);
  const [similarRounds, setSimilarRounds] = useState<string[]>([]);
  const [isSimilarityModeOn, setIsSimilarityModeOn] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(new Date().setDate(new Date().getDate() - 30)), to: new Date() });
  const [colorMode, setColorMode] = useState<'absolute' | 'delta' | 'impact'>('delta');
  const [isLoading, setIsLoading] = useState(true);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const CACHE_LIMIT = 10;
  const PIN_LIMIT = 5;

  useEffect(() => {
    const savedPinnedLocations = localStorage.getItem('vibe-pinned-locations');
    if (savedPinnedLocations) {
      setPinnedLocations(JSON.parse(savedPinnedLocations));
    }
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
    Promise.all([
      fetch('/api/duels').then(res => res.json()),
      fetch('/data/countries.geojson').then(res => res.json()),
      fetch('/api/embeddings').then(res => res.json())
    ]).then(([duelsData, geoJsonData, embeddingsData]) => {
      const processed = processDuels(duelsData, '608a7f9394d95300015224ac');
      setDuels(processed);
      setGeoJson(geoJsonData);
      setEmbeddings(embeddingsData);
      setIsLoading(false);

    }).catch(error => {
      console.error('Error fetching initial data:', error);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('vibe-pinned-locations', JSON.stringify(pinnedLocations));
  }, [pinnedLocations]);

  const recordHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, { pinnedLocations, activeLocation }]);
    setHistoryIndex(newHistory.length);
  }, [history, historyIndex, pinnedLocations, activeLocation]);

  const minDate = useMemo(() => {
    if (duels.length === 0) return new Date();
    return duels.reduce((min, duel) => {
      const duelDate = new Date(duel.date || new Date());
      return duelDate < min ? duelDate : min;
    }, new Date());
  }, [duels]);

  const countryStats = useMemo(() => {
    const stats: { [key: string]: CountryData } = {};
    duels.forEach(duel => {
      if (duel.rounds) {
        duel.rounds.forEach(round => {
          const countryCode = round.countryCode;
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
    const locations: VibeLocation[] = [];
    duels.forEach(duel => {
      if (duel.rounds) {
        duel.rounds.forEach(round => {
          const roundDate = new Date(round.date);
          if (dateRange?.from) {
            const startDate = new Date(dateRange.from);
            startDate.setHours(0, 0, 0, 0);
            if (roundDate < startDate) return;
          }
          if (dateRange?.to) {
            const endDate = new Date(dateRange.to);
            endDate.setHours(23, 59, 59, 999);
            if (roundDate > endDate) return;
          }
          if (round.actual) {
            const performanceValue = colorMode === 'absolute'
              ? round.myGuess.score ?? 0
              : colorMode === 'delta'
                ? round.scoreDelta ?? 0
                : (round.scoreDelta ?? 0) * (1 - ((round.myGuess.score ?? 0) + (round.opponentGuess.score ?? 0)) / 10000);

            locations.push({
              lat: round.actual.lat,
              lng: round.actual.lng,
              heading: round.actual.heading,
              pitch: round.actual.pitch,
              zoom: round.actual.zoom,
              performanceValue,
              round,
            });
          }
        });
      }
    });
    return locations;
  }, [duels, dateRange, colorMode]);

  const performanceRange = useMemo(() => {
    if (allLocations.length === 0) {
      return { min: 0, max: 5000 };
    }
    const values = allLocations.map(l => l.performanceValue);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [allLocations]);

  const handleCountryClick = () => {
    setActiveLocation(null);
  };

  const handleLocationClick = (location: VibeLocation) => {
    recordHistory();
    setSimilarRounds([]); // Clear previous similar rounds
    if (isSimilarityModeOn) {
      handleFindSimilar(location.round);
    }
    const newZIndex = topZIndex + 1;
    setTopZIndex(newZIndex);
    setActiveWindowZIndex(newZIndex);
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

  const handleFindSimilar = (round: VibeLocation['round']) => {
    const roundId = `${round.duelId}_${round.roundNumber}`;
    const similar = findSimilarRounds(roundId, embeddings, 10);
    setSimilarRounds(similar);
  };

  const handleLocationPin = (location: VibeLocation) => {
    recordHistory();
    setPinnedLocations(prev => {
      const isPinned = prev.some(p => p.lat === location.lat && p.lng === location.lng);
      if (isPinned) {
        return prev.filter(p => p.lat !== location.lat || p.lng !== location.lng);
      }
      if (prev.length < PIN_LIMIT) {
        const newZIndex = topZIndex + 1;
        setTopZIndex(newZIndex);
        return [...prev, {
          ...location,
          size: { width: 400, height: 300 },
          position: { x: 50 + prev.length * 20, y: 50 + prev.length * 20 },
          isLocked: false,
          zIndex: newZIndex,
        }];
      }
      return prev;
    });
  };

  const updatePinnedLocation = (index: number, updates: Partial<PinnedLocation>) => {
    setPinnedLocations(prev =>
      prev.map((loc, i) => (i === index ? { ...loc, ...updates } : loc))
    );
  };

  const bringToFront = (index: number) => {
    const newZIndex = topZIndex + 1;
    setTopZIndex(newZIndex);
    setPinnedLocations(prev =>
      prev.map((loc, i) =>
        i === index ? { ...loc, zIndex: newZIndex } : loc
      )
    );
  };

  const bringActiveToFront = () => {
    const newZIndex = topZIndex + 1;
    setTopZIndex(newZIndex);
    setActiveWindowZIndex(newZIndex);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (isShift && e.key.toLowerCase() === 'c') {
        recordHistory();
        setPinnedLocations([]);
        setActiveLocation(null);
      }

      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const prevState = history[newIndex];
          setPinnedLocations(prevState.pinnedLocations);
          setActiveLocation(prevState.activeLocation);
          setHistoryIndex(newIndex);
        }
      }

      if (isCtrl && (e.key.toLowerCase() === 'y' || (isShift && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          const nextState = history[newIndex];
          setPinnedLocations(nextState.pinnedLocations);
          setActiveLocation(nextState.activeLocation);
          setHistoryIndex(newIndex);
        }
      }

      if (e.key === 'Escape') {
        setActiveLocation(null);
        setSimilarRounds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [history, historyIndex, recordHistory]);

  return (
    <div className="h-full w-full relative p-4">
      <div className="absolute top-4 left-16 z-[6000] flex items-center gap-4">
        <DateRangePopover
          date={dateRange}
          onDateChange={setDateRange}
          minDate={minDate}
        />
        <div className="flex items-center gap-2 bg-white p-1 rounded-md shadow-md">
          <Button
            variant={isSimilarityModeOn ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setIsSimilarityModeOn(!isSimilarityModeOn)}
          >
            Auto Vibe Check
          </Button>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-md shadow-md">
          <Button
            variant={colorMode === 'delta' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setColorMode('delta')}
          >
            Score Delta
          </Button>
          <Button
            variant={colorMode === 'absolute' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setColorMode('absolute')}
          >
            Absolute Score
          </Button>
          <Button
            variant={colorMode === 'impact' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setColorMode('impact')}
          >
            Impact Score
          </Button>
        </div>
      </div>
      {geoJson && (
        <Map
          geoJson={geoJson}
          onCountryClick={handleCountryClick}
          locations={allLocations}
          countryStats={countryStats}
          onLocationClick={handleLocationClick}
          onLocationPin={handleLocationPin}
          cachedLocations={cachedLocations}
          activeLocation={activeLocation}
          pinnedLocations={pinnedLocations}
          performanceRange={performanceRange}
          similarRounds={similarRounds}
        />
      )}
      {activeLocation && (
        <Rnd
          style={{ zIndex: activeWindowZIndex }}
          onMouseDown={bringActiveToFront}
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
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>
                  Score: {activeLocation.round.myGuess.score}
                  <span className={activeLocation.round.scoreDelta >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {' '}({activeLocation.round.scoreDelta >= 0 ? '+' : ''}{activeLocation.round.scoreDelta.toFixed(0)})
                  </span>
                </span>
                <span>
                  Impact: {((activeLocation.round.scoreDelta ?? 0) * (1 - ((activeLocation.round.myGuess.score ?? 0) + (activeLocation.round.opponentGuess.score ?? 0)) / 10000)).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.geoguessr.com/duels/${activeLocation.round.duelId}/replay?round=${activeLocation.round.roundNumber}`}
                target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="sm">View Replay</Button>
                </a>
              </div>
            </div>
          </div>
        </Rnd>
      )}
      {pinnedLocations.map((location, index) => (
        <Rnd
          key={`${location.lat}-${location.lng}`}
          style={{ zIndex: location.zIndex }}
          className="border"
          onMouseDown={() => bringToFront(index)}
          size={location.size}
          position={location.position}
          onDragStop={(e, d) => updatePinnedLocation(index, { position: { x: d.x, y: d.y } })}
          onResizeStop={(e, direction, ref) =>
            updatePinnedLocation(index, {
              size: {
                width: parseInt(ref.style.width, 10),
                height: parseInt(ref.style.height, 10),
              },
            })
          }
          disableDragging={location.isLocked}
          enableResizing={!location.isLocked}
        >
          <div className="h-full w-full bg-gray-50 p-4 rounded shadow-lg relative">
            <iframe
              className="w-full h-full rounded"
              src={`https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${location.lat},${location.lng}&heading=${location.heading || 0}&pitch=${location.pitch || 0}&fov=90`}
              allowFullScreen
            ></iframe>
            <button
              onClick={() => updatePinnedLocation(index, { isLocked: !location.isLocked })}
              className="absolute top-2 left-2 z-10 bg-white rounded-full p-1 text-gray-500 hover:text-gray-800"
            >
              {location.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
            </button>
            <button
              onClick={() => handleLocationPin(location)}
              className="absolute top-2 right-2 z-10 bg-white rounded-full p-1 text-gray-500 hover:text-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </Rnd>
      ))}
    </div>
  );
}
