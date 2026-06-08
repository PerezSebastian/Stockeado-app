import { archiveAssistantConversation } from "@/lib/assistant/service";
import { requireAssistantActor } from "@/lib/assistant/server";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const actor = await requireAssistantActor();
    const { conversationId } = await context.params;
    const payload = await archiveAssistantConversation({ actor, conversationId });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al archivar conversación",
      },
      { status: 400 }
    );
  }
}
