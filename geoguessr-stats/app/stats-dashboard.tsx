'use client';

import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Card,
  CardContent,
  CardDescription,
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

const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
})

// This should ideally be configurable by the user or from environment variables.
const MY_PLAYER_ID = '608a7f9394d95300015224ac'

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
        <Card className="flex flex-col h-full">
            <CardHeader className="px-7">
                <CardTitle>Stats By Country</CardTitle>
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

export default function StatsDashboard() {
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

        const duelsData: Duel[][] = await duelsResponse.json(); // Changed from any
        const geoJson: GeoJson = await geoJsonReponse.json();

        setDuels(duelsData.flat(Infinity) as Duel[]); // Flatten the duels array and assert type
        setGeoJsonData(geoJson);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
        console.error("Failed to fetch data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Consider adding more specific error handling for network issues or JSON parsing failures.

  const handleTabChange = (value: string) => {
      setActiveTab(value);
      if (value === 'countries') {
        setSelectedDuel(null);
        setSelectedRoundData(null);
      } else { // value === 'matches'
        setSelectedCountry(null);
        setSelectedCountryRounds(null); // Reset selectedCountryRounds
      }
    };

  const handleDuelSelect = (duel: ProcessedDuel) => {
    setSelectedDuel(duel);
    setSelectedRoundData(null);
    setSelectedCountry(null); // Reset selected country when a duel is selected
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

        // Add an `isMe` flag to each player for easier identification later
        const teamsWithIsMe = duel.teams.map(team => ({
          ...team,
          players: team.players.map(player => ({
            ...player,
            isMe: player.playerId === MY_PLAYER_ID,
          })),
        }));

        const meTeam = duel.teams.find(
          (t) => t.players[0]?.playerId === MY_PLAYER_ID
        )
        const opponentTeam = duel.teams.find(
          (t) => t.players[0]?.playerId !== MY_PLAYER_ID
        )

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
            // If no winningTeamId, it could be a draw or simply not finished/unknown
            if (myScore === opponentScore) {
                outcome = 'Draw';
            } else {
                outcome = 'Unknown';
            }
        }

        // The date is more reliable from the first round's startTime
        const gameDate = duel.rounds?.[0]?.startTime

        const processedDuel: ProcessedDuel = {
          ...duel,
          teams: teamsWithIsMe, // Use the teams with the 'isMe' flag
          date: new Date(gameDate || 0),
          myScore, // This is already a number
          opponentScore,
          outcome: outcome,
          gameMode: "unknown",
          rounds: duel.rounds?.map((round): RoundData | null => {
            const mePlayer = meTeam.players[0];
            const opponentPlayer = opponentTeam.players[0];
            const myGuess = mePlayer.guesses.find(g => g.roundNumber === round.roundNumber);
            const opponentGuess = opponentPlayer.guesses.find(g => g.roundNumber === round.roundNumber);
            const myGuessTime = myGuess ? (new Date(myGuess.created as string).getTime() - new Date(round.startTime as string).getTime()) / 1000 : 0;
            const opponentGuessTime = opponentGuess ? (new Date(opponentGuess.created as string).getTime() - new Date(round.startTime as string).getTime()) / 1000 : 0;
            const scoreDelta = (myGuess?.score || 0) - (opponentGuess?.score || 0);
            const myGuessDistance = (myGuess?.distance || 0) / 10;
            const opponentGuessDistance = (opponentGuess?.distance || 0) / 10;
            const distDelta = myGuessDistance - opponentGuessDistance;
            const timeDelta = myGuessTime - opponentGuessTime;

            return {
              actual: { lat: round.panorama?.lat || 0, lng: round.panorama?.lng || 0, heading: round.panorama?.heading, pitch: round.panorama?.pitch, zoom: round.panorama?.zoom },
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

      const myPlayer = duel.teams?.find(team => team.players.some(p => p.isMe))?.players[0];
      const opponentPlayer = duel.teams?.find(team => !team.players.some(p => p.isMe))?.players[0];

      if (!myPlayer || !opponentPlayer) return;

      duel.rounds.forEach((round) => {
        const countryCode = round.countryCode?.toLowerCase(); // Changed from round.panorama?.countryCode
        if (!countryCode) return;

        if (!stats[countryCode]) {
          stats[countryCode] = {
            wins: 0,
            losses: 0,
            draws: 0,
            totalRounds: 0,
            totalScoreDelta: 0,
            rounds: [],
          };
        }

        stats[countryCode].totalRounds++;
        const myGuess = myPlayer.guesses.find(g => g.roundNumber === round.roundNumber);
        const opponentGuess = opponentPlayer.guesses.find(g => g.roundNumber === round.roundNumber);

        if (myGuess && opponentGuess) {
            const scoreDelta = myGuess.score - opponentGuess.score;
            stats[countryCode].totalScoreDelta += scoreDelta;
            if (myGuess.score > opponentGuess.score) {
                stats[countryCode].wins++;
            } else if (myGuess.score < opponentGuess.score) {
                stats[countryCode].losses++;
            } else {
                stats[countryCode].draws++;
            }

            // Add the round data to the country stats
            stats[countryCode].rounds.push(round);
        }
      });
    });

    return Object.entries(stats).map(([countryCode, data]) => {
        const winRate = (data.wins / data.totalRounds) * 100;
        const avgScoreDelta = data.totalScoreDelta / data.totalRounds;
        return {
            countryCode,
            ...data,
            winRate,
            avgScoreDelta,
        };
    });
  }, [processedDuels]);

  useEffect(() => {
    // Only auto-select the most recent duel when we don't already have a selected round.
    // This prevents clicking a country-round (which sets selectedRoundData) from
    // causing the UI to auto-select and replace the rounds table.
    if (!selectedDuel && processedDuels.length > 0 && activeTab === 'matches' && !selectedRoundData) {
      setSelectedDuel(processedDuels[0]);
    }
  }, [processedDuels, activeTab, selectedDuel, selectedRoundData]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading data...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col flex-1 gap-4 md:gap-8 overflow-hidden">
      <QueryBuilder setFilters={setFilters} />
      <div className="grid flex-1 gap-4 lg:grid-cols-3 xl:grid-cols-3 overflow-hidden">
        <div className="flex flex-col gap-4 overflow-hidden">
          <Tabs defaultValue="matches" onValueChange={handleTabChange} className="flex flex-col flex-grow h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="matches">Recent Matches</TabsTrigger>
              <TabsTrigger value="countries">By Country</TabsTrigger>
            </TabsList>
            <TabsContent value="matches" className="flex-grow overflow-hidden">
              <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader className="px-7">
                  <CardTitle>Matches</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto p-0">
                  {filteredDuels.length > 0 ? (
                    <RecentMatchesTable duels={filteredDuels} onDuelSelect={handleDuelSelect} selectedDuel={selectedDuel} />
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No duels found.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="countries" className="flex-grow overflow-hidden">
              <CountryStatsTable stats={countryStats} onCountrySelect={handleCountrySelect} selectedCountry={selectedCountry} />
            </TabsContent>
          </Tabs>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2 overflow-hidden">
          {activeTab === 'matches' && (
            <div className="flex flex-col gap-4 h-full overflow-hidden">
              <Card>
                <CardHeader>
                  <CardTitle>Map View</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-96">
                    <Map activeTab={activeTab} roundData={selectedRoundData} geoJson={geoJsonData} countryStats={countryStats} selectedCountry={selectedCountry} onCountrySelect={handleCountrySelect} />
                  </div>
                </CardContent>
              </Card>
              <Card className="flex flex-col flex-grow overflow-hidden">
                <CardHeader>
                  <CardTitle>Match Details</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto">
                  {selectedDuel ? (
                    <>
                      <MatchRoundsTable viewMode="matches" rounds={selectedDuel.rounds} onRoundSelect={setSelectedRoundData} selectedRound={selectedRoundData} />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Details will appear here.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {activeTab === 'countries' && (
            <div className="flex flex-col gap-4 h-full overflow-hidden">
              <Card>
                <CardHeader>
                  <CardTitle>Map View</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-96">
                    <Map
                      activeTab={activeTab}
                      roundData={selectedRoundData}
                      geoJson={geoJsonData}
                      countryStats={countryStats}
                      selectedCountry={selectedCountry}
                      onCountrySelect={handleCountrySelect} />
                  </div>
                </CardContent>
              </Card>
              <Card className="flex flex-col flex-grow overflow-hidden">
                <CardHeader>
                  <CardTitle>Country Details</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto">
                  {selectedCountry ? (
                    <div>
                      {selectedCountryRounds && selectedCountryRounds.length > 0 ? (
                        <div className="mt-4">
                          <h3 className="text-lg font-semibold mb-2">Rounds for {selectedCountry.countryCode.toUpperCase()}</h3>
                          <MatchRoundsTable viewMode="countries" rounds={selectedCountryRounds} onRoundSelect={setSelectedRoundData} selectedRound={selectedRoundData} />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No rounds for this country.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Details will appear here.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
