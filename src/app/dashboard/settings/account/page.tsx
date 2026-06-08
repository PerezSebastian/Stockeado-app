import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccountForm } from "./account-form";

export default async function SettingsAccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const userData = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      role: true,
      business: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!userData) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
        Error cargando informacion de la cuenta.
      </div>
    );
  }

  const viewData = {
    email: userData.email,
    role: userData.role,
    businessName: userData.business?.name || "Stockeado",
  };

  return (
    <div className="animate-in space-y-8 fade-in slide-in-from-bottom-2 duration-500">
      <AccountForm user={viewData} />
    </div>
  );
}
