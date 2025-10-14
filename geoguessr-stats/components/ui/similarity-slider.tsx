'use client';

import React from 'react';

interface SimilaritySliderProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function SimilaritySlider({
  value,
  onChange,
  min = 0.7,
  max = 1.0,
  step = 0.01,
}: SimilaritySliderProps) {
  return (
    <div className="flex items-center gap-4 bg-white p-2 rounded-md shadow-md">
      <label htmlFor="similarity-slider" className="text-sm font-medium text-gray-700 whitespace-nowrap">
        Minimum Similarity
      </label>
      <div className="flex items-center gap-2 w-48">
        <input
          id="similarity-slider"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm font-semibold text-gray-900 w-12 text-right">
          {(value * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
