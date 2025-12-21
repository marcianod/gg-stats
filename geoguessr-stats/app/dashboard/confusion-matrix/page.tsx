'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { type Duel, type ProcessedDuel, type RoundData, type GeoJson, type CountryData } from '@/lib/types';
import { ConfusionMatrix } from '@/components/ConfusionMatrix';
import { type MapProps } from '@/components/Map';
import { DateRangePopover } from '@/components/ui/date-range-popover';
import { DateRange } from 'react-day-picker';
import { processDuels } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

import * as turf from '@turf/turf';

const Map = dynamic<MapProps & { confusionRounds?: RoundData[]; }>(() => import('@/components/Map'), {
  ssr: false,
});

// This should ideally be configurable by the user or from environment variables.
const MY_PLAYER_ID = '608a7f9394d95300015224ac';

export default function ConfusionMatrixPage() {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<GeoJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedConfusionRounds, setSelectedConfusionRounds] = useState<RoundData[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [duelsResponse, geoJsonReponse] = await Promise.all([
          fetch('/api/duels'),
          fetch('/data/countries.geojson'),
        ]);

        if (!duelsResponse.ok) {
          throw new Error(`HTTP error! status: ${duelsResponse.status} for /api/duels`);
        }
        if (!geoJsonReponse.ok) {
          throw new Error(`HTTP error! status: ${geoJsonReponse.status} for countries.geojson`);
        }

        const duelsData: Duel[] = await duelsResponse.json();
        const geoJson: GeoJson = await geoJsonReponse.json();

        setDuels(duelsData);
        setGeoJsonData(geoJson);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
        console.error("Failed to fetch data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const minDate = useMemo(() => {
    if (duels.length === 0) return new Date();
    return duels.reduce((min, duel) => {
      const duelDate = new Date(duel.rounds?.[0]?.startTime || new Date());
      return duelDate < min ? duelDate : min;
    }, new Date());
  }, [duels]);

  const processedDuels = useMemo(() => {
    const filteredByDate = duels.filter(duel => {
      if (!dateRange?.from) return true;
      if (!duel.rounds || duel.rounds.length === 0) return false;
      const duelDate = new Date(duel.rounds[0]?.startTime);
      if (dateRange.from && duelDate < dateRange.from) return false;
      if (dateRange.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        if (duelDate > endDate) return false;
      }
      return true;
    });
    return processDuels(filteredByDate, MY_PLAYER_ID);
  }, [duels, dateRange]);

  const countryStats: CountryData[] = useMemo(() => {
    const stats: Record<string, {
      wins: number;
      losses: number;
      draws: number;
      totalRounds: number;
      totalScoreDelta: number;
      rounds: RoundData[];
    }> = {};
    processedDuels.forEach((duel) => {
      if (!duel.rounds) return;
      duel.rounds.forEach((round) => {
        const countryCode = round.countryCode?.toLowerCase();
        if (!countryCode) return;
        if (!stats[countryCode]) {
          stats[countryCode] = { wins: 0, losses: 0, draws: 0, totalRounds: 0, totalScoreDelta: 0, rounds: [] };
        }
        stats[countryCode].totalRounds++;
        if (round.scoreDelta > 0) {
          stats[countryCode].wins++;
        } else if (round.scoreDelta < 0) {
          stats[countryCode].losses++;
        } else {
          stats[countryCode].draws++;
        }
        stats[countryCode].totalScoreDelta += round.scoreDelta;
        stats[countryCode].rounds.push(round);
      });
    });
    return Object.entries(stats).map(([countryCode, data]) => ({
      countryCode,
      ...data,
      winRate: (data.wins / data.totalRounds) * 100,
      avgScoreDelta: data.totalScoreDelta / data.totalRounds,
    }));
  }, [processedDuels]);

  // Can re-use spatial index logic if needed or pass it down. 
  // ConfusionMatrix calculates its own spatial index if passed or we can compute it here.
  // The original component computed it. Let's compute it here to pass to Map too if we wanted, 
  // but Map doesn't strictly need spatial index for markers. 
  // However, ConfusionMatrix needs it.
  const spatialIndex = useMemo(() => {
    if (!geoJsonData) return null;
    // Just a quick re-implementation or we could move this to a utility if shared.
    // For now, let's keep it consistent.
    // Imports are not available here easily without utils, so let's import turf.
    // Since we are top level:
    const index: Record<string, GeoJson['features']> = {};
    const gridSize = 10;
    for (const feature of geoJsonData.features) {
      if (!feature.geometry || (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')) continue;
      const bbox = turf.bbox(feature);
      const minX = Math.floor(bbox[0] / gridSize);
      const minY = Math.floor(bbox[1] / gridSize);
      const maxX = Math.floor(bbox[2] / gridSize);
      const maxY = Math.floor(bbox[3] / gridSize);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const cellKey = `${x},${y}`;
          if (!index[cellKey]) {
            index[cellKey] = [];
          }
          index[cellKey].push(feature);
        }
      }
    }
    return index;
  }, [geoJsonData]);

  const handlePairSelect = (rounds: RoundData[]) => {
    setSelectedConfusionRounds(rounds);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading data...</div>;
  if (error) return <div className="flex min-h-screen items-center justify-center text-red-500">Error: {error}</div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="p-4 border-b flex justify-between items-center relative z-10 shrink-0 bg-background">
        <h1 className="text-xl font-bold text-gray-800">Confusion Matrix</h1>
        <DateRangePopover date={dateRange} onDateChange={setDateRange} minDate={minDate} />
      </header>

      <main className="grid grid-cols-12 flex-grow gap-4 p-4 overflow-hidden">
        {/* Left Panel: Confusion List/Matrix */}
        <div className="col-span-5 h-full overflow-hidden">
          <ConfusionMatrix
            duels={processedDuels}
            geoJson={geoJsonData}
            countryStats={countryStats}
            spatialIndex={spatialIndex}
            onPairSelect={handlePairSelect}
            selectedPairId={selectedConfusionRounds && selectedConfusionRounds.length > 0 ? `${selectedConfusionRounds[0].countryCode.toUpperCase()}_${selectedConfusionRounds[0].opponentGuess?.distance ? 'UNKNOWN' : 'UNKNOWN'}` : null} // Id generation is tricky here without passing ID back. 
          // Let's just rely on visual feedback or improve ID passing later.
          />
        </div>

        {/* Right Panel: Map */}
        <div className="col-span-7 h-full overflow-hidden flex flex-col">
          <Card className="h-full overflow-hidden">
            <CardContent className="h-full p-0">
              <Map
                geoJson={geoJsonData}
                activeTab="confusion" // Custom tab
                confusionRounds={selectedConfusionRounds || undefined}
              // We can also pass other props if we want context
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
