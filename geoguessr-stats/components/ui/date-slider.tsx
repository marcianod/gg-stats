"use client"

import * as React from "react"
import { format, subDays, differenceInDays, addDays } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface DateSliderProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  minDate: Date;
}

export function DateSlider({
  className,
  date,
  onDateChange,
  minDate,
}: DateSliderProps) {
  const today = new Date();
  const totalDays = differenceInDays(today, minDate);

  const presets = [
    { name: "Today", range: { from: new Date(), to: new Date() } },
    { name: "Yesterday", range: { from: subDays(new Date(), 1), to: new Date() } },
    { name: "Last 7 days", range: { from: subDays(new Date(), 6), to: new Date() } },
    { name: "Last 30 days", range: { from: subDays(new Date(), 29), to: new Date() } },
    { name: "Last 60 days", range: { from: subDays(new Date(), 59), to: new Date() } },
    { name: "All time", range: undefined },
  ];

  const handleSliderChange = (value: number[]) => {
    const [start, end] = value;
    const from = addDays(minDate, start);
    const to = addDays(minDate, end);
    onDateChange({ from, to });
  };

  const fromDay = date?.from ? differenceInDays(date.from, minDate) : 0;
  const toDay = date?.to ? differenceInDays(date.to, minDate) : totalDays;

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="flex items-center space-x-2">
        {presets.map((preset) => (
          <Button
            key={preset.name}
            variant="outline"
            size="sm"
            onClick={() => onDateChange(preset.range)}
          >
            {preset.name}
          </Button>
        ))}
      </div>
      <div className="grid gap-2">
        <div className="text-sm text-muted-foreground flex justify-between">
          <span>{date?.from ? format(date.from, "LLL dd, y") : ""}</span>
          <span>{date?.to ? format(date.to, "LLL dd, y") : ""}</span>
        </div>
        <Slider
          min={0}
          max={totalDays}
          value={[fromDay, toDay]}
          onValueChange={handleSliderChange}
        />
      </div>
    </div>
  )
}
