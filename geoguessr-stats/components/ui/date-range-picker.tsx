"use client"

import * as React from "react"
import { format, subDays, isSameDay } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

const presets = [
  { name: "Today", range: { from: new Date(), to: new Date() } },
  { name: "Yesterday", range: { from: subDays(new Date(), 1), to: subDays(new Date(), 1) } },
  { name: "Last 7 days", range: { from: subDays(new Date(), 6), to: new Date() } },
  { name: "Last 30 days", range: { from: subDays(new Date(), 29), to: new Date() } },
  { name: "This month", range: { from: new Date(new Date().setDate(1)), to: new Date() } },
];

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const [activePreset, setActivePreset] = React.useState<string | undefined>();

  React.useEffect(() => {
    for (const preset of presets) {
      if (
        date &&
        date.from &&
        date.to &&
        isSameDay(date.from, preset.range.from) &&
        isSameDay(date.to, preset.range.to)
      ) {
        setActivePreset(preset.name);
        return;
      }
    }
    setActivePreset(undefined);
  }, [date]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex" align="start">
          <div className="flex flex-col space-y-2 p-4">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                variant={activePreset === preset.name ? "default" : "ghost"}
                onClick={() => onDateChange(preset.range)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
          <Separator orientation="vertical" className="h-auto" />
          <Calendar
            initialFocus
            mode="range"
            month={date?.from}
            toMonth={new Date()}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
