"use client";

import { Search, X } from "lucide-react";
import { useUrlSearch } from "@/hooks/use-debounced-search";
import { BarcodeScannerButton } from "@/components/barcode-scanner-button";
import { Input } from "@/components/ui/input";

export function CatalogSearch() {
    const {
        searchTerm,
        setSearchTerm,
        clearSearch,
        applySearchImmediate,
    } = useUrlSearch();

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleDetected = (code: string) => {
        setSearchTerm(code);
        applySearchImmediate(code);
    };

    return (
        <div className="flex w-full max-w-sm flex-col gap-2">
            <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    value={searchTerm}
                    onChange={onChange}
                    placeholder="Buscar en catálogo por Nombre, SKU..."
                    className="pl-8 pr-8 bg-background border-border"
                />
                {searchTerm && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-muted-foreground focus:outline-none cursor-pointer transition-colors"
                        aria-label="Borrar búsqueda"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
            <BarcodeScannerButton
                onDetected={handleDetected}
                className="w-full font-semibold"
                dialogDescription="Apuntá la cámara al código del producto para buscarlo en el catálogo."
            />
        </div>
    );
}
