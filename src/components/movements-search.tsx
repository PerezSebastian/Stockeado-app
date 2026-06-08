"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useUrlSearch } from "@/hooks/use-debounced-search";

export function MovementsSearch() {
    const {
        searchTerm,
        setSearchTerm,
        isPending,
    } = useUrlSearch({ pathname: "/dashboard/movements" });

    return (
        <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Buscar por producto, SKU o motivo..."
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isPending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-zinc-600" />
                </div>
            )}
        </div>
    );
}

