export interface Guess {
  roundNumber: number
  score: number
  [key: string]: unknown
}

export interface Player {
  id: string
  playerId: string
  guesses: Guess[]
}

export interface Team {
  id: string
  players: Player[]
}

export interface Round {
  roundNumber: number
  startTime: string
  [key: string]: unknown
}

export interface Duel {
  gameId: string
  rounds?: Round[]
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

export interface ProcessedDuel extends Duel {
  date: Date
  myScore: number
  opponentScore: number
  outcome: 'Win' | 'Loss' | 'Draw' | 'Unknown'
}
