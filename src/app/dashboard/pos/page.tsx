import { getPOSProducts } from "@/actions/pos";
import { POSClient } from "@/components/pos-client";

export default async function POSPage() {
    const { products, error } = await getPOSProducts();

    if (error || !products) {
        return (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed border-zinc-200 bg-white">
                <p className="text-zinc-500">{error ?? "Error al cargar los productos"}</p>
            </div>
        );
    }

    return <POSClient products={products} />;
}
