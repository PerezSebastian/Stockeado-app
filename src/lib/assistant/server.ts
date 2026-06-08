import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { AssistantActor } from "@/lib/assistant/service";

export async function requireAssistantActor(): Promise<AssistantActor> {
  const session = await auth();

  if (!session?.user?.id || !session.user.businessId || !session.user.role) {
    throw new Error("No autorizado");
  }

  const business = await db.business.findUnique({
    where: { id: session.user.businessId },
    select: { name: true },
  });

  if (!business) {
    throw new Error("Negocio no encontrado");
  }

  return {
    userId: session.user.id,
    businessId: session.user.businessId,
    role: session.user.role,
    businessName: business.name,
  };
}
