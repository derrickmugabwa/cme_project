"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  selected?: Date | null;
  onSelect?: (date: Date | null) => void;
  className?: string;
}

// Helper type to match DayPicker's expected onSelect handler
type DayPickerOnSelectHandler = (date: Date | undefined) => void;

export function DatePicker({ selected, onSelect, className }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected || undefined}
          onSelect={(date) => onSelect?.(date || null) as unknown as DayPickerOnSelectHandler}
          initialFocus={true}
          required={false}
        />
      </PopoverContent>
    </Popover>
  );
}
