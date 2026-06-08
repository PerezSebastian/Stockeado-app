"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useUrlSearch } from "@/hooks/use-debounced-search";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
    categories: { id: string; name: string }[];
    placeholder?: string;
    paramName?: string;
}

export function CategoryFilter({ categories, placeholder = "Todas las categorías", paramName = "category" }: CategoryFilterProps) {
    const { searchTerm: activeCategory, setSearchTerm } = useUrlSearch({
        paramName,
        delay: 0, // Instant response for dropdown filters
    });

    const [isOpen, setIsOpen] = useState(false);
    const [searchVal, setSearchVal] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Get selected category name
    const selectedCategoryName = useMemo(() => {
        if (!activeCategory || activeCategory === "all") return placeholder;
        return categories.find((c) => c.id === activeCategory)?.name || placeholder;
    }, [activeCategory, categories, placeholder]);

    // Filter categories based on search input
    const filteredCategories = useMemo(() => {
        const query = searchVal.toLowerCase().trim();
        if (!query) return categories;
        return categories.filter((c) => c.name.toLowerCase().includes(query));
    }, [categories, searchVal]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Clear search when closing/opening
    useEffect(() => {
        if (!isOpen) {
            setSearchVal("");
        } else {
            // Focus search input on open
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    const handleSelect = (categoryId: string) => {
        setSearchTerm(categoryId === "all" ? "" : categoryId);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative w-full sm:w-[220px]">
            <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full justify-between bg-background border-border text-left font-normal h-9 px-3"
            >
                <span className="truncate">{selectedCategoryName}</span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
            </Button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[300px] flex flex-col rounded-md border border-border bg-popover text-popover-foreground shadow-md overflow-hidden animate-in fade-in-0 zoom-in-95">
                    {/* Search Input Box */}
                    <div className="relative border-b border-border p-2 bg-surface-subtle/50">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar categoría..."
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                            className="h-8 pl-8 pr-8 text-xs bg-background"
                        />
                        {searchVal && (
                            <button
                                type="button"
                                onClick={() => setSearchVal("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto p-1 max-h-[220px] scrollbar-thin">
                        <button
                            type="button"
                            onClick={() => handleSelect("all")}
                            className={cn(
                                "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs outline-none select-none hover:bg-accent hover:text-accent-foreground text-left cursor-pointer transition-colors",
                                (!activeCategory || activeCategory === "all") && "bg-accent/50 font-semibold text-accent-foreground"
                            )}
                        >
                            <span>{placeholder}</span>
                            {(!activeCategory || activeCategory === "all") && <Check className="h-3 w-3 text-primary shrink-0 ml-2" />}
                        </button>

                        {filteredCategories.length === 0 ? (
                            <div className="py-6 text-center text-xs text-muted-foreground">
                                No se encontraron categorías
                            </div>
                        ) : (
                            filteredCategories.map((cat) => {
                                const isSelected = activeCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => handleSelect(cat.id)}
                                        className={cn(
                                            "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs outline-none select-none hover:bg-accent hover:text-accent-foreground text-left cursor-pointer transition-colors",
                                            isSelected && "bg-accent/50 font-semibold text-accent-foreground"
                                        )}
                                    >
                                        <span className="truncate">{cat.name}</span>
                                        {isSelected && <Check className="h-3 w-3 text-primary shrink-0 ml-2" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
