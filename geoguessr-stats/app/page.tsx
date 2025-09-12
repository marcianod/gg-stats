import StatsDashboard from './stats-dashboard'

export default async function HomePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 py-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="text-2xl font-bold">GeoGuessr Stats Dashboard</h1>
      </header>
      <main>
        <StatsDashboard />
      </main>
    </div>
  );
}