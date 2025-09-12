import { FeatureCollection, Geometry } from 'geojson';

export interface Guess {
  roundNumber: number;
  score: number;
  distance?: number;
  time?: number;
  lat: number;
  lng: number;
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
  rounds: RoundData[];
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
}
