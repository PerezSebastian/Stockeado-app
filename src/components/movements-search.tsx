"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

export function MovementsSearch() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Estado local para tipear sin lag
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q")?.toString() || "");

    // Sincronizar estado local si cambia la URL por otra vía
    useEffect(() => {
        setSearchTerm(searchParams.get("q")?.toString() || "");
    }, [searchParams]);

    // Handle Search optimizado para no perder focus
    const handleSearch = (term: string) => {
        setSearchTerm(term); // Actualiza el input inmediatamente

        // Ejecuta la navegación en background sin blouqear la UI
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (term) {
                params.set("q", term);
            } else {
                params.delete("q");
            }
            params.delete("page"); // Reset a página 1 al buscar

            // Usamos replace para no llenar el historial y scroll: false
            router.replace(`/dashboard/movements?${params.toString()}`, { scroll: false });
        });
    };

    return (
        <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
                placeholder="Buscar por producto, SKU o motivo..."
                className="pl-9 bg-white"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
            />
            {isPending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                </div>
            )}
        </div>
    );
}
