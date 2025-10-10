import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Duel, ProcessedDuel, RoundData } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFlagEmoji(countryCode: string | undefined) {
    if (!countryCode || countryCode.length !== 2) return '🏴‍☠️';
    return String.fromCodePoint(...countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0)));
}

function getGameMode(options?: { map?: { name?: string; }; movementOptions?: { forbidMoving?: boolean; forbidZooming?: boolean; forbidPanning?: boolean; }; }) {
    if (!options?.movementOptions) return 'MOVE';
    if (options.movementOptions.forbidMoving && options.movementOptions.forbidZooming) return 'NMPZ';
    if (options.movementOptions.forbidMoving) return 'NM';
    return 'MOVE';
}

export function processDuels(duels: Duel[], myPlayerId: string): ProcessedDuel[] {
  const mappedDuels = duels
    .map((duel) => {
      if (!duel.teams || duel.teams.length < 2 || !duel.rounds || duel.rounds.length === 0) {
        return null
      }
      const teamsWithIsMe = duel.teams.map(team => ({
        ...team,
        players: team.players.map(player => ({
          ...player,
          isMe: player.playerId === myPlayerId,
        })),
      }));
      const meTeam = duel.teams.find((t) => t.players[0]?.playerId === myPlayerId)
      const opponentTeam = duel.teams.find((t) => t.players[0]?.playerId !== myPlayerId)
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
        gameMode: getGameMode(duel.options),
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
            multiplier: round.multiplier as number | undefined,
            damage: (round.multiplier !== undefined && round.multiplier !== null) ? scoreDelta * (round.multiplier as number) : undefined,
            gameMode: getGameMode(duel.options),
          } as RoundData;
        }).filter((r): r is RoundData => r !== null),
      }
      return processedDuel;
    })
    .filter((d): d is ProcessedDuel => d !== null);

  const sortedDuels = mappedDuels.sort((a, b) => {
      const timeA = new Date(a.teams?.[0]?.players?.[0]?.guesses?.[0]?.created || 0).getTime();
      const timeB = new Date(b.teams?.[0]?.players?.[0]?.guesses?.[0]?.created || 0).getTime();
      if(isNaN(timeA) || isNaN(timeB)) {
          return 0;
      }
      return timeB - timeA;
    });
  
  return sortedDuels;
}
