'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { CountryData, GeoJson, RoundData } from '@/lib/types';

const Map = dynamic(() => import('../../components/Map'), {
  ssr: false,
});

export default function MapTestPage() {
  const [activeTab, setActiveTab] = useState('countries');
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);

  const mockGeoJson: GeoJson = {
    type: 'FeatureCollection',
    features: [],
  };

  const mockCountryStats: CountryData[] = [];

  const handleCountrySelect = (countryCode: string) => {
    console.log('Selected country:', countryCode);
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <Map
        activeTab={activeTab}
        roundData={null}
        geoJson={mockGeoJson}
        countryStats={mockCountryStats}
        selectedCountry={selectedCountry}
        onCountrySelect={handleCountrySelect}
      />
    </div>
  );
}
