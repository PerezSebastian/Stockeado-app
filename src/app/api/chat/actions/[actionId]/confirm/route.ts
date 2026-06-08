import { confirmPendingAction } from "@/lib/assistant/service";
import { requireAssistantActor } from "@/lib/assistant/server";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ actionId: string }> }
) {
  try {
    const actor = await requireAssistantActor();
    const { actionId } = await context.params;
    const payload = await confirmPendingAction({ actor, actionId });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al confirmar acción" },
      { status: 400 }
    );
  }
}

