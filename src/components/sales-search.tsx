"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

export function SalesSearch() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [searchTerm, setSearchTerm] = useState(searchParams.get("q")?.toString() || "");

    useEffect(() => {
        setSearchTerm(searchParams.get("q")?.toString() || "");
    }, [searchParams]);

    const handleSearch = (term: string) => {
        setSearchTerm(term);

        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (term) {
                params.set("q", term);
            } else {
                params.delete("q");
            }

            router.replace(`/dashboard/sales?${params.toString()}`, { scroll: false });
        });
    };

    return (
        <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
                placeholder="Buscar por ID de ticket o notas..."
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
