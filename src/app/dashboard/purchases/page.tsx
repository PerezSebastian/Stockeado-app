import { auth } from "@/auth";
import { getPurchases } from "@/actions/purchases";
import { redirect } from "next/navigation";
import { Truck, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PurchasesTable } from "@/components/purchases-table";
import { PaginationControl } from "@/components/ui/pagination-control";

export default async function PurchasesPage({
    searchParams,
}: {
    searchParams: { page?: string; limit?: string };
}) {
    const page = Number(searchParams?.page) || 1;
    const limit = Number(searchParams?.limit) || 10;

    const session = await auth();
    if (!session?.user) redirect("/dashboard");

    const result = await getPurchases(page, limit);

    if ("error" in result) {
        return (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed border-zinc-200 bg-white">
                <p className="text-zinc-500">{result.error}</p>
            </div>
        );
    }

    const { purchases, totalPages, totalCount } = result;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Historial de Compras</h1>
                    <p className="text-zinc-500">Un registro de todas las compras (restocks) realizadas a proveedores.</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/purchases/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar Compra
                    </Link>
                </Button>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-md shadow-sm">
                <PurchasesTable purchases={purchases || []} />
                <div className="border-t">
                    <PaginationControl
                        currentPage={page}
                        limit={limit}
                        totalPages={totalPages || 1}
                        totalItems={totalCount || 0}
                    />
                </div>
            </div>
        </div>
    );
}
