'use client';

import React, { useMemo, useState } from 'react';
import { type ProcessedDuel, type GeoJson, type CountryData, type RoundData } from '@/lib/types';
import { point, distance } from '@turf/turf';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { getFlagEmoji } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { SortableTable, type ColumnDef } from '@/components/ui/sortable-table';

interface ConfusionMatrixProps {
  duels: ProcessedDuel[];
  geoJson: GeoJson | null;
  countryStats: CountryData[];
  spatialIndex: Record<string, GeoJson['features']> | null;
  onPairSelect?: (rounds: RoundData[]) => void;
  selectedPairId?: string | null;
}

interface ConfusionPair {
  id: string; // actual_guessed
  actual: string;
  guessed: string;
  count: number;
  totalDamage: number;
  avgDamage: number;
  rounds: RoundData[];
}

const territoryCorrections: Record<string, Record<string, string>> = {
  'IL': { 'SY': 'IL' },
  'HK': { 'CN': 'HK' },
  'PS': { 'IL': 'PS' },
  'TW': { 'CN': 'TW' }
};

export function ConfusionMatrix({ duels, geoJson, countryStats, spatialIndex, onPairSelect, selectedPairId }: ConfusionMatrixProps) {
  const [minConfusions, setMinConfusions] = useState(3);
  const [activeTab, setActiveTab] = useState('impact');

  const countryNames = useMemo(() => {
    if (!geoJson) return {};
    return geoJson.features.reduce((acc, feature) => {
      acc[feature.properties['ISO3166-1-Alpha-2'].toLowerCase()] = feature.properties.name;
      return acc;
    }, {} as Record<string, string>);
  }, [geoJson]);

  const { matrix, confusionPairs } = useMemo(() => {
    if (!geoJson || !geoJson.features || !spatialIndex) {
      return { matrix: null, confusionPairs: [] };
    }

    const PROXIMITY_THRESHOLD_KM = 20;
    const gridSize = 10;

    const getCountryFromCoords = (lng: number, lat: number): string | null => {
      try {
        const pt = point([lng, lat]);
        const cellKey = `${Math.floor(lng / gridSize)},${Math.floor(lat / gridSize)}`;
        const candidateFeatures = spatialIndex[cellKey] || [];

        for (const feature of candidateFeatures) {
          if (!feature.geometry || (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')) continue;
          if (booleanPointInPolygon(pt, feature.geometry)) {
            return feature.properties['ISO3166-1-Alpha-2'];
          }
        }
      } catch (e) {
        console.error("Error in getCountryFromCoords:", e);
      }
      return null;
    };

    const matrixData: Record<string, Record<string, { count: number; totalDamage: number; rounds: RoundData[] }>> = {};

    duels.forEach(duel => {
      duel.rounds.forEach(round => {
        if (!round.countryCode) return;
        const actualCountry = round.countryCode.toUpperCase();
        let guessedCountryCode = getCountryFromCoords(round.myGuess.lng, round.myGuess.lat);

        if (guessedCountryCode && guessedCountryCode !== actualCountry) {
          const territoryCorrection = territoryCorrections[actualCountry]?.[guessedCountryCode];
          if (territoryCorrection) {
            guessedCountryCode = territoryCorrection;
          } else {
            const dist = distance(
              point([round.actual.lng, round.actual.lat]),
              point([round.myGuess.lng, round.myGuess.lat])
            );
            if (dist < PROXIMITY_THRESHOLD_KM) {
              guessedCountryCode = actualCountry;
            }
          }
        }

        const guessedCountry = guessedCountryCode || actualCountry;

        if (!matrixData[actualCountry]) matrixData[actualCountry] = {};
        if (!matrixData[actualCountry][guessedCountry]) {
          matrixData[actualCountry][guessedCountry] = { count: 0, totalDamage: 0, rounds: [] };
        }

        matrixData[actualCountry][guessedCountry].count += 1;
        // Calculate damage: we want to track the magnitude of the loss (points given to opponent).
        // If round.damage is set, it might be negative (if we lost points).
        // If not, scoreDelta < 0 means we lost points.
        // We want a positive "cost" value.
        const rawDmg = round.damage !== undefined ? round.damage : round.scoreDelta;
        const damageCost = rawDmg < 0 ? Math.abs(rawDmg) : 0;

        matrixData[actualCountry][guessedCountry].totalDamage += damageCost;
        matrixData[actualCountry][guessedCountry].rounds.push(round);
      });
    });

    // Flatten to pairs for the list view
    const pairs: ConfusionPair[] = [];
    Object.entries(matrixData).forEach(([actual, guesses]) => {
      Object.entries(guesses).forEach(([guessed, data]) => {
        if (actual !== guessed) {
          pairs.push({
            id: `${actual}_${guessed}`,
            actual,
            guessed,
            count: data.count,
            totalDamage: data.totalDamage,
            avgDamage: data.totalDamage / data.count,
            rounds: data.rounds
          });
        }
      });
    });

    return { matrix: matrixData, confusionPairs: pairs };
  }, [duels, geoJson, spatialIndex]);

  const filteredPairs = useMemo(() => {
    return confusionPairs
      .filter(p => p.count >= minConfusions)
      .sort((a, b) => b.totalDamage - a.totalDamage);
  }, [confusionPairs, minConfusions]);

  const columns: ColumnDef<ConfusionPair>[] = [
    {
      accessorKey: 'actual',
      header: 'Mistake',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center" title={countryNames[row.actual.toLowerCase()] || row.actual}>
            <span className="text-xl mr-1">{getFlagEmoji(row.actual)}</span>
            <span className="font-semibold text-sm">{row.actual}</span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="flex items-center" title={countryNames[row.guessed.toLowerCase()] || row.guessed}>
            <span className="text-xl mr-1">{getFlagEmoji(row.guessed)}</span>
            <span className="font-semibold text-sm">{row.guessed}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'totalDamage',
      header: 'Points Lost',
      cell: (row) => <span className="font-bold text-red-600">{Math.round(row.totalDamage).toLocaleString()}</span>,
      className: 'text-right',
    },
    {
      accessorKey: 'count',
      header: 'Count',
      cell: (row) => row.count,
      className: 'text-right',
    },
    {
      accessorKey: 'avgDamage',
      header: 'Avg Dmg',
      cell: (row) => Math.round(row.avgDamage).toLocaleString(),
      className: 'text-right',
    }
  ];

  if (!matrix) {
    return <div>Loading confusion matrix...</div>;
  }

  const allCountries = Array.from(
    new Set(Object.keys(matrix).concat(...Object.values(matrix).map(Object.keys)))
  ).sort((a, b) => {
    const statsA = countryStats.find(c => c.countryCode.toUpperCase() === a);
    const statsB = countryStats.find(c => c.countryCode.toUpperCase() === b);
    return (statsB?.totalRounds || 0) - (statsA?.totalRounds || 0);
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Confusion Matrix</h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="min-confusions" className="whitespace-nowrap">Min Confusions:</Label>
          <Input
            id="min-confusions"
            type="number"
            min="1"
            value={minConfusions}
            onChange={(e) => setMinConfusions(parseInt(e.target.value) || 1)}
            className="w-20"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="impact">High Impact</TabsTrigger>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
        </TabsList>

        <TabsContent value="impact" className="flex-grow overflow-hidden">
          <Card className="h-full flex flex-col">
            <CardContent className="h-full p-0 flex flex-col overflow-hidden">
              <div className="flex-grow overflow-auto p-1">
                <SortableTable
                  columns={columns}
                  data={filteredPairs}
                  onRowClick={(row) => onPairSelect?.(row.rounds)}
                  selectedRow={selectedPairId ? filteredPairs.find(p => p.id === selectedPairId) : null}
                  initialSortKey="totalDamage"
                />
                {filteredPairs.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No confusions found with {minConfusions}+ occurrences.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grid" className="flex-grow overflow-hidden">
          <div className="overflow-auto h-full border rounded-md">
            <table className="confusion-matrix w-full">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-20 bg-background">Actual↓/Guessed→</th>
                  {allCountries.map(code => (
                    <th key={code} title={countryNames[code.toLowerCase()] || code} className="sticky top-0 z-10 bg-background">
                      {getFlagEmoji(code)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allCountries.map(actualCode => (
                  <tr key={actualCode}>
                    <td className="sticky left-0 z-10 bg-background font-medium">
                      {getFlagEmoji(actualCode)} {countryNames[actualCode.toLowerCase()] || actualCode}
                    </td>
                    {allCountries.map(guessedCode => {
                      const cellData = matrix[actualCode]?.[guessedCode];
                      const count = cellData?.count || 0;
                      const isDiagonal = actualCode === guessedCode;
                      const cellClass = count === 0 ? 'confusion-cell-0' : count > 5 ? 'confusion-cell-high' : `confusion-cell-${count}`;
                      return (
                        <td
                          key={guessedCode}
                          className={`confusion-cell ${cellClass} ${isDiagonal ? 'bg-green-100' : ''} cursor-pointer hover:ring-2 hover:ring-primary`}
                          title={`${countryNames[actualCode.toLowerCase()] || actualCode} → ${countryNames[guessedCode.toLowerCase()] || guessedCode}: ${count} times`}
                          onClick={() => cellData && onPairSelect?.(cellData.rounds)}
                        >
                          {count || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
