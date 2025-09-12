export interface Guess {
  roundNumber: number;
  score: number;
  distance?: number;
  time?: number;
  [key: string]: unknown;
}

export interface Player {
  playerId: string;
  guesses: Guess[];
  isMe?: boolean;
  [key: string]: unknown;
}

export interface Team {
  id: string;
  players: Player[];
}

export interface Round {
  roundNumber: number;
  startTime: string;
  panorama?: {
    countryCode?: string;
  };
  [key: string]: unknown;
}

export interface Duel {
  gameId: string;
  rounds?: Round[];
  options?: {
    map?: {
      name?: string;
    };
  };
  teams?: Team[];
  result?: {
    winningTeamId?: string;
  };
  [key: string]: unknown;
}

export interface ProcessedDuel extends Duel {
  date: Date;
  myScore: number;
  opponentScore: number;
  outcome: "Win" | "Loss" | "Draw" | "Unknown";
}