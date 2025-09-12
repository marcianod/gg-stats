import fs from 'fs/promises';
import path from 'path';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define a type for the duel object for consistency with the API route
interface Duel {
  gameId: string;
  created?: string;
  startTime?: string;
  options?: {
    map?: {
      name?: string;
    };
  };
  // Using `unknown` is safer than `any` for other dynamic properties
  [key: string]: unknown;
}

const STATS_FILE_PATH = path.join(process.cwd(), 'data', 'geoguessr_stats.json');

/**
 * Reads and parses the stats file on the server.
 * @returns {Promise<Duel[]>} A promise that resolves to an array of duels.
 */
async function getStats(): Promise<Duel[]> {
  try {
    const fileContent = await fs.readFile(STATS_FILE_PATH, 'utf-8');
    // Handle empty file gracefully to prevent JSON parsing errors
    if (!fileContent || fileContent.trim() === '') {
      return [];
    }
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data.flat(Infinity) : [];
  } catch (error: unknown) {
    // If the file doesn't exist, it's not an error for the first load.
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      console.log('Stats file not found. This is normal on first run.');
      return [];
    }
    console.error('Error reading stats file for page:', error);
    return []; // Return empty array for other errors
  }
}

export default async function HomePage() {
  // As a Server Component, we can directly read from the filesystem.
  const allDuels = await getStats();

  // Sort duels by date, newest first
  allDuels.sort((a, b) => {
    const dateA = new Date(a.created ?? a.startTime ?? 0).getTime();
    const dateB = new Date(b.created ?? b.startTime ?? 0).getTime();
    return dateB - dateA;
  });

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 py-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="text-2xl font-bold">GeoGuessr Stats Dashboard</h1>
      </header>
      <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
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
                <CardContent className="flex flex-col gap-3">
                  {allDuels.length > 0 ? (
                    allDuels.map((duel) => (
                      <div
                        key={duel.gameId}
                        className="rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {duel.options?.map?.name ?? 'Unknown Map'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              duel.created ?? duel.startTime!
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
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
                Select a match from the list to see its details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Details will appear here.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
