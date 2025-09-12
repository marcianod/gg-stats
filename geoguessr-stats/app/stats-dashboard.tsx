'use client'

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

const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
})

// This should be configured by the user. I've taken it from your old project.
const MY_PLAYER_ID = '608a7f9394d95300015224ac'

function CountryStatsTable({ stats, onCountrySelect, selectedCountry }: { stats: CountryData[], onCountrySelect: (country: CountryData) => void, selectedCountry: CountryData | null }) {
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
                            <TableHead>Country</TableHead>
                            <TableHead className="text-right">Win Rate</TableHead>
                            <TableHead className="text-right">Avg. Score Δ</TableHead>
                            <TableHead className="text-right">Total Rounds</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.map((stat) => (
                            <TableRow 
                                key={stat.countryCode} 
                                onClick={() => onCountrySelect(stat)}
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

        const duelsData: Duel[] = await duelsResponse.json();
        const geoJson: GeoJson = await geoJsonReponse.json();

        setDuels(duelsData.flat(Infinity)); // Flatten the duels array
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
      }
    };

  const handleDuelSelect = (duel: ProcessedDuel) => {
    setSelectedDuel(duel);
    setSelectedRoundData(null);
  }

  const handleCountrySelect = (country: CountryData) => {
    setSelectedCountry(country);
    const roundsForCountry: RoundData[] = [];
    processedDuels.forEach(duel => {
      duel.rounds?.forEach(round => {
        if (round.panorama?.countryCode?.toLowerCase() === country.countryCode) {
          // Need to transform the round data to RoundData type
          // This is a simplified version, you might need more data from the original round
          roundsForCountry.push({
            actual: { lat: round.panorama.lat, lng: round.panorama.lng },
            myGuess: { lat: duel.teams?.[0]?.players?.[0]?.guesses?.find(g => g.roundNumber === round.roundNumber)?.lat || 0, lng: duel.teams?.[0]?.players?.[0]?.guesses?.find(g => g.roundNumber === round.roundNumber)?.lng || 0 },
            opponentGuess: { lat: duel.teams?.[1]?.players?.[0]?.guesses?.find(g => g.roundNumber === round.roundNumber)?.lat || 0, lng: duel.teams?.[1]?.players?.[0]?.guesses?.find(g => g.roundNumber === round.roundNumber)?.lng || 0 },
            roundNumber: round.roundNumber,
          });
        }
      });
    });
    setSelectedCountryRounds(roundsForCountry);
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

        const myScore = meTeam.players[0].guesses.reduce((sum, g) => sum + g.score, 0)
        const opponentScore = opponentTeam.players[0].guesses.reduce((sum, g) => sum + g.score, 0)

        const result =
          duel.result?.winningTeamId === meTeam.id
            ? 'Win'
            : duel.result?.winningTeamId
            ? 'Loss'
            : 'Draw'

        // The date is more reliable from the first round's startTime
        const gameDate = duel.rounds?.[0]?.startTime

        const processedDuel: ProcessedDuel = {
          ...duel,
          teams: teamsWithIsMe, // Use the teams with the 'isMe' flag
          date: new Date(gameDate || 0),
          myScore, // This is already a number
          opponentScore,
          outcome: result, // Renamed 'result' to 'outcome' to match ProcessedDuel type
          rounds: duel.rounds.map((round, index) => {
            const mePlayer = meTeam.players[0];
            const opponentPlayer = opponentTeam.players[0];
            const myGuess = mePlayer.guesses.find(g => g.roundNumber === round.roundNumber);
            const opponentGuess = opponentPlayer.guesses.find(g => g.roundNumber === round.roundNumber);
            const scoreDelta = (myGuess?.score || 0) - (opponentGuess?.score || 0);
            const distDelta = (myGuess?.distance || 0) - (opponentGuess?.distance || 0);
            const timeDelta = ((myGuess?.time || 0) - (opponentGuess?.time || 0));

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
              won: (myGuess?.score || 0) > (opponentGuess?.score || 0),
              scoreDelta: scoreDelta,
              distDelta: distDelta,
              timeDelta: timeDelta,
            };
          }),
        }
        return processedDuel;
      })
      .filter((d): d is ProcessedDuel => d !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime())

  const countryStats: CountryData[] = useMemo(() => {
    const stats: Record<string, {
        wins: number;
        losses: number;
        draws: number;
        totalRounds: number;
        totalScoreDelta: number;
    }> = {};

    processedDuels.forEach((duel) => {
      if (!duel.rounds) return;

      const myPlayer = duel.teams?.find(team => team.players.some(p => p.isMe))?.players[0];
      const opponentPlayer = duel.teams?.find(team => !team.players.some(p => p.isMe))?.players[0];

      if (!myPlayer || !opponentPlayer) return;

      duel.rounds.forEach((round, index) => {
        const countryCode = round.panorama?.countryCode;
        if (!countryCode) return;

        if (!stats[countryCode]) {
          stats[countryCode] = {
            wins: 0,
            losses: 0,
            draws: 0,
            totalRounds: 0,
            totalScoreDelta: 0,
          };
        }

        stats[countryCode].totalRounds++;
        const myGuess = myPlayer.guesses[index];
        const opponentGuess = opponentPlayer.guesses[index];

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
        }
      });
    });

    return Object.entries(stats).map(([countryCode, data]) => ({
        countryCode,
        ...data,
        rounds: processedDuels.flatMap(duel => duel.rounds.filter(round => round.countryCode === countryCode))
    }));
  }, [processedDuels]);

  // Select the most recent duel by default
  if (!selectedDuel && processedDuels.length > 0 && activeTab === 'matches') {
    setSelectedDuel(processedDuels[0]);
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading data...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-1">
        <Tabs defaultValue="matches" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="matches">Recent Matches</TabsTrigger>
            <TabsTrigger value="countries">By Country</TabsTrigger>
          </TabsList>
          <TabsContent value="matches">
            <Card>
              <CardHeader className="px-7">
                <CardTitle>Matches</CardTitle>
                <CardDescription>
                  A list of your recent GeoGuessr duels. ({processedDuels.length}{' '}
                  games loaded)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {processedDuels.length > 0 ? (
                  processedDuels.map((duel) => (
                    <button
                      key={duel.gameId}
                      onClick={() => handleDuelSelect(duel)}
                      className={cn(
                        'rounded-lg border bg-card p-3 text-left text-sm transition-all hover:bg-accent',
                        selectedDuel?.gameId === duel.gameId && 'bg-accent'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">
                          {duel.options?.map?.name ?? 'Unknown Map'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {duel.date.toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No duels found.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
           <TabsContent value="countries">
            <CountryStatsTable stats={countryStats} onCountrySelect={setSelectedCountry} selectedCountry={selectedCountry} />
          </TabsContent>
        </Tabs>
      </div>
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        {activeTab === 'matches' && (
            <Card className="min-h-[80vh]">
            <CardHeader>
                <CardTitle>Match Details</CardTitle>
                <CardDescription>
                {selectedDuel
                    ? selectedDuel.options?.map?.name ?? 'Unknown Map'
                    : 'Select a match from the list to see its details.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {selectedDuel ? (
                <div className="flex flex-col h-[75vh]">
                    <div className="h-96 w-full">
                        <Map activeTab={activeTab} roundData={selectedRoundData} geoJson={geoJsonData} countryStats={countryStats} selectedCountry={selectedCountry} onCountrySelect={handleCountrySelect} />
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        <p>Final Score: {selectedDuel.myScore} - {selectedDuel.opponentScore}</p>
                        <p>Result: {selectedDuel.outcome}</p>
                        <MatchRoundsTable duel={selectedDuel} onRoundSelect={setSelectedRoundData} selectedRound={selectedRoundData} />
                    </div>
                </div>
                ) : (
                <p className="text-sm text-muted-foreground">
                    Details will appear here.
                </p>
                )}
            </CardContent>
            </Card>
        )}
        {activeTab === 'countries' && (
            <Card className="min-h-[80vh]">
            <CardHeader>
                <CardTitle>Country Details</CardTitle>
                <CardDescription>
                {selectedCountry
                    ? `Stats for ${selectedCountry.countryCode.toUpperCase()}`
                    : 'Select a country to see details.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col h-[75vh]">
                <div className="h-96 w-full">
                    <Map 
                        activeTab={activeTab} 
                        roundData={null} 
                        geoJson={geoJsonData} 
                        countryStats={countryStats} 
                        selectedCountry={selectedCountry} 
                        onCountrySelect={handleCountrySelect} />
                </div>
                <div className="flex-grow overflow-y-auto">
                    {selectedCountry ? (
                    <div>
                        <p>Win Rate: {((selectedCountry.wins / selectedCountry.totalRounds) * 100).toFixed(1)}%</p>
                        <p>Avg. Score Δ: {(selectedCountry.totalScoreDelta / selectedCountry.totalRounds).toFixed(0)}</p>
                        <p>Total Rounds: {selectedCountry.totalRounds}</p>
                    </div>
                    ) : (
                    <p className="text-sm text-muted-foreground">
                        Details will appear here.
                    </p>
                    )}
                </div>
            </CardContent>
            </Card>
        )}
      </div>
    </div>
  )
}