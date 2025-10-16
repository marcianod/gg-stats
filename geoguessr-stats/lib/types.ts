import { FeatureCollection, Geometry } from 'geojson';

export interface Guess {
  roundNumber: number;
  score: number;
  distance?: number;
  time?: number;
  lat: number;
  lng: number;
  created?: string;
  [key: string]: unknown;
}

export interface Player {
  playerId: string;
  guesses: Guess[];
  isMe?: boolean;
  progressChange?: {
    rankedSystemProgress?: {
      ratingBefore?: number;
      ratingAfter?: number;
    };
  };
  rankedSystemProgress?: {
    mmr?: number;
  };
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
    lat: number;
    lng: number;
    countryCode?: string;
    heading?: number; // Added this line
    pitch?: number;   // Added this line
    zoom?: number;    // Added this line
  };
  [key: string]: unknown;
}

export interface Duel {
  gameId: string;
  created?: string;
  rounds?: Round[];
  options?: {
    map?: {
      name?: string;
    };
    movementOptions?: {
      forbidMoving?: boolean;
      forbidZooming?: boolean;
      forbidPanning?: boolean;
    };
  };
  teams?: Team[];
  result?: {
    winningTeamId?: string;
  };
  [key: string]: unknown;
}

export interface ProcessedDuel {
  gameId: string;
  rounds: RoundData[];
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
  date: Date;
  myScore: number;
  opponentScore: number;
  outcome: "Win" | "Loss" | "Draw" | "Unknown";
  gameMode: string;
  mmr?: number;
  mmrChange?: number;
}

export interface RoundData {
  actual: {
    lat: number;
    lng: number;
    heading?: number;
    pitch?: number;
    zoom?: number;
  };
  myGuess: {
    lat: number;
    lng: number;
    score: number;
    distance: number;
    time: number;
  };
  opponentGuess: {
    lat: number;
    lng: number;
    score: number;
    distance: number;
    time: number;
  };
  roundNumber: number;
  countryCode: string;
  duelId: string;
  myPlayerId: string;
  opponentPlayerId: string;
  date: Date;
  won: boolean;
  scoreDelta: number;
  distDelta: number;
  timeDelta: number;
  multiplier?: number;
  damage?: number;
  gameMode?: string;
}

export interface VibeLocation {
  lat: number;
  lng: number;
  heading?: number;
  pitch?: number;
  zoom?: number;
  performanceValue: number;
  round: RoundData;
}

export interface CountryProperties {
    'ISO3166-1-Alpha-2': string;
    name: string;
    [key: string]: unknown; // Allow other properties
}

export type GeoJson = FeatureCollection<Geometry, CountryProperties>;

export interface CountryData {
    countryCode: string;
    wins: number;
    losses: number;
    draws: number;
    totalRounds: number;
    totalScoreDelta: number;
    rounds: RoundData[];
    winRate: number;
    avgScoreDelta: number;
}

export interface AllRoundsData {
  originalIndex: number;
  gameId: string;
  roundNumber: number;
  mapName?: string;
  date: Date;
  countryCode: string;
  myScore: number;
  opponentScore: number;
  scoreDelta: number;
  myDistance: number;
  opponentDistance: number;
  distDelta: number;
  myTime: number;
  opponentTime: number;
  timeDelta: number;
  won: boolean;
  mmr?: number;
  mmrChange?: number;
  opponentId?: string;
  gameMode?: string;
  multiplier?: number;
  damage?: number;
}
