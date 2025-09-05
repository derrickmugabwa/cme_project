"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { countries, Country } from "@/lib/countries"

interface CountryComboboxProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  error?: boolean
}

export function CountryCombobox({
  value,
  onValueChange,
  placeholder = "Select country...",
  className,
  error = false
}: CountryComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedCountry = countries.find((country) => country.name === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            error && "border-red-300",
            className
          )}
        >
          {selectedCountry ? (
            <span className="flex items-center">
              <span className="font-mono text-xs mr-2 text-muted-foreground">
                {selectedCountry.code}
              </span>
              {selectedCountry.name}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." className="h-9" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.code} ${country.name}`}
                  onSelect={() => {
                    onValueChange?.(country.name)
                    setOpen(false)
                  }}
                >
                  <span className="flex items-center w-full">
                    <span className="font-mono text-xs mr-3 text-muted-foreground min-w-[2rem]">
                      {country.code}
                    </span>
                    <span className="flex-1">{country.name}</span>
                  </span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === country.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
