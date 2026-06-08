import { db } from "@/lib/db";
import { subDays } from "date-fns";

export async function cleanupAssistantData() {
  const now = new Date();
  const ephemeralThreshold = subDays(now, 15);
  const contextualThreshold = subDays(now, 60);
  const importantThreshold = subDays(now, 180);
  const logsThreshold = subDays(now, 30);
  const oldActionsThreshold = subDays(now, 30);

  const [deletedEphemeralMessages, deletedContextualMessages, deletedQueryLogs, deletedOldActions] =
    await db.$transaction([
      db.assistantMessage.deleteMany({
        where: {
          retentionClass: "EPHEMERAL",
          createdAt: { lt: ephemeralThreshold },
        },
      }),
      db.assistantMessage.deleteMany({
        where: {
          retentionClass: "CONTEXTUAL",
          createdAt: { lt: contextualThreshold },
        },
      }),
      db.assistantAuditLog.deleteMany({
        where: {
          createdAt: { lt: logsThreshold },
          entityId: null,
          entityType: null,
          status: "SUCCESS",
        },
      }),
      db.assistantPendingAction.deleteMany({
        where: {
          createdAt: { lt: oldActionsThreshold },
          status: {
            in: ["CANCELLED", "FAILED", "EXPIRED"],
          },
        },
      }),
    ]);

  const deletedImportantMessages = await db.assistantMessage.deleteMany({
    where: {
      retentionClass: "IMPORTANT",
      createdAt: { lt: importantThreshold },
    },
  });

  return {
    deletedEphemeralMessages: deletedEphemeralMessages.count,
    deletedContextualMessages: deletedContextualMessages.count,
    deletedImportantMessages: deletedImportantMessages.count,
    deletedQueryLogs: deletedQueryLogs.count,
    deletedOldActions: deletedOldActions.count,
  };
}
