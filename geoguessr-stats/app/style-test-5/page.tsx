'use client';

import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Duel, type ProcessedDuel, type RoundData, type GeoJson, type CountryData } from '@/lib/types'
import { MatchRoundsTable } from '../match-rounds-table'
import { RecentMatchesTable } from '../recent-matches-table'
import { SortableTable, type ColumnDef } from '@/components/ui/sortable-table'
import { QueryBuilder } from '@/components/ui/query-builder'
import { applyFilters, type Filter } from '@/lib/filters'

const Map = dynamic(() => import('../../components/Map'), {
  ssr: false,
})

// This should ideally be configurable by the user or from environment variables.
const MY_PLAYER_ID = '608a7f9394d95300015224ac'

function getGameMode(movementOptions?: { forbidMoving?: boolean; forbidZooming?: boolean; forbidPanning?: boolean; }) {
    if (!movementOptions) return 'moving';
    if (movementOptions.forbidMoving && movementOptions.forbidZooming) return 'nmpz';
    if (movementOptions.forbidMoving) return 'nomove';
    return 'moving';
}

function CountryStatsTable({ stats, onCountrySelect, selectedCountry }: { stats: CountryData[], onCountrySelect: (countryCode: string) => void, selectedCountry: CountryData | null }) {
    const columns: ColumnDef<CountryData>[] = [
        {
            accessorKey: 'countryCode',
            header: 'Country',
            cell: (row) => row.countryCode.toUpperCase(),
            width: '25%',
        },
        {
            accessorKey: 'winRate',
            header: 'Win Rate',
            cell: (row) => `${((row.wins / row.totalRounds) * 100).toFixed(1)}%`,
            className: 'text-right',
            width: '25%',
        },
        {
            accessorKey: 'avgScoreDelta',
            header: 'Avg. Score Δ',
            cell: (row) => `${(row.totalScoreDelta / row.totalRounds).toFixed(0)}`,
            className: 'text-right',
            width: '25%',
        },
        {
            accessorKey: 'totalRounds',
            header: 'Total Rounds',
            className: 'text-right',
            width: '25%',
        },
    ];

    return (
        <SortableTable
            columns={columns}
            data={stats}
            onRowClick={(row) => onCountrySelect(row.countryCode)}
            selectedRow={selectedCountry}
            initialSortKey="totalRounds"
        />
    );
}

export default function StyleTestPage5() {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<GeoJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('matches');
  const [selectedDuel, setSelectedDuel] = useState<ProcessedDuel | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [selectedRoundData, setSelectedRoundData] = useState<RoundData | null>(null);
  const [selectedCountryRounds, setSelectedCountryRounds] = useState<RoundData[] | null>(null);
  const [filters, setFilters] = useState<Filter[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [duelsResponse, geoJsonReponse] = await Promise.all([
          fetch('/geoguessr_stats.json'),
          fetch('/countries.geojson'),
        ]);

        if (!duelsResponse.ok) {
          throw new Error(`HTTP error! status: ${duelsResponse.status} for duels.json`);
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

  const handleTabChange = (value: string) => {
      setActiveTab(value);
      if (value === 'countries') {
        setSelectedDuel(null);
        setSelectedRoundData(null);
      } else {
        setSelectedCountry(null);
        setSelectedCountryRounds(null);
      }
    };

  const handleDuelSelect = (duel: ProcessedDuel) => {
    setSelectedDuel(duel);
    setSelectedRoundData(null);
    setSelectedCountry(null);
  }

  const handleCountrySelect = (countryCode: string) => {
    const country = countryStats.find(c => c.countryCode === countryCode) || null;
    setSelectedCountry(country);
    setSelectedCountryRounds(country?.rounds ?? null);
  };

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
        const gameDate = duel.rounds?.[0]?.startTime
        const processedDuel: ProcessedDuel = {
          ...duel,
          teams: teamsWithIsMe,
          date: new Date(gameDate || 0),
          myScore,
          opponentScore,
          outcome: outcome,
          gameMode: getGameMode(duel.options as any),
          rounds: duel.rounds?.map((round) => {
            const myGuess = mePlayer.guesses.find(g => g.roundNumber === round.roundNumber);
            const opponentGuess = opponentPlayer.guesses.find(g => g.roundNumber === round.roundNumber);
            if (!myGuess || !opponentGuess) return null;
            const myGuessTime = myGuess ? (new Date(myGuess.created as string).getTime() - new Date(round.startTime as string).getTime()) / 1000 : 0;
            const opponentGuessTime = opponentGuess ? (new Date(opponentGuess.created as string).getTime() - new Date(round.startTime as string).getTime()) / 1000 : 0;
            const scoreDelta = (myGuess?.score || 0) - (opponentGuess?.score || 0);
            const distDelta = (myGuess?.distance || 0) - (opponentGuess?.distance || 0);
            const timeDelta = myGuessTime - opponentGuessTime;
            return {
              actual: { lat: round.panorama?.lat || 0, lng: round.panorama?.lng || 0, heading: round.panorama?.heading, pitch: round.panorama?.pitch, zoom: round.panorama?.zoom },
              myGuess: { lat: myGuess?.lat || 0, lng: myGuess?.lng || 0, score: myGuess?.score || 0, distance: myGuess?.distance || 0, time: myGuessTime },
              opponentGuess: { lat: opponentGuess?.lat || 0, lng: opponentGuess?.lng || 0, score: opponentGuess?.score || 0, distance: opponentGuess?.distance || 0, time: opponentGuessTime },
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
            };
          }).filter((r): r is RoundData => r !== null),
        }
        return processedDuel;
      })
      .filter((d): d is ProcessedDuel => d !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [duels]);

  const filteredDuels = useMemo(() => {
    return applyFilters(processedDuels, filters);
  }, [processedDuels, filters]);

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

  useEffect(() => {
    if (activeTab === 'matches' && filteredDuels.length > 0) {
      handleDuelSelect(filteredDuels[0]);
    } else if (activeTab === 'countries' && countryStats.length > 0) {
      handleCountrySelect(countryStats[0].countryCode);
    }
  }, [activeTab, filteredDuels, countryStats]);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading data...</div>;
  if (error) return <div className="flex min-h-screen items-center justify-center text-red-500">Error: {error}</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="p-4 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-2xl font-bold">GeoGuessr Stats Dashboard</h1>
        <div className="mt-2">
          <QueryBuilder setFilters={setFilters} />
        </div>
      </header>
      
      <main className="flex-grow flex flex-col overflow-hidden">
        <div className="flex-grow p-4 overflow-y-auto">
          <Tabs defaultValue="matches" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="matches">Recent Matches</TabsTrigger>
              <TabsTrigger value="countries">By Country</TabsTrigger>
            </TabsList>
            <TabsContent value="matches">
              <Card className="mt-4">
                <CardContent className="p-0">
                  <RecentMatchesTable duels={filteredDuels} onDuelSelect={handleDuelSelect} selectedDuel={selectedDuel} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="countries">
              <Card className="mt-4">
                <CardContent className="p-0">
                  <CountryStatsTable stats={countryStats} onCountrySelect={handleCountrySelect} selectedCountry={selectedCountry} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <footer className="grid grid-cols-12 gap-4 p-4 border-t bg-white dark:bg-gray-800 dark:border-gray-700 h-2/5">
          <div className="col-span-7 flex flex-col overflow-hidden">
            <h3 className="font-semibold mb-2 text-lg">
              {activeTab === 'matches' ? 'Match Details' : 'Country Details'}
            </h3>
            <div className="flex-grow overflow-y-auto rounded-lg border dark:border-gray-700">
              {activeTab === 'matches' && selectedDuel && (
                <MatchRoundsTable viewMode="matches" rounds={selectedDuel.rounds} onRoundSelect={setSelectedRoundData} selectedRound={selectedRoundData} />
              )}
              {activeTab === 'countries' && selectedCountryRounds && (
                <MatchRoundsTable viewMode="countries" rounds={selectedCountryRounds} onRoundSelect={setSelectedRoundData} selectedRound={selectedRoundData} />
              )}
            </div>
          </div>
          <div className="col-span-5 h-full rounded-lg overflow-hidden border dark:border-gray-700">
            <Map activeTab={activeTab} roundData={selectedRoundData} geoJson={geoJsonData} countryStats={countryStats} selectedCountry={selectedCountry} onCountrySelect={handleCountrySelect} />
          </div>
        </footer>
      </main>
    </div>
  )
}
