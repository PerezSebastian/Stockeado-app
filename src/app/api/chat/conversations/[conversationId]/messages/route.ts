import {
  getConversationMessages,
  sendAssistantMessage,
} from "@/lib/assistant/service";
import { requireAssistantActor } from "@/lib/assistant/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const sendMessageSchema = z.object({
  message: z.string().min(1).max(1500),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const actor = await requireAssistantActor();
    const { conversationId } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "");
    const payload = await getConversationMessages(
      actor,
      conversationId,
      Number.isFinite(limit) && limit > 0 ? limit : undefined
    );
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar mensajes" },
      { status: 400 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const actor = await requireAssistantActor();
    const body = await request.json();
    const { message } = sendMessageSchema.parse(body);
    const { conversationId } = await context.params;

    const payload = await sendAssistantMessage({
      actor,
      conversationId,
      message,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al enviar mensaje" },
      { status: 400 }
    );
  }
}
