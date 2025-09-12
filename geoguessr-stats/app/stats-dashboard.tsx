'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// A more detailed Duel type to safely access nested properties
interface Player {
  id: string
  playerId: string
  totalScore: number
}

interface Team {
  id: string
  players: Player[]
}

interface Duel {
  gameId: string
  created?: string
  startTime?: string
  options?: {
    map?: {
      name?: string
    }
  }
  teams?: Team[]
  result?: {
    winningTeamId?: string
  }
  [key: string]: unknown
}

// This should be configured by the user. I've taken it from your old project.
const MY_PLAYER_ID = '608a7f9394d95300015224ac'

export default function StatsDashboard({ allDuels }: { allDuels: Duel[] }) {
  const [selectedDuel, setSelectedDuel] = useState<Duel | null>(null)

  const getScores = (duel: Duel) => {
    if (!duel.teams || duel.teams.length < 2) {
      return { myScore: 'N/A', opponentScore: 'N/A', result: 'Unknown' }
    }

    const meTeam = duel.teams.find(
      (t) => t.players[0]?.playerId === MY_PLAYER_ID
    )
    const opponentTeam = duel.teams.find(
      (t) => t.players[0]?.playerId !== MY_PLAYER_ID
    )

    if (!meTeam || !opponentTeam) {
      return { myScore: 'N/A', opponentScore: 'N/A', result: 'Unknown' }
    }

    const result =
      duel.result?.winningTeamId === meTeam.id
        ? 'Win'
        : duel.result?.winningTeamId
        ? 'Loss'
        : 'Draw'

    return {
      myScore: meTeam.players[0]?.totalScore ?? 'N/A',
      opponentScore: opponentTeam.players[0]?.totalScore ?? 'N/A',
      result,
    }
  }

  return (
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-1">
        <Tabs defaultValue="matches">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="matches">Recent Matches</TabsTrigger>
            <TabsTrigger value="countries">By Country</TabsTrigger>
          </TabsList>
          <TabsContent value="matches">
            <Card>
              <CardHeader className="px-7">
                <CardTitle>Matches</CardTitle>
                <CardDescription>
                  A list of your recent GeoGuessr duels. ({allDuels.length}{' '}
                  games loaded)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {allDuels.length > 0 ? (
                  allDuels.map((duel) => (
                    <button
                      key={duel.gameId}
                      onClick={() => setSelectedDuel(duel)}
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
                          {new Date(
                            duel.created ?? duel.startTime!
                          ).toLocaleDateString()}
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
        </Tabs>
      </div>
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <Card className="min-h-[60vh]">
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
              <div>
                <p>
                  Final Score: {getScores(selectedDuel).myScore} -{' '}
                  {getScores(selectedDuel).opponentScore}
                </p>
                <p>Result: {getScores(selectedDuel).result}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Details will appear here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
