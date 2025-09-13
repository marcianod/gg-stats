'use client';

import React, { useMemo } from 'react';
import { type ProcessedDuel, type GeoJson, type CountryData } from '@/lib/types';
import { point, distance } from '@turf/turf';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { getFlagEmoji } from '@/lib/utils';

interface ConfusionMatrixProps {
  duels: ProcessedDuel[];
  geoJson: GeoJson | null;
  countryStats: CountryData[];
  spatialIndex: Record<string, GeoJson['features']> | null;
}

const territoryCorrections: Record<string, Record<string, string>> = {
    'IL': { 'SY': 'IL' },
    'HK': { 'CN': 'HK' },
    'PS': { 'IL': 'PS' },
    'TW': { 'CN': 'TW' }
};

export function ConfusionMatrix({ duels, geoJson, countryStats, spatialIndex }: ConfusionMatrixProps) {
  const countryNames = useMemo(() => {
    if (!geoJson) return {};
    return geoJson.features.reduce((acc, feature) => {
      acc[feature.properties['ISO3166-1-Alpha-2'].toLowerCase()] = feature.properties.name;
      return acc;
    }, {} as Record<string, string>);
  }, [geoJson]);

  const confusionMatrix = useMemo(() => {
    if (!geoJson || !geoJson.features || !spatialIndex) {
      return null;
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

    const matrix: Record<string, Record<string, number>> = {};

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

        if (!matrix[actualCountry]) matrix[actualCountry] = {};
        matrix[actualCountry][guessedCountry] = (matrix[actualCountry][guessedCountry] || 0) + 1;
      });
    });

    return matrix;
  }, [duels, geoJson, spatialIndex]);

  if (!confusionMatrix) {
    return <div>Loading confusion matrix...</div>;
  }

  const allCountries = Array.from(
    new Set(Object.keys(confusionMatrix).concat(...Object.values(confusionMatrix).map(Object.keys)))
  ).sort((a, b) => {
    const statsA = countryStats.find(c => c.countryCode.toUpperCase() === a);
    const statsB = countryStats.find(c => c.countryCode.toUpperCase() === b);
    return (statsB?.totalRounds || 0) - (statsA?.totalRounds || 0);
  });

  let totalConfusions = 0;
  const mostConfusedPairs: { actual: string; guessed: string; count: number }[] = [];
  Object.entries(confusionMatrix).forEach(([actual, guesses]) => {
    Object.entries(guesses).forEach(([guessed, count]) => {
      if (actual !== guessed) {
        totalConfusions += count;
        mostConfusedPairs.push({ actual, guessed, count });
      }
    });
  });

  mostConfusedPairs.sort((a, b) => b.count - a.count);
  const top5Confusions = mostConfusedPairs.slice(0, 5);

  return (
    <div className="confusion-matrix-container">
      <h4 className="mb-3 text-lg font-semibold">Country Confusion Matrix</h4>
      <p className="text-sm text-muted-foreground">
        This matrix shows which countries you confuse with each other. Each cell shows how many times you guessed the column country when it was actually the row country.
      </p>
      <div className="confusion-summary">
        {totalConfusions === 0 ? (
          <div className="p-4 my-4 text-sm text-green-700 bg-green-100 rounded-lg">
            <h6 className="font-bold">Perfect Accuracy!</h6>
            <p className="mb-0">You have no country confusions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h6 className="font-semibold">Overview</h6>
              <div className="confusion-stat">
                <strong>Total Confusions:</strong> {totalConfusions}
              </div>
            </div>
            <div>
              <h6 className="font-semibold">Top 5 Most Confused Pairs</h6>
              {top5Confusions.map((pair, index) => (
                <div key={index} className="flex items-center confusion-stat">
                  {getFlagEmoji(pair.actual)} {countryNames[pair.actual.toLowerCase()] || pair.actual} → {getFlagEmoji(pair.guessed)} {countryNames[pair.guessed.toLowerCase()] || pair.guessed}
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{pair.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto mt-4">
        <table className="confusion-matrix">
          <thead>
            <tr>
              <th>Actual↓/Guessed→</th>
              {allCountries.map(code => (
                <th key={code} title={countryNames[code.toLowerCase()] || code}>
                  {getFlagEmoji(code)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allCountries.map(actualCode => (
              <tr key={actualCode}>
                <td>
                  {getFlagEmoji(actualCode)} {countryNames[actualCode.toLowerCase()] || actualCode}
                </td>
                {allCountries.map(guessedCode => {
                  const count = confusionMatrix[actualCode]?.[guessedCode] || 0;
                  const isDiagonal = actualCode === guessedCode;
                  const cellClass = count === 0 ? 'confusion-cell-0' : count > 5 ? 'confusion-cell-high' : `confusion-cell-${count}`;
                  return (
                    <td
                      key={guessedCode}
                      className={`confusion-cell ${cellClass} ${isDiagonal ? 'bg-green-100' : ''}`}
                      title={`${countryNames[actualCode.toLowerCase()] || actualCode} → ${countryNames[guessedCode.toLowerCase()] || guessedCode}: ${count} times`}
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
    </div>
  );
}
