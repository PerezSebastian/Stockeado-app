"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CategorySearchOption {
  label: string;
  value: string;
}

interface CategorySearchSelectProps {
  emptyMessage?: string;
  onValueChange: (value: string) => void;
  options: CategorySearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  value?: string;
}

export function CategorySearchSelect({
  emptyMessage = "No hay categorías disponibles",
  onValueChange,
  options,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar categoría...",
  value,
}: CategorySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedSearch)
    );
  }, [options, search]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setSearch("");
    }
  };

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
    setSearch("");
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between bg-background px-3 font-normal",
            !selectedOption && "text-muted-foreground"
          )}
        >
          <span className="truncate">{selectedOption?.label ?? placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] p-2"
      >
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            className="h-9 pl-8"
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder={searchPlaceholder}
            value={search}
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                className="cursor-pointer"
                onSelect={() => handleSelect(option.value)}
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    option.value === value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{option.label}</span>
              </DropdownMenuItem>
            ))
          ) : (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
