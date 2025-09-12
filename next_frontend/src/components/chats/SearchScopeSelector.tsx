"use client";

import * as React from "react";
import { Check, Plus, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Dummy data for groups
const groups = [
  {
    value: "friends",
    label: "Friends",
  },
];

interface SearchScopeSelectorProps {
  disabled?: boolean;
}

export const SearchScopeSelectorComponent = ({ disabled = true }: SearchScopeSelectorProps) => {
  const [open, setOpen] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState(new Set<string>());
  console.log("disabled", disabled);
  return (
    <div
      className={cn(
        "overflow-hidden transition-opacity",
        disabled && "opacity-50 pointer-events-none"
      )}
      style={{ height: "auto", marginBottom: "0.375rem" }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Popover open={disabled ? false : open} onOpenChange={disabled ? () => {} : setOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-sm border border-primary bg-transparent p-0 text-sm font-medium ring-offset-background transition-colors",
                !disabled &&
                  "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                disabled ? "opacity-50 cursor-not-allowed" : ""
              )}
              disabled={disabled}
            >
              <Plus className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              "w-[200px] border border-gray-400/50 bg-white p-0",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            align="start"
          >
            <Command>
              <CommandInput placeholder="Filter groups..." />
              <CommandList className="border border-gray-400/50">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup
                  heading={
                    <div className="flex items-center space-x-1.5">
                      <Users className="flex h-3 w-3" />
                      <span>Groups</span>
                    </div>
                  }
                >
                  {groups.map(group => {
                    const isSelected = selectedValues.has(group.value);
                    return (
                      <CommandItem
                        key={group.value}
                        onSelect={() => {
                          if (isSelected) {
                            selectedValues.delete(group.value);
                          } else {
                            selectedValues.add(group.value);
                          }
                          const newValues = new Set(selectedValues);
                          setSelectedValues(newValues);
                        }}
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-[14px] w-[14px] items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-transparent opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Check className="size-3" />
                        </div>
                        <span>{group.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <span
          className={cn("text-xs", disabled ? "text-muted-foreground/50" : "text-muted-foreground")}
        >
          {selectedValues.size > 0
            ? `Searching in: ${Array.from(selectedValues)
                .map(value => groups.find(g => g.value === value)?.label)
                .join(", ")}`
            : "You need to select connections to search."}
        </span>
      </div>
    </div>
  );
};

export const SearchScopeSelector = React.memo(SearchScopeSelectorComponent);

SearchScopeSelector.displayName = "SearchScopeSelector";
