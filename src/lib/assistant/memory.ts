import { db } from "@/lib/db";
import type { AssistantMessageMeta } from "@/types/assistant";

const MIN_MESSAGES_TO_COMPACT = 40;
const RECENT_MESSAGES_TO_KEEP = 20;
const NEW_MESSAGES_SINCE_COMPACTION = 20;

export type AssistantRetentionClassValue =
  | "EPHEMERAL"
  | "CONTEXTUAL"
  | "IMPORTANT";

interface StoredAssistantMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "TOOL" | "SYSTEM";
  content: string;
  retentionClass: AssistantRetentionClassValue;
  metaJson: unknown;
  createdAt: Date;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function classifyMessageRetention(input: {
  role: "USER" | "ASSISTANT" | "TOOL" | "SYSTEM";
  content: string;
  meta?: AssistantMessageMeta | null;
}): AssistantRetentionClassValue {
  const text = normalizeText(input.content);
  const kind = input.meta?.kind;

  if (input.meta?.pendingAction) {
    return "IMPORTANT";
  }

  if (kind === "success" || kind === "error") {
    return "IMPORTANT";
  }

  if (input.role === "SYSTEM" || input.role === "TOOL") {
    return "IMPORTANT";
  }

  const ephemeralValues = new Set([
    "ok",
    "dale",
    "gracias",
    "perfecto",
    "listo",
    "bien",
    "okey",
  ]);

  if (ephemeralValues.has(text)) {
    return "EPHEMERAL";
  }

  if (text.length <= 12 && input.role === "USER") {
    return "EPHEMERAL";
  }

  return "CONTEXTUAL";
}

function extractImportantFacts(messages: StoredAssistantMessage[]) {
  const facts = new Set<string>();

  for (const message of messages) {
    const meta = (message.metaJson ?? null) as AssistantMessageMeta | null;

    if (meta?.pendingAction?.previewText) {
      facts.add(`Accion conversada: ${meta.pendingAction.previewText}`);
    }

    if (message.role === "ASSISTANT") {
      const content = message.content.trim();
      if (content.length > 0) {
        const firstLine = content.split("\n")[0]?.trim();
        if (firstLine && firstLine.length > 20) {
          facts.add(firstLine);
        }
      }
    }
  }

  return [...facts].slice(0, 8);
}

function buildCompactSummary(
  previousSummary: string | null,
  messages: StoredAssistantMessage[]
) {
  const lines: string[] = [];

  if (previousSummary?.trim()) {
    lines.push(previousSummary.trim());
  }

  const facts = extractImportantFacts(messages);
  if (facts.length > 0) {
    lines.push("Resumen reciente:");
    for (const fact of facts) {
      lines.push(`- ${fact}`);
    }
  }

  return lines.join("\n").trim();
}

function isCompactableMessage(
  message: StoredAssistantMessage,
  protectedIds: Set<string>
) {
  if (protectedIds.has(message.id)) return false;
  if (message.retentionClass === "IMPORTANT") return false;

  const meta = (message.metaJson ?? null) as AssistantMessageMeta | null;
  if (meta?.pendingAction) return false;

  return true;
}

export async function compactConversationMemory(conversationId: string) {
  const conversation = await db.assistantConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) return;

  const messages = conversation.messages as StoredAssistantMessage[];

  if (messages.length < MIN_MESSAGES_TO_COMPACT) {
    return;
  }

  const recentMessages = messages.slice(-RECENT_MESSAGES_TO_KEEP);
  const recentIds = new Set(recentMessages.map((message) => message.id));

  const messagesAfterLastCompaction = conversation.lastCompactedAt
    ? messages.filter(
        (message) => message.createdAt > (conversation.lastCompactedAt as Date)
      ).length
    : messages.length;

  if (
    messagesAfterLastCompaction < NEW_MESSAGES_SINCE_COMPACTION &&
    messages.length < MIN_MESSAGES_TO_COMPACT + NEW_MESSAGES_SINCE_COMPACTION
  ) {
    return;
  }

  const compactable = messages.filter((message) =>
    isCompactableMessage(message, recentIds)
  );

  if (compactable.length === 0) {
    return;
  }

  const summary = buildCompactSummary(conversation.memorySummary, compactable);

  await db.$transaction(async (tx) => {
    await tx.assistantConversation.update({
      where: { id: conversationId },
      data: {
        memorySummary: summary || conversation.memorySummary,
        memoryUpdatedAt: new Date(),
        lastCompactedAt: new Date(),
      },
    });

    await tx.assistantMessage.deleteMany({
      where: {
        id: {
          in: compactable.map((message) => message.id),
        },
      },
    });
  });
}

export function buildRecentContext(
  messages: Array<{
    role: string;
    content: string;
    retentionClass?: AssistantRetentionClassValue;
  }>
) {
  return messages
    .filter((message) => message.retentionClass !== "EPHEMERAL")
    .slice(-12)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}
