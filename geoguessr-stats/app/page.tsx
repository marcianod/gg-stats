import fs from 'fs/promises'
import path from 'path'
import StatsDashboard from './stats-dashboard'
import { type Duel } from '../lib/types'

const STATS_FILE_PATH = path.join(process.cwd(), 'data', 'geoguessr_stats.json');

/**
 * Reads and parses the stats file on the server.
 * @returns {Promise<Duel[]>} A promise that resolves to an array of duels.
 */
async function getStats(): Promise<Duel[]> {
  try {
    const fileContent = await fs.readFile(STATS_FILE_PATH, 'utf-8');
    // Handle empty file gracefully to prevent JSON parsing errors
    if (!fileContent || fileContent.trim() === '') return []
    const data = JSON.parse(fileContent)
    return Array.isArray(data) ? data.flat(Infinity) : []
  } catch (error: unknown) {
    // If the file doesn't exist, it's not an error for the first load.
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      console.log('Stats file not found. This is normal on first run.')
      return []
    }
    console.error('Error reading stats file for page:', error)
    return [] // Return empty array for other errors
  }
}

export default async function HomePage() {
  // As a Server Component, we can directly read from the filesystem.
  const allDuels = await getStats()
  
  // Sorting is now handled client-side in `stats-dashboard.tsx`
  // to ensure dates are derived correctly from round data.

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 py-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="text-2xl font-bold">GeoGuessr Stats Dashboard</h1>
      </header>
      <main>
        <StatsDashboard allDuels={allDuels} />
      </main>
    </div>
  );
}
