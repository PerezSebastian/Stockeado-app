export type AssistantRoleValue = "USER" | "ASSISTANT" | "TOOL" | "SYSTEM";

export type AssistantActionTypeValue =
  | "CREATE_PRODUCT"
  | "ADJUST_STOCK"
  | "CREATE_EXPENSE"
  | "TOGGLE_CATEGORY_STATUS";

export type AssistantActionStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED"
  | "EXECUTED";

export interface AssistantPendingActionSummary {
  id: string;
  actionType: AssistantActionTypeValue;
  status: AssistantActionStatusValue;
  previewText: string;
  payloadSummary?: Record<string, string | number | boolean | null>;
  expiresAt?: string | null;
}

export interface AssistantMessageMeta {
  kind?:
    | "stock"
    | "sales"
    | "expenses"
    | "categories"
    | "pending_action"
    | "info"
    | "error"
    | "success";
  pendingAction?: AssistantPendingActionSummary | null;
  interpretedProduct?: {
    query: string;
    resolvedName: string;
    confidence: string;
  } | null;
  interpretedEntities?: Array<{
    type: "product" | "category" | "payment_method";
    input: string;
    resolved: string[];
    confidence: string;
  }> | null;
}

export interface AssistantMessageItem {
  id: string;
  role: AssistantRoleValue;
  content: string;
  createdAt: string;
  retentionClass?: "EPHEMERAL" | "CONTEXTUAL" | "IMPORTANT";
  meta?: AssistantMessageMeta | null;
}

export interface AssistantConversationItem {
  id: string;
  title: string;
  updatedAt: string;
  lastMessagePreview?: string | null;
  lastMessageCreatedAt?: string | null;
  hasPendingActions?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  restorableUntil?: string | null;
  canRestore?: boolean;
}

export interface AssistantBootstrapPayload {
  assistantName: string;
  businessName: string;
  userRole: string;
  starterPrompts: string[];
  latestConversationId: string | null;
  conversations: AssistantConversationItem[];
}
