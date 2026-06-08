import {
  createAssistantConversation,
  listAssistantConversations,
} from "@/lib/assistant/service";
import { requireAssistantActor } from "@/lib/assistant/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const actor = await requireAssistantActor();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "");
    const statusParam = searchParams.get("status");
    const status = statusParam === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
    const conversations = await listAssistantConversations(
      actor,
      Number.isFinite(limit) && limit > 0 ? limit : undefined,
      { status }
    );
    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autorizado" },
      { status: 401 }
    );
  }
}

export async function POST() {
  try {
    const actor = await requireAssistantActor();
    const conversation = await createAssistantConversation(actor);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autorizado" },
      { status: 401 }
    );
  }
}
