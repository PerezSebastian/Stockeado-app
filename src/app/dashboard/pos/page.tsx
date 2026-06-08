import { getPOSProducts } from "@/actions/pos";
import { getPaymentMethods } from "@/actions/payments";
import { POSClient } from "@/components/pos-client";

export default async function POSPage() {
    const [{ products, error: productsError }, paymentsRes] = await Promise.all([
        getPOSProducts(),
        getPaymentMethods(),
    ]);

    if (productsError || !products) {
        return (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed border-border bg-background">
                <p className="text-muted-foreground">{productsError ?? "Error al cargar los productos"}</p>
            </div>
        );
    }

    const paymentMethods = 'methods' in paymentsRes ? paymentsRes.methods : [];

    return <POSClient products={products} paymentMethods={paymentMethods || []} />;
}

