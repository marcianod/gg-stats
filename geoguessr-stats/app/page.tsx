import StatsDashboard from './stats-dashboard'

export default async function HomePage() {
  return (
    <main className="flex flex-col h-screen p-6">
      <h1 className="text-3xl font-bold mb-4">
        GeoGuessr Stats Dashboard
      </h1>
      <StatsDashboard />
    </main>
  );
}
