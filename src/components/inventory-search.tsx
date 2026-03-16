"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";

export function InventorySearch() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    // Manage local state to immediately update the input field
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q")?.toString() || "");

    useEffect(() => {
        setSearchTerm(searchParams.get("q")?.toString() || "");
    }, [searchParams]);

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("q", term);
        } else {
            params.delete("q");
        }
        router.replace(`${pathname}?${params.toString()}`);
    }, 300);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        handleSearch(e.target.value);
    };

    const clearSearch = () => {
        setSearchTerm("");
        handleSearch("");
    };

    return (
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
                type="text"
                value={searchTerm}
                onChange={onChange}
                placeholder="Buscar por Nombre, SKU..."
                className="pl-8 pr-8 bg-white border-zinc-200"
            />
            {searchTerm && (
                <button
                    onClick={clearSearch}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer transition-colors"
                    aria-label="Borrar búsqueda"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
