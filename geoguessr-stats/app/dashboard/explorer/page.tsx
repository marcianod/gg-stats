'use client';

import { useState, useEffect, useMemo } from 'react';
import { Duel, AllRoundsData, Player, Round } from '@/lib/types';
import { SortableTable, ColumnDef } from '@/components/ui/sortable-table';
import { Filter, applyFilters, FilterType } from '@/lib/filters';
import { FilterPopover } from '@/components/ui/filter-popover';
import { Button } from '@/components/ui/button';
import {
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu"

const MY_PLAYER_ID = '608a7f9394d95300015224ac';

function getGameMode(options?: { movementOptions?: { forbidMoving?: boolean; forbidZooming?: boolean; forbidPanning?: boolean; } }) {
    if (!options?.movementOptions) return 'MOVE';
    if (options.movementOptions.forbidMoving && options.movementOptions.forbidZooming) return 'NMPZ';
    if (options.movementOptions.forbidMoving) return 'NM';
    return 'MOVE';
}

// Main data processing function
const processAllRoundsData = (duels: Duel[], myPlayerId: string): AllRoundsData[] => {
  const allRounds: AllRoundsData[] = [];
  let roundCounter = 0;

  duels.forEach(duel => {
    if (!duel.rounds || !duel.teams) return;

    const me = duel.teams.flatMap(t => t.players).find(p => p.playerId === myPlayerId);
    if (!me) return;

    const opponent = duel.teams.flatMap(t => t.players).find(p => p.playerId !== myPlayerId);

    duel.rounds.forEach((round: Round) => {
      const myGuess = me.guesses.find(g => g.roundNumber === round.roundNumber);
      const opponentGuess = opponent?.guesses.find(g => g.roundNumber === round.roundNumber);

      if (!myGuess || !opponentGuess) return;

      const myScore = myGuess.score ?? 0;
      const opponentScore = opponentGuess.score ?? 0;
      const myDistance = myGuess.distance !== undefined ? myGuess.distance / 10 : -1;
      const opponentDistance = opponentGuess.distance !== undefined ? opponentGuess.distance / 10 : -1;
      const myTime = (myGuess.created && round.startTime) ? new Date(myGuess.created).getTime() - new Date(round.startTime).getTime() : -1;
      const opponentTime = (opponentGuess.created && round.startTime) ? new Date(opponentGuess.created).getTime() - new Date(round.startTime).getTime() : -1;

      const won = myScore > opponentScore;
      const scoreDelta = myScore - opponentScore;

      allRounds.push({
        originalIndex: roundCounter++,
        gameId: duel.gameId,
        roundNumber: round.roundNumber,
        mapName: duel.options?.map?.name,
        date: new Date(round.startTime),
        countryCode: round.panorama?.countryCode ?? 'N/A',
        myScore,
        opponentScore,
        scoreDelta,
        myDistance,
        opponentDistance,
        distDelta: myDistance - opponentDistance,
        myTime,
        opponentTime,
        timeDelta: (myTime !== -1 && opponentTime !== -1) ? myTime - opponentTime : -1,
        won,
        mmr: me.rankedSystemProgress?.mmr,
        mmrChange: (me.progressChange?.rankedSystemProgress?.ratingAfter ?? 0) - (me.progressChange?.rankedSystemProgress?.ratingBefore ?? 0),
        opponentId: opponent?.playerId,
        gameMode: getGameMode(duel.options as any),
        multiplier: round.multiplier as number | undefined,
        damage: round.multiplier ? scoreDelta * (round.multiplier as number) : undefined,
      });
    });
  });

  return allRounds;
};


export default function DataExplorerPage() {
  const [allRounds, setAllRounds] = useState<AllRoundsData[]>([]);
  const [filters, setFilters] = useState<Filter<AllRoundsData>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/geoguessr_stats.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Duel[] = await response.json();
        
        const processedData = processAllRoundsData(data, MY_PLAYER_ID);
        setAllRounds(processedData);

      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFilterChange = (columnId: keyof AllRoundsData, selectedValues: any[], type: FilterType = 'include') => {
    setFilters(prevFilters => {
      const otherFilters = prevFilters.filter(f => f.id !== columnId);
      if (selectedValues.length > 0) {
        return [...otherFilters, { id: columnId, value: selectedValues, type }];
      }
      return otherFilters;
    });
  };

  const handleCellContextMenu = (row: AllRoundsData, column: ColumnDef<AllRoundsData>) => {
    const value = row[column.accessorKey];
    if (value === undefined || value === null) return null;

    return (
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleFilterChange(column.accessorKey, [value], 'include')}>
          Include {String(value)}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleFilterChange(column.accessorKey, [value], 'exclude')}>
          Exclude {String(value)}
        </ContextMenuItem>
      </ContextMenuContent>
    );
  };

  const filteredData = useMemo(() => {
    return applyFilters(allRounds, filters);
  }, [allRounds, filters]);

  const columns: ColumnDef<AllRoundsData>[] = [
    { accessorKey: 'originalIndex', header: '#' },
    { accessorKey: 'date', header: 'Date', cell: (row) => new Date(row.date).toLocaleDateString() },
    { 
      accessorKey: 'mapName', 
      header: 'Map', 
      headerCell: (header) => (
        <div className="flex items-center">
          <span>{header}</span>
          <FilterPopover
            columnId="mapName"
            columnName="Map"
            data={allRounds}
            activeFilters={filters.find(f => f.id === 'mapName')?.value as any[] ?? []}
            onFilterChange={handleFilterChange}
          />
        </div>
      )
    },
    { accessorKey: 'roundNumber', header: 'Round' },
    { 
      accessorKey: 'countryCode', 
      header: 'Country', 
      headerCell: (header) => (
        <div className="flex items-center">
          <span>{header}</span>
          <FilterPopover
            columnId="countryCode"
            columnName="Country"
            data={allRounds}
            activeFilters={filters.find(f => f.id === 'countryCode')?.value as any[] ?? []}
            onFilterChange={handleFilterChange}
          />
        </div>
      )
    },
    { accessorKey: 'myScore', header: 'My Score' },
    { accessorKey: 'opponentScore', header: 'Opp. Score' },
    { accessorKey: 'myDistance', header: 'My Dist (m)', cell: (row) => row.myDistance.toFixed(1) },
    { accessorKey: 'opponentDistance', header: 'Opp. Dist (m)', cell: (row) => row.opponentDistance.toFixed(1) },
    { 
      accessorKey: 'timeDelta', 
      header: 'Time Δ', 
      cell: (row) => {
        if (row.timeDelta === -1) return 'N/A';
        const seconds = row.timeDelta / 1000;
        return `${seconds > 0 ? '+' : ''}${seconds.toFixed(1)}s`;
      }
    },
    { accessorKey: 'damage', header: 'Dmg' },
    { accessorKey: 'multiplier', header: 'x' },
    { 
      accessorKey: 'gameMode', 
      header: 'Mode', 
      headerCell: (header) => (
        <div className="flex items-center">
          <span>{header}</span>
          <FilterPopover
            columnId="gameMode"
            columnName="Mode"
            data={allRounds}
            activeFilters={filters.find(f => f.id === 'gameMode')?.value as any[] ?? []}
            onFilterChange={handleFilterChange}
          />
        </div>
      )
    },
    { 
      accessorKey: 'opponentId', 
      header: 'Opponent', 
      headerCell: (header) => (
        <div className="flex items-center">
          <span>{header}</span>
          <FilterPopover
            columnId="opponentId"
            columnName="Opponent"
            data={allRounds}
            activeFilters={filters.find(f => f.id === 'opponentId')?.value as any[] ?? []}
            onFilterChange={handleFilterChange}
          />
        </div>
      )
    },
    { accessorKey: 'won', header: 'Result', cell: (row) => (row.won ? 'Win' : 'Loss') },
  ];

  if (loading) {
    return <div className="p-8">Loading all rounds data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">All Rounds Data Explorer</h1>
        {filters.length > 0 && (
          <Button variant="outline" onClick={() => setFilters([])}>
            Clear All Filters
          </Button>
        )}
      </div>
      <div className="flex-grow bg-white p-4 rounded-lg shadow-md overflow-hidden">
        <SortableTable
          columns={columns}
          data={filteredData}
          initialSortKey="date"
          initialSortDirection="descending"
          onCellContextMenu={handleCellContextMenu}
        />
      </div>
    </div>
  );
}
