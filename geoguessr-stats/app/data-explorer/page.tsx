'use client';

import { useState, useEffect } from 'react';

function getAllKeys(obj: any, parentKey = ''): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], `${parentKey}${key}.`));
    } else if (Array.isArray(obj[key]) && obj[key].length > 0 && typeof obj[key][0] === 'object') {
      keys = keys.concat(getAllKeys(obj[key][0], `${parentKey}${key}[].`));
    } else {
      keys.push(`${parentKey}${key}`);
    }
  }
  return keys;
}

export default function DataExplorerPage() {
  const [fieldPaths, setFieldPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/geoguessr_stats.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 25) {
          const matchData = data[25]; // 26th match is at index 25
          const allPaths = getAllKeys(matchData);
          const uniquePaths = [...new Set(allPaths)];
          setFieldPaths(uniquePaths);
        } else {
          setError("Could not find match 26 in the data.");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Available Data Fields for Match #26</h1>
      <div className="bg-white p-4 rounded-lg shadow-md h-96 overflow-y-auto">
        <ul>
          {fieldPaths.map((path) => (
            <li key={path} className="font-mono text-sm p-1">
              {path}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
