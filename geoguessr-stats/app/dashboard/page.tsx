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
import { MatchRoundsTable } from '@/app/match-rounds-table'
import { RecentMatchesTable } from '@/app/recent-matches-table'
import { SortableTable, type ColumnDef } from '@/components/ui/sortable-table'
import { QueryBuilder } from '@/components/ui/query-builder'
import { applyFilters, type Filter } from '@/lib/filters'
import { type MapProps } from '@/components/Map';

const Map = dynamic<MapProps>(() => import('@/components/Map'), {
  ssr: false,
})

// This should ideally be configurable by the user or from environment variables.
const MY_PLAYER_ID = '608a7f9394d95300015224ac'

function getGameMode(options?: { movementOptions?: { forbidMoving?: boolean; forbidZooming?: boolean; forbidPanning?: boolean; } }) {
    if (!options?.movementOptions) return 'MOVE';
    if (options.movementOptions.forbidMoving && options.movementOptions.forbidZooming) return 'NMPZ';
    if (options.movementOptions.forbidMoving) return 'NM';
    return 'MOVE';
}

import { getFlagEmoji } from '@/lib/utils';

function CountryStatsTable({ stats, onCountrySelect, selectedCountry, geoJson }: { stats: CountryData[], onCountrySelect: (countryCode: string) => void, selectedCountry: CountryData | null, geoJson: GeoJson | null }) {
    const countryNames = useMemo(() => {
        if (!geoJson) return {};
        return geoJson.features.reduce((acc, feature) => {
            acc[feature.properties['ISO3166-1-Alpha-2'].toLowerCase()] = feature.properties.name;
            return acc;
        }, {} as Record<string, string>);
    }, [geoJson]);

    const columns: ColumnDef<CountryData>[] = [
        {
            accessorKey: 'countryCode',
            header: 'Country',
            cell: (row) => (
                <div className="flex items-center">
                    <span className="mr-2">{getFlagEmoji(row.countryCode)}</span>
                    <span>{countryNames[row.countryCode.toLowerCase()] || row.countryCode.toUpperCase()}</span>
                </div>
            ),
            width: '40%',
        },
        {
            accessorKey: 'winRate',
            header: 'Win %',
            cell: (row) => `${((row.wins / row.totalRounds) * 100).toFixed(1)}%`,
            className: 'text-right',
            width: '15%',
        },
        {
            accessorKey: 'avgScoreDelta',
            header: 'Avg Δ',
            cell: (row) => {
                const avgScoreDelta = row.totalScoreDelta / row.totalRounds;
                const textColor = avgScoreDelta > 0 ? 'text-green-600' : avgScoreDelta < 0 ? 'text-red-600' : '';
                return <span className={textColor}>{avgScoreDelta.toFixed(0)}</span>;
            },
            className: 'text-right',
            width: '15%',
        },
        {
            accessorKey: 'totalScoreDelta',
            header: 'Total Δ',
            cell: (row) => {
                const textColor = row.totalScoreDelta > 0 ? 'text-green-600' : row.totalScoreDelta < 0 ? 'text-red-600' : '';
                return <span className={textColor}>{row.totalScoreDelta.toFixed(0)}</span>;
            },
            className: 'text-right',
            width: '15%',
        },
        {
            accessorKey: 'totalRounds',
            header: 'R',
            cell: (row) => row.totalRounds,
            className: 'text-right',
            width: '15%',
        },
    ];

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="px-7 py-4">
                <CardTitle className="text-lg">By Country</CardTitle>
                <div className="text-sm text-muted-foreground">CountryStatsTable</div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
                <SortableTable
                    columns={columns}
                    data={stats}
                    onRowClick={(row) => onCountrySelect(row.countryCode)}
                    selectedRow={selectedCountry}
                    initialSortKey="totalRounds"
                />
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<GeoJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('matches');
  const [selectedDuel, setSelectedDuel] = useState<ProcessedDuel | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [selectedRoundData, setSelectedRoundData] = useState<RoundData | null>(null);
  const [selectedCountryRounds, setSelectedCountryRounds] = useState<RoundData[] | null>(null);
  const [filters, setFilters] = useState<Filter<ProcessedDuel>[]>([]);

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
          gameMode: getGameMode(duel.options as any),
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
              multiplier: round.multiplier,
              damage: (round.multiplier !== undefined && round.multiplier !== null) ? scoreDelta * (round.multiplier as number) : undefined,
              gameMode: getGameMode(duel.options as any),
            } as RoundData;
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
    if (!selectedDuel && processedDuels.length > 0 && activeTab === 'matches' && !selectedRoundData) {
      setSelectedDuel(processedDuels[0]);
    }
  }, [processedDuels, activeTab, selectedDuel, selectedRoundData]);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading data...</div>;
  if (error) return <div className="flex min-h-screen items-center justify-center text-red-500">Error: {error}</div>;

  return (
    <>
      <header className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">GeoGuessr Stats Dashboard</h1>
        <div className="mt-2">
          <QueryBuilder setFilters={setFilters} />
        </div>
      </header>
      
      <main className="grid grid-cols-12 flex-grow gap-4 p-4 overflow-hidden">
        {/* Master List Panel */}
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
          <Tabs defaultValue="matches" onValueChange={handleTabChange} className="flex flex-col flex-grow h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="matches">Recent Matches</TabsTrigger>
              <TabsTrigger value="countries">By Country</TabsTrigger>
            </TabsList>
            <TabsContent value="matches" className="flex-grow overflow-hidden">
              <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-base">Matches</CardTitle>
                  <div className="text-sm text-muted-foreground">RecentMatchesTable</div>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto p-0">
                  {filteredDuels.length > 0 ? (
                    <RecentMatchesTable duels={filteredDuels} onDuelSelect={handleDuelSelect} selectedDuel={selectedDuel} />
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">No duels found.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="countries" className="flex-grow overflow-hidden">
              <CountryStatsTable stats={countryStats} onCountrySelect={handleCountrySelect} selectedCountry={selectedCountry} geoJson={geoJsonData} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Detail Panel */}
        <div className="col-span-8 flex flex-col gap-4 overflow-hidden">
          <Card className="overflow-hidden h-1/2">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">Map View</CardTitle>
              <div className="text-sm text-muted-foreground">Map</div>
            </CardHeader>
            <CardContent className="h-full">
              <Map activeTab={activeTab} roundData={selectedRoundData} geoJson={geoJsonData} countryStats={countryStats} selectedCountry={selectedCountry} onCountrySelect={handleCountrySelect} />
            </CardContent>
          </Card>
          <Card className="flex-grow flex flex-col overflow-hidden h-1/2">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">
                {activeTab === 'matches' ? 'Match Details' : 'Country Details'}
              </CardTitle>
              <div className="text-sm text-muted-foreground">MatchRoundsTable</div>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto p-1">
              {activeTab === 'matches' && selectedDuel && (
                <MatchRoundsTable viewMode="matches" rounds={selectedDuel.rounds} onRoundSelect={setSelectedRoundData} selectedRound={selectedRoundData} />
              )}
              {activeTab === 'countries' && selectedCountryRounds && (
                <MatchRoundsTable viewMode="countries" rounds={selectedCountryRounds} onRoundSelect={setSelectedRoundData} selectedRound={selectedRoundData} />
              )}
              {!selectedDuel && !selectedCountryRounds && (
                <p className="p-4 text-sm text-muted-foreground">Details will appear here.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
