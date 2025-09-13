'use client';

import { useMemo, useState, useEffect } from 'react';
import { type Duel, type ProcessedDuel, type RoundData, type GeoJson, type CountryData } from '@/lib/types';
import { ConfusionMatrix } from '@/components/ConfusionMatrix';
import * as turf from '@turf/turf';

// This should ideally be configurable by the user or from environment variables.
const MY_PLAYER_ID = '608a7f9394d95300015224ac';

function getGameMode(options?: { map?: { name?: string; }; movementOptions?: { forbidMoving?: boolean; forbidZooming?: boolean; forbidPanning?: boolean; }; }) {
    if (!options?.movementOptions) return 'MOVE';
    if (options.movementOptions.forbidMoving && options.movementOptions.forbidZooming) return 'NMPZ';
    if (options.movementOptions.forbidMoving) return 'NM';
    return 'MOVE';
}

export default function ConfusionMatrixPage() {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<GeoJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [duelsResponse, geoJsonReponse] = await Promise.all([
          fetch('/data/geoguessr_stats.json'),
          fetch('/data/countries.geojson'),
        ]);

        if (!duelsResponse.ok) {
          throw new Error(`HTTP error! status: ${duelsResponse.status} for geoguessr_stats.json`);
        }
        if (!geoJsonReponse.ok) {
          throw new Error(`HTTP error! status: ${geoJsonReponse.status} for countries.geojson`);
        }

        const duelsData: Duel[][] = await duelsResponse.json();
        const geoJson: GeoJson = await geoJsonReponse.json();

        setDuels(duelsData.flat(Infinity) as Duel[]);
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

  const processedDuels = useMemo(() => {
    return duels
      .map((duel) => {
        if (!duel.teams || duel.teams.length < 2 || !duel.rounds || duel.rounds.length === 0) {
          return null
        }
        const teamsWithIsMe = duel.teams.map(team => ({
          ...team,
          players: team.players.map(player => ({
            ...player,
            isMe: player.playerId === MY_PLAYER_ID,
          })),
        }));
        const meTeam = duel.teams.find((t) => t.players[0]?.playerId === MY_PLAYER_ID)
        const opponentTeam = duel.teams.find((t) => t.players[0]?.playerId !== MY_PLAYER_ID)
        if (!meTeam || !opponentTeam || !meTeam.players[0] || !opponentTeam.players[0]) {
          return null
        }
        const mePlayer = meTeam.players[0];
        const opponentPlayer = opponentTeam.players[0];
        const myScore = mePlayer.guesses.reduce((sum, g) => sum + g.score, 0)
        const opponentScore = opponentPlayer.guesses.reduce((sum, g) => sum + g.score, 0)
        let outcome: ProcessedDuel['outcome'] = 'Unknown';
        if (duel.result?.winningTeamId) {
            if (duel.result.winningTeamId === meTeam.id) {
                outcome = 'Win';
            } else {
                outcome = 'Loss';
            }
        } else {
            if (myScore === opponentScore) {
                outcome = 'Draw';
            } else {
                outcome = 'Unknown';
            }
        }

        const ratingBefore = mePlayer.progressChange?.rankedSystemProgress?.ratingBefore;
        const ratingAfter = mePlayer.progressChange?.rankedSystemProgress?.ratingAfter;
        const mmrChange = (ratingAfter !== undefined && ratingBefore !== undefined) ? ratingAfter - ratingBefore : undefined;

        const gameDate = duel.rounds?.[0]?.startTime
        const processedDuel: ProcessedDuel = {
          ...duel,
          teams: teamsWithIsMe,
          date: new Date(gameDate || 0),
          myScore,
          opponentScore,
          outcome: outcome,
          gameMode: getGameMode(duel.options),
          mmr: ratingAfter,
          mmrChange: mmrChange,
          rounds: duel.rounds?.map((round) => {
            const myGuess = mePlayer.guesses.find(g => g.roundNumber === round.roundNumber);
            const opponentGuess = opponentPlayer.guesses.find(g => g.roundNumber === round.roundNumber);
            if (!myGuess || !opponentGuess) return null;
            const myGuessTime = myGuess ? (new Date(myGuess.created as string).getTime() - new Date(round.startTime as string).getTime()) / 1000 : 0;
            const opponentGuessTime = opponentGuess ? (new Date(opponentGuess.created as string).getTime() - new Date(round.startTime as string).getTime()) / 1000 : 0;
            const scoreDelta = (myGuess?.score || 0) - (opponentGuess?.score || 0);
            const myGuessDistance = (myGuess?.distance || 0) / 10;
            const opponentGuessDistance = (opponentGuess?.distance || 0) / 10;
            const distDelta = myGuessDistance - opponentGuessDistance;
            const timeDelta = myGuessTime - opponentGuessTime;
            return {
              actual: {
                lat: round.panorama?.lat || 0,
                lng: round.panorama?.lng || 0,
                heading: round.panorama?.heading,
                pitch: round.panorama?.pitch,
                zoom: round.panorama?.zoom,
              } as RoundData['actual'],
              myGuess: { lat: myGuess?.lat || 0, lng: myGuess?.lng || 0, score: myGuess?.score || 0, distance: myGuessDistance, time: myGuessTime },
              opponentGuess: { lat: opponentGuess?.lat || 0, lng: opponentGuess?.lng || 0, score: opponentGuess?.score || 0, distance: opponentGuessDistance, time: opponentGuessTime },
              roundNumber: round.roundNumber,
              countryCode: round.panorama?.countryCode?.toLowerCase() || '',
              duelId: duel.gameId,
              myPlayerId: mePlayer.playerId,
              opponentPlayerId: opponentPlayer.playerId,
              date: new Date(round.startTime),
              won: (myGuess?.score || 0) > (opponentGuess?.score || 0),
              scoreDelta: scoreDelta,
              distDelta: distDelta,
              timeDelta: timeDelta,
              multiplier: round.multiplier as number | undefined,
              damage: (round.multiplier !== undefined && round.multiplier !== null) ? scoreDelta * (round.multiplier as number) : undefined,
              gameMode: getGameMode(duel.options),
            } as RoundData;
          }).filter((r): r is RoundData => r !== null),
        }
        return processedDuel;
      })
      .filter((d): d is ProcessedDuel => d !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [duels]);

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

  const spatialIndex = useMemo(() => {
    if (!geoJsonData) return null;
    const index: Record<string, GeoJson['features']> = {};
    const gridSize = 10; // 10x10 degree cells
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

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading data...</div>;
  if (error) return <div className="flex min-h-screen items-center justify-center text-red-500">Error: {error}</div>;

  return (
    <main className="p-4">
      <ConfusionMatrix duels={processedDuels} geoJson={geoJsonData} countryStats={countryStats} spatialIndex={spatialIndex} />
    </main>
  );
}
