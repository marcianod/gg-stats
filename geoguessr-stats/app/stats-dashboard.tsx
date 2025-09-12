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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { type Duel, type ProcessedDuel, type RoundData, type GeoJson, type CountryData } from '@/lib/types'
import { MatchRoundsTable } from './match-rounds-table'
import { RecentMatchesTable } from './recent-matches-table'
import { Button } from '@/components/ui/button'
import { ArrowUpDown } from 'lucide-react'

const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
})

// This should ideally be configurable by the user or from environment variables.
const MY_PLAYER_ID = '608a7f9394d95300015224ac'

type SortableCountryColumn = 'countryCode' | 'winRate' | 'avgScoreDelta' | 'totalRounds';

interface CountrySortConfig {
  key: SortableCountryColumn;
  direction: 'ascending' | 'descending';
}

function CountryStatsTable({ stats, onCountrySelect, selectedCountry }: { stats: CountryData[], onCountrySelect: (countryCode: string) => void, selectedCountry: CountryData | null }) {
    const [sortConfig, setSortConfig] = useState<CountrySortConfig>({ key: 'totalRounds', direction: 'descending' });

    const sortedStats = useMemo(() => {
        const sortableStats = [...stats];
        if (sortConfig.key) {
            sortableStats.sort((a, b) => {
                let aValue: string | number;
                let bValue: string | number;

                switch (sortConfig.key) {
                    case 'winRate':
                        aValue = (a.wins / a.totalRounds) * 100;
                        bValue = (b.wins / b.totalRounds) * 100;
                        break;
                    case 'avgScoreDelta':
                        aValue = a.totalScoreDelta / a.totalRounds;
                        bValue = b.totalScoreDelta / b.totalRounds;
                        break;
                    default:
                        aValue = a[sortConfig.key];
                        bValue = b[sortConfig.key];
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableStats;
    }, [stats, sortConfig]);

    const requestSort = (key: SortableCountryColumn) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (column: SortableCountryColumn) => {
        if (sortConfig.key !== column) {
            return <ArrowUpDown className="ml-2 h-4 w-4" />;
        }
        return sortConfig.direction === 'ascending' ? ' 🔼' : ' 🔽';
    };

    return (
        <Card>
            <CardHeader className="px-7">
                <CardTitle>Stats By Country</CardTitle>
                <CardDescription>
                    Aggregated statistics for each country.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('countryCode')}>
                                    Country{getSortIndicator('countryCode')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-right">
                                <Button variant="ghost" onClick={() => requestSort('winRate')}>
                                    Win Rate{getSortIndicator('winRate')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-right">
                                <Button variant="ghost" onClick={() => requestSort('avgScoreDelta')}>
                                    Avg. Score Δ{getSortIndicator('avgScoreDelta')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-right">
                                <Button variant="ghost" onClick={() => requestSort('totalRounds')}>
                                    Total Rounds{getSortIndicator('totalRounds')}
                                </Button>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedStats.map((stat) => (
                            <TableRow
                                key={stat.countryCode}
                                onClick={() => onCountrySelect(stat.countryCode)}
                                className={cn(
                                    'cursor-pointer',
                                    selectedCountry?.countryCode === stat.countryCode && 'bg-accent'
                                )}>
                                <TableCell>{stat.countryCode.toUpperCase()}</TableCell>
                                <TableCell className="text-right">
                                    {`${((stat.wins / stat.totalRounds) * 100).toFixed(1)}%`}
                                </TableCell>
                                <TableCell className="text-right">
                                    {`${(stat.totalScoreDelta / stat.totalRounds).toFixed(0)}`}
                                </TableCell>
                                <TableCell className="text-right">{stat.totalRounds}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
          rounds: duel.rounds && duel.rounds.map((round) => {
            const mePlayer = meTeam.players[0];
            const opponentPlayer = opponentTeam.players[0];
            const myGuess = mePlayer.guesses.find(g => g.roundNumber === round.roundNumber);
            const opponentGuess = opponentPlayer.guesses.find(g => g.roundNumber === round.roundNumber);
            const scoreDelta = (myGuess?.score ?? 0) - (opponentGuess?.score ?? 0);
            const distDelta = (myGuess?.distance ?? 0) - (opponentGuess?.distance ?? 0);
            const timeDelta = ((myGuess?.time ?? 0) - (opponentGuess?.time ?? 0));

            return {
              actual: { lat: round.panorama?.lat || 0, lng: round.panorama?.lng || 0, heading: round.panorama?.heading, pitch: round.panorama?.pitch, zoom: round.panorama?.zoom },
              myGuess: { lat: myGuess?.lat || 0, lng: myGuess?.lng || 0, score: myGuess?.score || 0, distance: myGuess?.distance || 0, time: myGuess?.time || 0 },
              opponentGuess: { lat: opponentGuess?.lat || 0, lng: opponentGuess?.lng || 0, score: opponentGuess?.score || 0, distance: opponentGuess?.distance || 0, time: opponentGuess?.time || 0 },
              roundNumber: round.roundNumber,
              countryCode: round.panorama?.countryCode?.toLowerCase() || '',
              duelId: duel.gameId,
              myPlayerId: mePlayer.playerId,
              opponentPlayerId: opponentPlayer.playerId,
              date: new Date(round.startTime),
              won: (myGuess?.score ?? 0) > (opponentGuess?.score ?? 0),
              scoreDelta: scoreDelta,
              distDelta: (myGuess?.distance ?? 0) - (opponentGuess?.distance ?? 0),
              timeDelta: (myGuess?.time ?? 0) - (opponentGuess?.time ?? 0),
            };
          }),
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
            const scoreDelta = (myGuess.score ?? 0) - (opponentGuess.score ?? 0);
            stats[countryCode].totalScoreDelta += scoreDelta;
            if ((myGuess.score ?? 0) > (opponentGuess.score ?? 0)) {
                stats[countryCode].wins++;
            } else if ((myGuess.score ?? 0) < (opponentGuess.score ?? 0)) {
                stats[countryCode].losses++;
            } else {
                stats[countryCode].draws++;
            }

            // Add the round data to the country stats
            stats[countryCode].rounds.push({ // The round object already contains all necessary data
                actual: { lat: round.actual.lat || 0, lng: round.actual.lng || 0, heading: round.actual.heading, pitch: round.actual.pitch, zoom: round.actual.zoom },
                myGuess: { lat: myGuess.lat || 0, lng: myGuess.lng || 0, score: myGuess.score || 0, distance: myGuess.distance || 0, time: myGuess.time || 0 },
                opponentGuess: { lat: opponentGuess.lat || 0, lng: opponentGuess.lng || 0, score: opponentGuess.score || 0, distance: opponentGuess.distance || 0, time: opponentGuess.time || 0 },
                roundNumber: round.roundNumber,
                countryCode: countryCode,
                duelId: duel.gameId,
                myPlayerId: myPlayer.playerId,
                opponentPlayerId: opponentPlayer.playerId,
                date: new Date(round.date),
                won: (myGuess.score ?? 0) > (opponentGuess.score ?? 0),
                scoreDelta: scoreDelta,
                distDelta: (myGuess.distance ?? 0) - (opponentGuess.distance ?? 0),
                timeDelta: (myGuess.time ?? 0) - (opponentGuess.time ?? 0),
            });
        }
      });
    });

    return Object.entries(stats).map(([countryCode, data]) => ({
        countryCode,
        ...data,
    }));
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-1 flex flex-col gap-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="countries">Countries</TabsTrigger>
          </TabsList>
          <TabsContent value="matches">
            <Card>
              <CardHeader className="px-7">
                <CardTitle>Recent Matches</CardTitle>
                <CardDescription>
                  A list of your most recent duels.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentMatchesTable
                  duels={processedDuels}
                  onDuelSelect={handleDuelSelect}
                  selectedDuel={selectedDuel}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="countries">
            <CountryStatsTable
              stats={countryStats}
              onCountrySelect={handleCountrySelect}
              selectedCountry={selectedCountry}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="lg:col-span-2">
        <div className="sticky top-0">
          <Map
            activeTab={activeTab}
            roundData={selectedRoundData}
            geoJson={geoJsonData}
            countryStats={countryStats}
            selectedCountry={selectedCountry}
            onCountrySelect={handleCountrySelect}
          />
        </div>
      </div>

      <div className="lg:col-span-3">
        {(activeTab === 'matches' && selectedDuel) && (
          <MatchRoundsTable
            rounds={selectedDuel.rounds ?? []}
            onRoundSelect={setSelectedRoundData}
            selectedRound={selectedRoundData}
          />
        )}
        {(activeTab === 'countries' && selectedCountryRounds) && (
          <MatchRoundsTable
            rounds={selectedCountryRounds}
            onRoundSelect={setSelectedRoundData}
            selectedRound={selectedRoundData}
          />
        )}
      </div>
    </div>
  );
}
