import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { BusinessProfileForm } from "./business-profile-form";

import { UserRole } from "@prisma/client";

export default async function SettingsBusinessProfilePage() {
  const session = await auth();

  if (!session?.user?.businessId) {
    redirect("/auth/login");
  }

  const business = await db.business.findUnique({
    where: { id: session.user.businessId },
    select: {
      name: true,
      planStatus: true,
      subscriptionId: true,
      apiKey: true,
      domain: true,
    },
  });

  if (!business) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
        No se encontro el negocio.
      </div>
    );
  }

  const role = session.user.role;
  const isOwnerOrAdmin = role === UserRole.ADMIN || role === UserRole.OWNER;

  return (
    <div className="space-y-6">
      <BusinessProfileForm initialData={business} isOwnerOrAdmin={isOwnerOrAdmin} />
    </div>
  );
}
