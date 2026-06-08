"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PaginationControlProps {
    totalPages: number;
    currentPage: number;
    totalItems?: number;
    limit: number;
}

export function PaginationControl({ totalPages, currentPage, totalItems, limit }: PaginationControlProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const createQueryString = (name: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(name, value);
        return params.toString();
    };

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;
        router.push(pathname + "?" + createQueryString("page", newPage.toString()), { scroll: false });
    };

    const handleLimitChange = (newLimit: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("limit", newLimit);
        params.set("page", "1"); // Al cambiar límite volvemos a página 1
        router.push(pathname + "?" + params.toString(), { scroll: false });
    };

    const startItem = (currentPage - 1) * limit + 1;
    let endItem = currentPage * limit;
    if (totalItems !== undefined && endItem > totalItems) {
        endItem = totalItems;
    }

    if (totalPages <= 1 && (totalItems === undefined || totalItems <= 5)) {
        return null;
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 select-none">
            <div className="flex flex-1 items-center justify-between sm:hidden">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="cursor-pointer"
                >
                    Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                    Pág {currentPage} de {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="cursor-pointer"
                >
                    Siguiente
                </Button>
            </div>

            <div className="hidden sm:flex flex-1 items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span>Mostrar</span>
                        <Select value={limit.toString()} onValueChange={handleLimitChange}>
                            <SelectTrigger className="h-8 w-[70px] cursor-pointer">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[5, 10, 15, 20].map((size) => (
                                    <SelectItem key={size} value={size.toString()}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span>filas</span>
                    </div>

                    {totalItems !== undefined && (
                        <span>
                            Mostrando <span className="font-medium">{totalItems === 0 ? 0 : startItem}</span> al <span className="font-medium">{endItem}</span> de{" "}
                            <span className="font-medium">{totalItems}</span> resultados
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground mr-2">
                        Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center space-x-1">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex cursor-pointer"
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage <= 1}
                        >
                            <span className="sr-only">Ir a la primer página</span>
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                        >
                            <span className="sr-only">Ir a la anterior</span>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                        >
                            <span className="sr-only">Ir a la siguiente</span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex cursor-pointer"
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage >= totalPages}
                        >
                            <span className="sr-only">Ir a la última página</span>
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

