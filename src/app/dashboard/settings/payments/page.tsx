import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPaymentMethods } from "@/actions/payments";
import { PaymentList } from "./payment-list";

export default async function SettingsPaymentsPage() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/auth/login");

  const result = await getPaymentMethods();

  if (result.error) {
    return <div className="rounded-2xl border border-danger-soft-foreground/20 bg-danger-soft p-6 text-danger-soft-foreground">{result.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Metodos de Pago</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura los medios que aceptas en tu local. Los metodos desactivados no apareceran
          al registrar ventas.
        </p>
      </div>

      <PaymentList initialMethods={result.methods || []} />
    </div>
  );
}
