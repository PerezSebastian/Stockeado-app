import { getAssistantBootstrap } from "@/lib/assistant/service";
import { requireAssistantActor } from "@/lib/assistant/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const actor = await requireAssistantActor();
    const payload = await getAssistantBootstrap(actor);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autorizado" },
      { status: 401 }
    );
  }
}

