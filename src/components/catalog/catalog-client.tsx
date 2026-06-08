"use client";

import { useState } from "react";
import { CatalogProductsTab } from "./catalog-products-tab";
import { CatalogAttributesTab } from "./catalog-attributes-tab";
import { cn } from "@/lib/utils";

interface CatalogClientProps {
    catalogs: any[];
    attributes: any[];
    categories: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
}

export function CatalogClient({
    catalogs,
    attributes,
    categories,
    totalCount,
    totalPages,
    currentPage,
    limit,
}: CatalogClientProps) {
    const [activeTab, setActiveTab] = useState<"products" | "attributes">("products");

    return (
        <div className="space-y-6">
            {/* Custom Premium Tabs */}
            <div className="flex p-1 bg-surface-subtle border border-border rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab("products")}
                    className={cn(
                        "rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-all duration-200",
                        activeTab === "products"
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Productos del Catálogo
                </button>
                <button
                    onClick={() => setActiveTab("attributes")}
                    className={cn(
                        "rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-all duration-200",
                        activeTab === "attributes"
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Atributos Personalizados
                </button>
            </div>

            <div className="outline-none">
                {activeTab === "products" ? (
                    <CatalogProductsTab
                        initialCatalogs={catalogs}
                        attributes={attributes}
                        categories={categories}
                        totalCount={totalCount}
                        totalPages={totalPages}
                        currentPage={currentPage}
                        limit={limit}
                    />
                ) : (
                    <CatalogAttributesTab initialAttributes={attributes} />
                )}
            </div>
        </div>
    );
}
