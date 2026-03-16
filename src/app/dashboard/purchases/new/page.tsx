import { getPOSProducts } from "@/actions/pos";
import { PurchasesClient } from "@/components/purchases-client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function NewPurchasePage() {
    const { products, error } = await getPOSProducts();

    if (error || !products) {
        return (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed border-zinc-200 bg-white">
                <p className="text-zinc-500">{error ?? "Error al cargar los productos"}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/purchases">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-zinc-900">Registrar Compra</h1>
                    <p className="text-zinc-500 mt-1 text-sm">
                        Ingresa mercadería y actualiza tu stock automáticamente.
                    </p>
                </div>
            </div>

            <PurchasesClient products={products} />
        </div>
    );
}
