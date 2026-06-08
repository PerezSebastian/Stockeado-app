import { getCatalogProducts, getCatalogAttributes } from "@/actions/catalog";
import { getCategories } from "@/actions/categories";
import { CatalogClient } from "@/components/catalog/catalog-client";

interface CatalogPageProps {
    searchParams: Promise<{ q?: string; page?: string; limit?: string; category?: string }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
    const resolvedParams = await searchParams;
    const query = resolvedParams?.q || "";
    const page = Number(resolvedParams?.page) || 1;
    const limit = Number(resolvedParams?.limit) || 10;
    const category = resolvedParams?.category || "all";

    const [productsRes, attributesRes, categoriesRes] = await Promise.all([
        getCatalogProducts(query, undefined, page, limit, category),
        getCatalogAttributes(),
        getCategories('PRODUCT'),
    ]);

    const catalogs = "catalogs" in productsRes ? productsRes.catalogs || [] : [];
    const totalCount = "totalCount" in productsRes ? productsRes.totalCount || 0 : 0;
    const totalPages = "totalPages" in productsRes ? productsRes.totalPages || 1 : 1;
    const error = "error" in productsRes ? productsRes.error : null;

    const attributes = "attributes" in attributesRes ? attributesRes.attributes || [] : [];
    const categories = "categories" in categoriesRes ? categoriesRes.categories || [] : [];

    if (error) {
        return (
            <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-border bg-background">
                <p className="text-muted-foreground">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Catálogo Digital</h1>
                <p className="text-muted-foreground">Configurá la visibilidad de tus productos y gestioná atributos avanzados para tu web pública.</p>
            </div>

            <CatalogClient
                catalogs={catalogs}
                attributes={attributes as any}
                categories={categories || []}
                totalCount={totalCount}
                totalPages={totalPages}
                currentPage={page}
                limit={limit}
            />
        </div>
    );
}
