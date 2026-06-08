import { db } from "@/lib/db";
import {
  buildRecentContext,
  classifyMessageRetention,
  compactConversationMemory,
} from "@/lib/assistant/memory";
import {
  expenseReportInput,
  inventoryReportInput,
  salesReportInput,
} from "@/lib/assistant/query-dsl";
import {
  executeExpenseReportQuery,
  executeInventoryReportQuery,
  executeSalesReportQuery,
} from "@/lib/assistant/query-compiler";
import {
  formatExpenseReport,
  formatInventoryReport,
  formatSalesReport,
} from "@/lib/assistant/query-formatters";
import type {
  AssistantBootstrapPayload,
  AssistantConversationItem,
  AssistantMessageItem,
  AssistantMessageMeta,
  AssistantPendingActionSummary,
} from "@/types/assistant";
import { UserRole } from "@prisma/client";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CONVERSATION_LIMIT = 12;
const MESSAGE_LIMIT = 40;
const ACTION_TTL_HOURS = 2;
const MAX_CONVERSATION_PAGE_SIZE = 100;
const MAX_MESSAGE_PAGE_SIZE = 500;
const ARCHIVED_RESTORE_WINDOW_DAYS = 30;

export interface AssistantActor {
  userId: string;
  businessId: string;
  role: UserRole;
  businessName: string;
}

type AssistantIntentName =
  | "GREETING"
  | "LIST_PRODUCTS"
  | "LIST_LOW_STOCK_PRODUCTS"
  | "LIST_PRODUCTS_BY_CATEGORY"
  | "GET_PRODUCT_STOCK"
  | "INVENTORY_REPORT"
  | "SALES_REPORT"
  | "EXPENSE_REPORT"
  | "LIST_CATEGORIES"
  | "CREATE_PRODUCT"
  | "ADJUST_STOCK"
  | "CREATE_EXPENSE"
  | "TOGGLE_CATEGORY_STATUS";

type AssistantIntentDecision =
  | {
      kind: "message";
      messageType: "answer" | "clarify";
      message: string;
    }
  | {
      kind: "intent";
      intentName: AssistantIntentName;
      confidence: "high" | "medium" | "low";
      parameters: Record<string, unknown>;
    };

const assistantIntentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("message"),
    messageType: z.enum(["answer", "clarify"]),
    message: z.string().min(1),
  }),
  z.object({
    kind: z.literal("intent"),
    intentName: z.enum([
      "GREETING",
      "LIST_PRODUCTS",
      "LIST_LOW_STOCK_PRODUCTS",
      "LIST_PRODUCTS_BY_CATEGORY",
      "GET_PRODUCT_STOCK",
      "INVENTORY_REPORT",
      "SALES_REPORT",
      "EXPENSE_REPORT",
      "LIST_CATEGORIES",
      "CREATE_PRODUCT",
      "ADJUST_STOCK",
      "CREATE_EXPENSE",
      "TOGGLE_CATEGORY_STATUS",
    ]),
    confidence: z.enum(["high", "medium", "low"]).default("medium"),
    parameters: z.record(z.string(), z.unknown()).default({}),
  }),
]);

const productStockInput = z.object({
  query: z.string().min(1),
});

const listProductsInput = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const listCategoriesInput = z.object({
  type: z.enum(["PRODUCT", "EXPENSE", "ANY"]).default("ANY"),
  status: z.enum(["ACTIVE", "INACTIVE", "ANY"]).default("ANY"),
  query: z.string().trim().optional().nullable(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const listLowStockProductsInput = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const listProductsByCategoryInput = z.object({
  categoryQuery: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const salesSummaryInput = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

const salesPeriodSummaryInput = z.object({
  period: z.enum(["TODAY", "THIS_WEEK", "THIS_MONTH"]),
});

const expensesDateInput = z.object({
  date: z.string().min(1),
});

const unpaidExpensesInput = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

const createProductDraftInput = z.object({
  name: z.string().min(1),
  sku: z.string().optional().nullable(),
  categoryNameOrId: z.string().optional().nullable(),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  isPublic: z.coerce.boolean().default(false),
});

const adjustStockDraftInput = z.object({
  productQuery: z.string().min(1),
  newStock: z.coerce.number().int().min(0),
  reason: z.string().min(1).max(250),
});

const createExpenseDraftInput = z.object({
  description: z.string().min(1).max(200),
  amount: z.coerce.number().positive(),
  categoryNameOrId: z.string().min(1),
  dueDate: z.string().min(1),
});

const toggleCategoryStatusDraftInput = z.object({
  categoryQuery: z.string().min(1),
  type: z.enum(["PRODUCT", "EXPENSE", "ANY"]).default("ANY"),
  nextStatus: z.coerce.boolean(),
});

interface GeminiJsonResult {
  rawText: string;
  json: unknown;
}

type ConversationDomain =
  | "products"
  | "sales"
  | "expenses"
  | "categories"
  | "general";

type ConversationEntityKind = "product" | "category" | "expense" | "sale";

interface RecentListContext {
  kind: NonNullable<AssistantMessageMeta["kind"]>;
  items: string[];
  message: string;
}

interface RecentConversationFocus {
  domain: ConversationDomain;
  source: "USER" | "ASSISTANT";
  entityKind?: ConversationEntityKind;
  categoryType?: "PRODUCT" | "EXPENSE" | "ANY";
  categoryStatus?: "ACTIVE" | "INACTIVE" | "ANY";
}

interface RecentConversationReference {
  kind: ConversationEntityKind;
  value: string;
  domain: ConversationDomain;
  source: "list" | "message";
  categoryType?: "PRODUCT" | "EXPENSE" | "ANY";
}

interface RecentClarificationContext {
  entityKind: ConversationEntityKind;
  domain: ConversationDomain;
  action?: "toggle_status" | "lookup";
  categoryType?: "PRODUCT" | "EXPENSE" | "ANY";
  nextStatus?: boolean | null;
}

interface RecentConversationContext {
  latestList: RecentListContext | null;
  focus: RecentConversationFocus | null;
  recentDomainTopic: { domain: ConversationDomain; text: string } | null;
  recentCategoryTopic: {
    type: "PRODUCT" | "EXPENSE" | "ANY";
    status: "ACTIVE" | "INACTIVE" | "ANY";
  } | null;
  recentCategoryIntent: {
    nextStatus: boolean;
    type: "PRODUCT" | "EXPENSE" | "ANY";
  } | null;
  references: RecentConversationReference[];
  latestClarification: RecentClarificationContext | null;
}

function extractFirstJsonObject(rawText: string) {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  if (firstBrace === -1) {
    throw new Error("La IA no devolvio un objeto JSON valido.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = firstBrace; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) {
        return trimmed.slice(firstBrace, i + 1);
      }
    }
  }

  throw new Error("La IA devolvio una respuesta incompleta y no pude leer el JSON.");
}

async function callGeminiJson(prompt: string): Promise<GeminiJsonResult> {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  if (!apiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY para usar el asistente.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Error del proveedor IA (${response.status}): ${errorText.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const rawText =
    data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ??
    "";

  if (!rawText) {
    throw new Error("La IA no devolvió una respuesta utilizable.");
  }

  return {
    rawText,
    json: JSON.parse(extractFirstJsonObject(rawText)),
  };
}

function buildPlannerPrompt(
  actor: AssistantActor,
  messages: AssistantMessageItem[],
  conversationSummary: string | null,
  userMessage: string
) {
  const history = buildRecentContext(messages);
  const categoryAssistantInstructions = `
Reglas extra sobre categorías:
- Para consultar categorías de productos o gastos usá list_categories.
- Si el usuario quiere habilitar o deshabilitar una categoría, SIEMPRE usá prepare_toggle_category_status para pedir confirmación.

Tools extra para categorías:
- list_categories { type: PRODUCT | EXPENSE | ANY, status: ACTIVE | INACTIVE | ANY, query?, limit }
- prepare_toggle_category_status { categoryQuery, type: PRODUCT | EXPENSE | ANY, nextStatus }
`.trim();

  return `
Sos un asistente operativo para negocios.
Negocio actual: ${actor.businessName}
Rol del usuario: ${actor.role}
Fecha actual: ${new Date().toISOString()}
Idioma: es-AR

Resumen acumulado de la conversacion:
${conversationSummary?.trim() || "(sin resumen todavia)"}

Reglas:
- Solo podés ayudar con el negocio actual.
- Para datos de stock, ventas o gastos debés elegir una tool.
- Para escrituras debés elegir una tool prepare_*.
- Si falta información o hay ambigüedad, devolvé kind="clarify".
- Si el pedido está fuera del alcance del negocio, devolvé kind="answer" con una negativa breve.
- Respondé SIEMPRE en JSON válido, sin markdown.

Tools disponibles:
${categoryAssistantInstructions}
- list_products { limit }
- list_low_stock_products { limit }
- list_products_by_category { categoryQuery, limit }
- get_product_stock { query }
- query_inventory_report { filters?, metrics, groupBy?, sort?, limit? }
- get_sales_summary { from, to }
- get_sales_period_summary { period: TODAY | THIS_WEEK | THIS_MONTH }
- query_sales_report { dateRange, filters?, metrics, groupBy?, sort?, limit? }
- get_due_expenses { date }
- get_unpaid_expenses { from, to }
- query_expense_report { dateRange?, filters?, metrics, groupBy?, sort?, limit? }
- prepare_create_product { name, sku, categoryNameOrId, cost, price, stock, minStock, isPublic }
- prepare_adjust_stock { productQuery, newStock, reason }
- prepare_create_expense { description, amount, categoryNameOrId, dueDate }

Historial reciente:
${history || "(sin historial)"}

Mensaje actual:
${userMessage}

Formato:
{ "kind": "answer", "message": "..." }
o
{ "kind": "clarify", "message": "..." }
o
{ "kind": "tool", "toolName": "...", "arguments": { ... } }
`.trim();
}

function buildIntentParserPrompt(
  actor: AssistantActor,
  messages: AssistantMessageItem[],
  conversationSummary: string | null,
  userMessage: string
) {
  const history = buildRecentContext(messages);
  const conversationContext = summarizeRecentConversationContext(
    buildRecentConversationContext(messages)
  );

  return `
Sos un asistente operativo para negocios.
Negocio actual: ${actor.businessName}
Rol del usuario: ${actor.role}
Fecha actual: ${new Date().toISOString()}
Idioma: es-AR

Resumen acumulado de la conversacion:
${conversationSummary?.trim() || "(sin resumen todavia)"}

Tarea:
Interpretá la intención del usuario y devolvé una intención estructurada.
NO devuelvas nombres de tools internas.
NO ejecutes nada.
NO inventes datos del negocio.

Reglas:
- Si el pedido es un saludo o una pregunta general sobre capacidades, devolvé kind="message".
- Si falta información, hay ambigüedad o se necesita precisión para actuar, devolvé kind="message" con messageType="clarify".
- Si el pedido está fuera del negocio actual, devolvé kind="message" con messageType="answer".
- Si el usuario quiere consultar ventas, gastos, stock o categorías, devolvé kind="intent".
- Si el usuario quiere escribir/cambiar algo, devolvé kind="intent" y el backend se encargará de la confirmación si corresponde.
- Usá el historial y el contexto conversacional estructurado para referencias como "esa", "la de comida", "cuales son", "y de gastos?", "los de marzo", etc.
- Si el usuario hace una repregunta corta o elíptica, asumí que continúa el hilo actual salvo que cambie claramente de tema.
- Si hay una aclaración pendiente del asistente, interpretá el siguiente mensaje como respuesta a esa aclaración.

Intent names válidos:
- GREETING
- LIST_PRODUCTS
- LIST_LOW_STOCK_PRODUCTS
- LIST_PRODUCTS_BY_CATEGORY
- GET_PRODUCT_STOCK
- INVENTORY_REPORT
- SALES_REPORT
- EXPENSE_REPORT
- LIST_CATEGORIES
- CREATE_PRODUCT
- ADJUST_STOCK
- CREATE_EXPENSE
- TOGGLE_CATEGORY_STATUS

Parámetros posibles:
- productQuery
- categoryQuery
- categoryType: PRODUCT | EXPENSE | ANY
- categoryStatus: ACTIVE | INACTIVE | ANY
- nextStatus: true | false
- period: TODAY | THIS_WEEK | THIS_MONTH
- relativeDays: numero
- month: 1-12
- year: YYYY
- from, to: ISO strings si el usuario ya dio fechas exactas
- responseMode: list | summary | count
- reason, newStock, description, amount, dueDate, sku, cost, price, stock, minStock, isPublic

Contexto conversacional reciente estructurado:
${conversationContext}

Historial reciente:
${history || "(sin historial)"}

Mensaje actual:
${userMessage}

Formato:
{ "kind": "message", "messageType": "answer", "message": "..." }
o
{ "kind": "message", "messageType": "clarify", "message": "..." }
o
{ "kind": "intent", "intentName": "EXPENSE_REPORT", "confidence": "high", "parameters": { "month": 3, "year": 2026, "responseMode": "list" } }
`.trim();
}

function serializeMessage(message: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  retentionClass?: string | null;
  metaJson: unknown;
}): AssistantMessageItem {
  const meta =
    (message.metaJson as AssistantMessageMeta | null | undefined) ?? null;

  return {
    id: message.id,
    role: message.role as AssistantMessageItem["role"],
    content: normalizePotentialMojibake(message.content),
    createdAt: message.createdAt.toISOString(),
    retentionClass:
      (message.retentionClass as AssistantMessageItem["retentionClass"] | undefined) ??
      undefined,
    meta: meta
      ? {
          ...meta,
          pendingAction: meta.pendingAction
            ? {
                ...meta.pendingAction,
                previewText: normalizePotentialMojibake(meta.pendingAction.previewText),
              }
            : meta.pendingAction,
        }
      : null,
  };
}

function serializeConversation(conversation: {
  id: string;
  title: string | null;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date | null;
}): AssistantConversationItem {
  const restorableUntil = conversation.deletedAt
    ? new Date(
        conversation.deletedAt.getTime() +
          ARCHIVED_RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000
      )
    : null;

  return {
    id: conversation.id,
    title: normalizePotentialMojibake(
      conversation.title?.trim() || "Nueva conversacion"
    ),
    title: conversation.title?.trim() || "Nueva conversación",
    updatedAt: conversation.updatedAt.toISOString(),
    isDeleted: conversation.isDeleted ?? false,
    deletedAt: conversation.deletedAt?.toISOString() ?? null,
    restorableUntil: restorableUntil?.toISOString() ?? null,
    canRestore: restorableUntil ? restorableUntil.getTime() > Date.now() : false,
  };
}

function serializeConversationWithMeta(conversation: {
  id: string;
  title: string | null;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  messages?: Array<{
    content: string;
    createdAt: Date;
  }>;
  pendingActions?: Array<{ id: string }>;
}): AssistantConversationItem {
  const baseConversation = serializeConversation(conversation);
  const latestMessage = conversation.messages?.[0];

  return {
    ...baseConversation,
    lastMessagePreview: latestMessage?.content
      ? normalizePotentialMojibake(latestMessage.content.trim()).slice(0, 120)
      : null,
    lastMessageCreatedAt: latestMessage?.createdAt?.toISOString() ?? null,
    hasPendingActions: (conversation.pendingActions?.length ?? 0) > 0,
  };
}

function summarizePendingAction(action: {
  id: string;
  actionType: string;
  status: string;
  previewText: string;
  payloadJson: unknown;
  expiresAt: Date | null;
}): AssistantPendingActionSummary {
  const payload = (action.payloadJson ?? {}) as Record<string, unknown>;
  const payloadSummary: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      payloadSummary[key] = value;
    }
  }

  return {
    id: action.id,
    actionType: action.actionType as AssistantPendingActionSummary["actionType"],
    status: action.status as AssistantPendingActionSummary["status"],
    previewText: normalizePotentialMojibake(action.previewText),
    payloadSummary,
    expiresAt: action.expiresAt?.toISOString() ?? null,
  };
}

async function syncPendingActionsInMessages(messages: AssistantMessageItem[]) {
  const actionIds = Array.from(
    new Set(
      messages
        .map((message) => message.meta?.pendingAction?.id)
        .filter((value): value is string => Boolean(value))
    )
  );

  if (actionIds.length === 0) {
    return messages;
  }

  const actions = await db.assistantPendingAction.findMany({
    where: {
      id: { in: actionIds },
    },
    select: {
      id: true,
      status: true,
      previewText: true,
      expiresAt: true,
      payloadJson: true,
      actionType: true,
    },
  });

  const actionMap = new Map(
    actions.map((action) => [action.id, summarizePendingAction(action)])
  );

  return messages.map((message) => {
    if (!message.meta?.pendingAction) {
      return message;
    }

    const latestAction = actionMap.get(message.meta.pendingAction.id);
    if (!latestAction) {
      return message;
    }

    return {
      ...message,
      meta: {
        ...message.meta,
        pendingAction: latestAction,
      },
    };
  });
}

async function insertAuditLog(input: {
  actor: AssistantActor;
  conversationId?: string;
  toolName: string;
  toolInputJson?: unknown;
  toolResultJson?: unknown;
  status: "SUCCESS" | "ERROR";
  entityType?: string;
  entityId?: string;
}) {
  await db.assistantAuditLog.create({
    data: {
      businessId: input.actor.businessId,
      userId: input.actor.userId,
      conversationId: input.conversationId,
      toolName: input.toolName,
      toolInputJson: input.toolInputJson,
      toolResultJson: input.toolResultJson,
      status: input.status,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });
}

function buildConversationTitle(message: string) {
  return message.trim().slice(0, 48) || "Nueva conversación";
}

function normalizePotentialMojibake(value: string) {
  let current = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!/[\u00C3\u00C2]/.test(current)) break;

    try {
      const decoded = Buffer.from(current, "latin1").toString("utf8");
      if (!decoded || decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }

  return current.replace(/\u00C2/g, "").replace(/\uFFFD/g, "");
}

function toUserFacingAssistantError(message: string) {
  const normalized = message.toLowerCase();

  if (
    message.includes("Falta configurar GEMINI_API_KEY") ||
    message.includes("Error del proveedor IA (429)") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    normalized.includes("quota")
  ) {
    return "Ahora mismo estoy con un límite del servicio de IA y no pude resolverlo. Probá de nuevo en unos minutos.";
  }

  if (message.includes("Error del proveedor IA")) {
    return "Tuve un problema momentáneo con el servicio de IA. Si querés, intentá de nuevo en un rato.";
  }

  if (
    normalized.includes("is not defined") ||
    normalized.includes("referenceerror") ||
    normalized.includes("cannot read properties") ||
    normalized.includes("cannot destructure") ||
    normalized.includes("unexpected token") ||
    normalized.includes("failed to parse")
  ) {
    return "Se me mezclaron un poco las cosas justo con ese pedido. Si querés, decímelo de nuevo y lo resuelvo mejor.";
  }

  if (
    normalized.includes("no autoriz") ||
    normalized.includes("no encontrado") ||
    normalized.includes("no encontrada")
  ) {
    return message;
  }

  return "No llegué a resolverlo bien esta vez. Si querés, lo intentamos de nuevo y te guío con una pregunta más puntual.";
}

function legacyToUserFacingAssistantError(message: string) {
  if (
    message.includes("Falta configurar GEMINI_API_KEY") ||
    message.includes("Error del proveedor IA (429)") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("quota")
  ) {
    return "El asistente no está disponible temporalmente por un límite del proveedor de IA. Probá de nuevo en unos minutos.";
  }

  if (message.includes("Error del proveedor IA")) {
    return "El asistente no está disponible temporalmente por un problema del proveedor de IA. Probá nuevamente en unos minutos.";
  }

  return message;
}

function normalizeLooseText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactLooseText(value: string) {
  return normalizeLooseText(value).replace(/\s+/g, "");
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;

    for (let j = 1; j <= right.length; j++) {
      const temp = previous[j];
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + substitutionCost
      );
      diagonal = temp;
    }
  }

  return previous[right.length];
}

function scoreSimilarity(query: string, candidate: string) {
  const normalizedQuery = normalizeLooseText(query);
  const normalizedCandidate = normalizeLooseText(candidate);
  const compactQuery = compactLooseText(query);
  const compactCandidate = compactLooseText(candidate);

  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedQuery === normalizedCandidate || compactQuery === compactCandidate) {
    return 100;
  }
  if (
    normalizedCandidate.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCandidate)
  ) {
    return 90;
  }
  if (
    compactCandidate.includes(compactQuery) ||
    compactQuery.includes(compactCandidate)
  ) {
    return 86;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);
  const tokenMatches = queryTokens.filter((token) =>
    candidateTokens.some(
      (candidateToken) =>
        candidateToken.includes(token) || token.includes(candidateToken)
    )
  ).length;

  let score = 0;
  if (queryTokens.length > 0) {
    score = Math.max(score, Math.round((tokenMatches / queryTokens.length) * 76));
  }

  const distance = levenshteinDistance(compactQuery, compactCandidate);
  const relativeDistance =
    compactQuery.length > 0 ? distance / Math.max(compactQuery.length, compactCandidate.length) : 1;

  if (distance <= 2) {
    score = Math.max(score, 82 - distance * 8);
  } else if (relativeDistance <= 0.28) {
    score = Math.max(score, 72 - Math.round(relativeDistance * 20));
  }

  return score;
}

function scoreProductSimilarity(query: string, productName: string, sku?: string | null) {
  const normalizedQuery = normalizeLooseText(query);
  const normalizedName = normalizeLooseText(productName);
  const compactQuery = compactLooseText(query);
  const compactName = compactLooseText(productName);
  const compactSku = compactLooseText(sku ?? "");

  if (!normalizedQuery || !normalizedName) return 0;
  if (normalizedName === normalizedQuery || compactName === compactQuery) return 100;
  if (compactSku && (compactSku === compactQuery || compactQuery.includes(compactSku))) {
    return 98;
  }
  if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
    return 92;
  }
  if (compactName.includes(compactQuery) || compactQuery.includes(compactName)) {
    return 88;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const nameTokens = normalizedName.split(" ").filter(Boolean);
  const tokenMatches = queryTokens.filter((token) =>
    nameTokens.some((nameToken) => nameToken.includes(token) || token.includes(nameToken))
  ).length;

  let score = 0;
  if (queryTokens.length > 0) {
    score = Math.max(score, Math.round((tokenMatches / queryTokens.length) * 78));
  }

  const distance = levenshteinDistance(compactQuery, compactName);
  const relativeDistance =
    compactQuery.length > 0 ? distance / Math.max(compactQuery.length, compactName.length) : 1;

  if (distance <= 2) {
    score = Math.max(score, 82 - distance * 8);
  } else if (relativeDistance <= 0.28) {
    score = Math.max(score, 72 - Math.round(relativeDistance * 20));
  }

  return score;
}

function describeMatchConfidence(score: number) {
  if (score >= 96) return "muy alta";
  if (score >= 84) return "alta";
  if (score >= 70) return "media";
  return "baja";
}

function parseListedNamesFromAssistantMessage(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").split(":")[0]?.trim())
    .filter((value): value is string => Boolean(value));
}

function findLatestAssistantList(
  messages: AssistantMessageItem[]
): AssistantMessageItem | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "ASSISTANT") continue;
    if (!message.content.includes("- ")) continue;
    if (!["stock", "sales", "expenses", "categories", "info"].includes(message.meta?.kind ?? "info")) {
      continue;
    }

    const listedNames = parseListedNamesFromAssistantMessage(message.content);
    if (listedNames.length > 0) {
      return message;
    }
  }

  return null;
}

function inferCategoryTypeFromMessage(userMessage: string): "PRODUCT" | "EXPENSE" | "ANY" {
  const normalized = normalizeLooseText(userMessage);
  if (/\b(producto|productos)\b/.test(normalized)) return "PRODUCT";
  if (/\b(gasto|gastos)\b/.test(normalized)) return "EXPENSE";
  return "ANY";
}

function parseMonthReference(userMessage: string) {
  const normalized = normalizeLooseText(userMessage);
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  const monthIndex = months.findIndex((month) => normalized.includes(month));
  if (monthIndex === -1) return null;

  const now = new Date();
  let year = now.getFullYear();

  const explicitYear = normalized.match(/\b(20\d{2})\b/);
  if (explicitYear?.[1]) {
    year = Number(explicitYear[1]);
  } else if (/\beste ano\b|\beste a[oñ]o\b/.test(normalized)) {
    year = now.getFullYear();
  } else if (/\bano pasado\b|\ba[oñ]o pasado\b/.test(normalized)) {
    year = now.getFullYear() - 1;
  }

  const from = startOfMonth(new Date(year, monthIndex, 1));
  const to = endOfMonth(new Date(year, monthIndex, 1));

  return {
    monthIndex,
    year,
    from,
    to,
    label: `${months[monthIndex]} de ${year}`,
  };
}

function inferCategoryStatusFromMessage(userMessage: string): boolean | null {
  const normalized = normalizeLooseText(userMessage);
  if (/\bdeshabilit|desact|inhabilit\b/.test(normalized)) return false;
  if (/\bhabilit|activ\b/.test(normalized)) return true;
  return null;
}

function inferDomainFromMetaKind(
  kind: AssistantMessageMeta["kind"] | undefined
): ConversationDomain | null {
  if (kind === "stock") return "products";
  if (kind === "sales") return "sales";
  if (kind === "expenses") return "expenses";
  if (kind === "categories") return "categories";
  return null;
}

function detectDomainFromText(text: string): ConversationDomain | null {
  const normalized = normalizeLooseText(text);

  if (/\b(categoria|categorias)\b/.test(normalized)) return "categories";
  if (/\b(producto|productos|stock|inventario)\b/.test(normalized)) return "products";
  if (/\b(gasto|gastos|vencen|pendiente|pendientes)\b/.test(normalized)) return "expenses";
  if (/\b(venta|ventas|ticket|tickets)\b/.test(normalized)) return "sales";
  return null;
}

function extractCategoryScopeFromText(text: string) {
  const normalized = normalizeLooseText(text);
  if (!normalized.includes("categoria")) return null;

  return {
    type: inferCategoryTypeFromMessage(text),
    status:
      normalized.includes("deshabilitad") || normalized.includes("inactiv")
        ? ("INACTIVE" as const)
        : normalized.includes("habilitad") || normalized.includes("activ")
        ? ("ACTIVE" as const)
        : ("ANY" as const),
  };
}

function extractRecentCategoryIntent(messages: AssistantMessageItem[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "USER") continue;

    const nextStatus = inferCategoryStatusFromMessage(message.content);
    if (nextStatus === null || !normalizeLooseText(message.content).includes("categoria")) {
      continue;
    }

    return {
      nextStatus,
      type: inferCategoryTypeFromMessage(message.content),
    };
  }

  return null;
}

function extractRecentCategoryTopic(messages: AssistantMessageItem[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const categoryScope = extractCategoryScopeFromText(messages[index]?.content ?? "");
    if (categoryScope) {
      return categoryScope;
    }
  }

  return null;
}

function extractSingleListedCategory(messages: AssistantMessageItem[]) {
  const latestListMessage = findLatestAssistantList(messages);
  if (!latestListMessage || latestListMessage.meta?.kind !== "categories") return null;

  const listedNames = parseListedNamesFromAssistantMessage(latestListMessage.content);
  if (listedNames.length !== 1) return null;
  return listedNames[0];
}

function extractRecentListContext(messages: AssistantMessageItem[]) {
  const latestListMessage = findLatestAssistantList(messages);
  if (!latestListMessage) return null;

  const items = parseListedNamesFromAssistantMessage(latestListMessage.content);
  if (items.length === 0) return null;

  return {
    kind: latestListMessage.meta?.kind ?? "info",
    items,
    message: latestListMessage.content,
  } satisfies RecentListContext;
}

function extractRecentDomainTopic(messages: AssistantMessageItem[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "USER") continue;

    const domain = detectDomainFromText(message.content);
    if (domain) {
      return { domain, text: normalizeLooseText(message.content) };
    }
  }

  return null;
}

function extractRecentConversationFocus(messages: AssistantMessageItem[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const textDomain = detectDomainFromText(message.content);

    if (message.role === "USER" && textDomain) {
      const categoryScope = extractCategoryScopeFromText(message.content);
      return {
        domain: textDomain,
        source: "USER",
        entityKind:
          textDomain === "categories"
            ? "category"
            : textDomain === "products"
            ? "product"
            : textDomain === "expenses"
            ? "expense"
            : textDomain === "sales"
            ? "sale"
            : undefined,
        categoryType: categoryScope?.type,
        categoryStatus: categoryScope?.status,
      } satisfies RecentConversationFocus;
    }

    const metaDomain = inferDomainFromMetaKind(message.meta?.kind);
    if (message.role === "ASSISTANT" && metaDomain) {
      const categoryScope = extractCategoryScopeFromText(message.content);
      return {
        domain: metaDomain,
        source: "ASSISTANT",
        entityKind:
          metaDomain === "categories"
            ? "category"
            : metaDomain === "products"
            ? "product"
            : metaDomain === "expenses"
            ? "expense"
            : metaDomain === "sales"
            ? "sale"
            : undefined,
        categoryType: categoryScope?.type,
        categoryStatus: categoryScope?.status,
      } satisfies RecentConversationFocus;
    }
  }

  return null;
}

function extractRecentReferences(
  messages: AssistantMessageItem[],
  latestList: RecentListContext | null
) {
  const references: RecentConversationReference[] = [];

  if (latestList) {
    const domain = inferDomainFromMetaKind(latestList.kind) ?? "general";
    const categoryScope = extractCategoryScopeFromText(latestList.message);

    for (const item of latestList.items) {
      references.push({
        kind:
          latestList.kind === "categories"
            ? "category"
            : latestList.kind === "expenses"
            ? "expense"
            : latestList.kind === "sales"
            ? "sale"
            : "product",
        value: item,
        domain,
        source: "list",
        categoryType: categoryScope?.type,
      });
    }
  }

  for (let index = messages.length - 1; index >= 0 && references.length < 12; index -= 1) {
    const message = messages[index];

    if (message.meta?.pendingAction?.payloadSummary?.categoryName) {
      references.push({
        kind: "category",
        value: String(message.meta.pendingAction.payloadSummary.categoryName),
        domain: "categories",
        source: "message",
        categoryType:
          message.meta.pendingAction.payloadSummary.categoryType === "PRODUCT" ||
          message.meta.pendingAction.payloadSummary.categoryType === "EXPENSE"
            ? (message.meta.pendingAction.payloadSummary.categoryType as "PRODUCT" | "EXPENSE")
            : "ANY",
      });
    }
  }

  return references;
}

function extractLatestClarificationContext(
  messages: AssistantMessageItem[],
  recentCategoryIntent: RecentConversationContext["recentCategoryIntent"],
  recentFocus: RecentConversationFocus | null
) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "ASSISTANT") continue;

    const normalized = normalizeLooseText(message.content);
    if (!normalized.includes("?")) continue;

    if (
      normalized.includes("a que categoria") ||
      normalized.includes("que categoria queres cambiar") ||
      normalized.includes("decime cual queres cambiar")
    ) {
      return {
        entityKind: "category",
        domain: "categories",
        action: "toggle_status",
        categoryType:
          extractCategoryScopeFromText(message.content)?.type ??
          recentCategoryIntent?.type ??
          recentFocus?.categoryType ??
          "ANY",
        nextStatus: recentCategoryIntent?.nextStatus ?? null,
      } satisfies RecentClarificationContext;
    }

    if (normalized.includes("que producto queres revisar")) {
      return {
        entityKind: "product",
        domain: "products",
        action: "lookup",
      } satisfies RecentClarificationContext;
    }
  }

  return null;
}

function buildRecentConversationContext(messages: AssistantMessageItem[]): RecentConversationContext {
  const latestList = extractRecentListContext(messages);
  const recentCategoryIntent = extractRecentCategoryIntent(messages);
  const recentCategoryTopic = extractRecentCategoryTopic(messages);
  const focus = extractRecentConversationFocus(messages);

  return {
    latestList,
    focus,
    recentDomainTopic: extractRecentDomainTopic(messages),
    recentCategoryTopic,
    recentCategoryIntent,
    references: extractRecentReferences(messages, latestList),
    latestClarification: extractLatestClarificationContext(
      messages,
      recentCategoryIntent,
      focus
    ),
  };
}

function resolveReferencedEntity(
  userMessage: string,
  context: RecentConversationContext,
  expectedKind?: ConversationEntityKind
) {
  const normalized = normalizeLooseText(userMessage);
  const references = expectedKind
    ? context.references.filter((reference) => reference.kind === expectedKind)
    : context.references;
  if (references.length === 0) return null;

  const asksByReference =
    /\b(ese|esa|eso|este|esta|el de arriba|la de arriba|el primero|la primera|el de|la de|la unica|el unico)\b/.test(
      normalized
    );

  if (references.length === 1 && asksByReference) {
    return references[0]?.value ?? null;
  }

  const explicitByName = normalized.match(/\b(?:el|la)\s+de\s+(.+)$/)?.[1]?.trim();
  if (!explicitByName) return null;

  const exact = references.find(
    (reference) =>
      normalizeLooseText(reference.value) === normalizeLooseText(explicitByName)
  );
  if (exact) return exact.value;

  const fuzzy = references
    .map((reference) => ({
      reference,
      score: scoreSimilarity(explicitByName, reference.value),
    }))
    .filter((entry) => entry.score >= 60)
    .sort((left, right) => right.score - left.score)[0];

  return fuzzy?.reference.value ?? null;
}

function resolveCategoryTypeFromConversation(
  userMessage: string,
  context: RecentConversationContext
): "PRODUCT" | "EXPENSE" | "ANY" {
  const explicitType = inferCategoryTypeFromMessage(userMessage);
  if (explicitType !== "ANY") return explicitType;
  if (context.recentCategoryIntent?.type && context.recentCategoryIntent.type !== "ANY") {
    return context.recentCategoryIntent.type;
  }
  if (context.recentCategoryTopic?.type && context.recentCategoryTopic.type !== "ANY") {
    return context.recentCategoryTopic.type;
  }
  if (context.focus?.categoryType && context.focus.categoryType !== "ANY") {
    return context.focus.categoryType;
  }

  const categoryReference = context.references.find(
    (reference) => reference.kind === "category" && reference.categoryType && reference.categoryType !== "ANY"
  );
  return categoryReference?.categoryType ?? "ANY";
}

function resolveCategoryStatusFromConversation(
  userMessage: string,
  context: RecentConversationContext
): "ACTIVE" | "INACTIVE" | "ANY" {
  const normalized = normalizeLooseText(userMessage);
  if (normalized.includes("deshabilitad") || normalized.includes("inactiv")) {
    return "INACTIVE";
  }
  if (normalized.includes("habilitad") || normalized.includes("activ")) {
    return "ACTIVE";
  }
  if (context.recentCategoryTopic?.status) {
    return context.recentCategoryTopic.status;
  }
  if (context.focus?.categoryStatus) {
    return context.focus.categoryStatus;
  }
  return "ANY";
}

function summarizeRecentConversationContext(context: RecentConversationContext) {
  const lines: string[] = [];

  if (context.focus) {
    lines.push(
      `- foco_reciente: dominio=${context.focus.domain}; origen=${context.focus.source}${
        context.focus.categoryType ? `; tipo_categoria=${context.focus.categoryType}` : ""
      }${context.focus.categoryStatus ? `; estado_categoria=${context.focus.categoryStatus}` : ""}`
    );
  }

  if (context.latestList) {
    lines.push(
      `- ultima_lista: tipo=${context.latestList.kind}; items=${context.latestList.items.join(", ")}`
    );
  }

  if (context.latestClarification) {
    lines.push(
      `- aclaracion_pendiente: entidad=${context.latestClarification.entityKind}; accion=${
        context.latestClarification.action ?? "lookup"
      }${context.latestClarification.categoryType ? `; tipo_categoria=${context.latestClarification.categoryType}` : ""}${
        typeof context.latestClarification.nextStatus === "boolean"
          ? `; proximo_estado=${context.latestClarification.nextStatus ? "ACTIVE" : "INACTIVE"}`
          : ""
      }`
    );
  }

  return lines.join("\n") || "(sin contexto estructurado reciente)";
}

function extractExplicitCategoryQuery(userMessage: string) {
  const normalized = normalizeLooseText(userMessage);
  const patterns = [
    /\bcategoria(?:s)?\s+(?:de\s+gastos?(?:\s+fijos?)?|de\s+productos?)?\s*(.+)$/i,
    /\b(?:la|el)\s+de\s+(.+)$/i,
    /\b(?:habilitame|deshabilitame|activame|desactivame)\b.*?\b(.+)$/i,
  ];

  for (const pattern of patterns) {
    const value = normalized.match(pattern)?.[1]?.trim();
    if (value) {
      return value
        .replace(/^(la|el|categoria)\s+/g, "")
        .replace(/^(de\s+productos?|de\s+gastos?(?:\s+fijos?)?|de\s+gasto(?:s)?\s+fijo(?:s)?)\s+/g, "")
        .trim();
    }
  }

  return "";
}

async function resolveDeterministicAssistantIntent(
  actor: AssistantActor,
  conversationId: string,
  messages: AssistantMessageItem[],
  userMessage: string
) {
  const normalized = normalizeLooseText(userMessage);
  const recentContext = buildRecentConversationContext(messages);
  const recentListContext = recentContext.latestList;
  const recentDomainTopic = recentContext.recentDomainTopic;
  const recentFocus = recentContext.focus;

  const recentListFollowUp = buildListFollowUpAnswer(messages, userMessage);
  if (recentListFollowUp) {
    return recentListFollowUp;
  }

  const asksForPreviousList =
    /\b(cuales|cuales son|cual|mostra|mostrame|lista|listame)\b/.test(normalized) &&
    /\b(esos|esas|esas categorias|esos productos|los de arriba|las de arriba|eso)\b/.test(
      normalized
    );

  if (asksForPreviousList && recentListContext) {
    const heading =
      recentListContext.kind === "categories"
        ? "Te vuelvo a pasar esas categorías"
        : recentListContext.kind === "expenses"
        ? "Te vuelvo a pasar esos gastos"
        : recentListContext.kind === "sales"
        ? "Te vuelvo a pasar ese resumen de ventas"
        : "Te vuelvo a pasar esos productos";

    return {
      text: `${heading}:\n${recentListContext.items.map((item) => `- ${item}`).join("\n")}`,
      meta: { kind: recentListContext.kind as AssistantMessageMeta["kind"] } satisfies AssistantMessageMeta,
      result: { source: "recent_list_context", kind: recentListContext.kind, items: recentListContext.items },
    };
  }

  const salesLastDaysMatch = normalized.match(
    /\b(cuanto|cuanta|cuantos|cuantas)\b.*\bventas?\b.*\bultimos?\s+(\d{1,3})\s+dias\b/
  );

  if (salesLastDaysMatch?.[2]) {
    const days = Math.max(1, Number(salesLastDaysMatch[2]));
    const end = new Date();
    const start = startOfDay(subDays(end, days - 1));

    return toolGetSalesSummary(actor, {
      from: start.toISOString(),
      to: end.toISOString(),
    });
  }

  const monthReference = parseMonthReference(userMessage);
  const asksForExpenses =
    /\b(gasto|gastos)\b/.test(normalized) &&
    /\b(dame|dame mis|mis|lista|listame|mostrar|mostrame|resumen|ver|trae)\b/.test(
      normalized
    );

  if (monthReference && asksForExpenses) {
    return toolListExpensesForRange(actor, monthReference);
  }

  const asksExpensesFollowUp =
    /\b(y|y de|de|del|dame|mostrame|listame)\b/.test(normalized) &&
    /\b(gasto|gastos)\b/.test(normalized) &&
    (recentDomainTopic?.domain === "expenses" || recentFocus?.domain === "expenses");

  if (asksExpensesFollowUp && monthReference) {
    return toolListExpensesForRange(actor, monthReference);
  }

  const asksForSpecificProductFromRecentList =
    recentListContext?.kind === "stock" &&
    /\b(producto|stock|ese|esa|el primero|la primera|de arriba)\b/.test(normalized) &&
    /\b(cual|cuanto|cuanta|mostra|mostrame|decime|dame)\b/.test(normalized);

  if (asksForSpecificProductFromRecentList && recentListContext.items.length === 1) {
    return toolGetProductStock(actor, {
      query: recentListContext.items[0],
    });
  }

  const categoryType = resolveCategoryTypeFromConversation(userMessage, recentContext);
  const categoryStatus = resolveCategoryStatusFromConversation(userMessage, recentContext);
  const categoryFocusActive =
    recentFocus?.domain === "categories" ||
    recentListContext?.kind === "categories" ||
    recentContext.latestClarification?.entityKind === "category";
  const isCategoryQuestion = normalized.includes("categoria") || categoryFocusActive;
  const asksForSpecificCategoryName =
    categoryFocusActive &&
    /\b(cual|cuales)\b/.test(normalized) &&
    /\b(esa|esa categoria|unica|tenemos|hay|son)\b/.test(normalized);

  if (asksForSpecificCategoryName) {
    const categories = await findMatchingCategories(actor, {
      type: categoryType,
      status: categoryStatus,
      limit: 20,
    });

    if (categories.length === 1) {
      return {
        text: `La única categoría de ${formatCategoryTypeLabel(categories[0].type)} que tienen es ${categories[0].name}.`,
        meta: { kind: "categories" } satisfies AssistantMessageMeta,
        result: {
          source: "recent_category_topic",
          count: 1,
          category: categories[0].name,
          type: categories[0].type,
        },
      };
    }

    return toolListCategories(actor, {
      type: categoryType,
      status: categoryStatus,
      limit: 20,
    });
  }

  const asksForCount =
    /\b(cuanto|cuanta|cuantos|cuantas|cantidad|total)\b/.test(normalized) &&
    (normalized.includes("categoria") || categoryFocusActive);
  const asksGenericListFollowUp =
    categoryFocusActive &&
    /\b(cuales|cuales son|cual|mostra|mostrar|mostrame|lista|listame|listar|tenemos|tengo|tenga|hay|son)\b/.test(
      normalized
    );
  const asksForList =
    isCategoryQuestion &&
    (/\b(cuales|cuales son|mostra|mostrar|mostrame|lista|listame|listar|tenemos|tengo|tenga|hay)\b/.test(normalized) ||
      asksGenericListFollowUp ||
      asksForCount);

  if (asksForList) {
    const categories = await findMatchingCategories(actor, {
      type: categoryType,
      status: categoryStatus,
      limit: 50,
    });

    if (asksForCount) {
      const typeLabel =
        categoryType === "PRODUCT"
          ? "de productos"
          : categoryType === "EXPENSE"
          ? "de gastos fijos"
          : "";
      const statusLabel =
        categoryStatus === "ACTIVE"
          ? " habilitadas"
          : categoryStatus === "INACTIVE"
          ? " deshabilitadas"
          : "";

      return {
        text: `Tienen ${categories.length} categoría${categories.length === 1 ? "" : "s"} ${typeLabel}${statusLabel}.`.replace(/\s+/g, " ").trim(),
        meta: { kind: "categories" } satisfies AssistantMessageMeta,
        result: {
          count: categories.length,
          type: categoryType,
          status: categoryStatus,
        },
      };
    }

    return toolListCategories(actor, {
      type: categoryType,
      status: categoryStatus,
      limit: 20,
    });
  }

  const nextStatus = inferCategoryStatusFromMessage(userMessage);
  const looksLikeToggleCategory =
    nextStatus !== null &&
    (normalized.includes("categoria") ||
      categoryFocusActive ||
      /\b(deshabilitala|habilitala|desactivala|activala)\b/.test(normalized) ||
      /\b(habilitame|deshabilitame|activame|desactivame)\b/.test(normalized));

  if (looksLikeToggleCategory) {
    const type = categoryType;
    let categoryQuery =
      extractExplicitCategoryQuery(userMessage) ||
      resolveReferencedEntity(userMessage, recentContext, "category") ||
      "";

    categoryQuery = categoryQuery
      .replace(/^(de\s+productos?|de\s+gastos?(?:\s+fijos?)?|de\s+gasto(?:s)?\s+fijo(?:s)?)\s+/g, "")
      .replace(/^(la|el)\s+/g, "")
      .trim();

    if (!categoryQuery || /^(la|el|esa|esta)$/i.test(categoryQuery)) {
      categoryQuery = extractSingleListedCategory(messages) ?? "";
    }

    if (!categoryQuery) {
      return {
        text: `¿A qué categoría ${type === "EXPENSE" ? "de gasto fijo " : type === "PRODUCT" ? "de producto " : ""}te referís para ${nextStatus ? "habilitarla" : "deshabilitarla"}?`,
        meta: { kind: "categories" } satisfies AssistantMessageMeta,
        result: { needsCategoryClarification: true, nextStatus, type },
      };
    }

    return toolPrepareToggleCategoryStatus(actor, conversationId, {
      categoryQuery,
      type,
      nextStatus,
    });
  }

  const lastAssistantMessage = messages[messages.length - 1];
  const looksLikeBareCategoryReply =
    Boolean(recentContext.latestClarification) &&
    Boolean(normalized) &&
    normalized.split(" ").length <= 4 &&
    !/\b(categoria|habilit|deshabilit|activ|desactiv)\b/.test(normalized) &&
    lastAssistantMessage?.role === "ASSISTANT" &&
    recentContext.latestClarification?.entityKind === "category";

  if (looksLikeBareCategoryReply && recentContext.latestClarification) {
    return toolPrepareToggleCategoryStatus(actor, conversationId, {
      categoryQuery: userMessage.trim(),
      type: recentContext.latestClarification.categoryType ?? categoryType,
      nextStatus: recentContext.latestClarification.nextStatus ?? true,
    });
  }

  return null;
}

function buildListFollowUpAnswer(
  messages: AssistantMessageItem[],
  userMessage: string
): {
  text: string;
  meta: AssistantMessageMeta;
  result: Record<string, unknown>;
} | null {
  const latestListMessage = findLatestAssistantList(messages);
  if (!latestListMessage) return null;

  const listedNames = parseListedNamesFromAssistantMessage(latestListMessage.content);
  if (listedNames.length === 0) return null;

  const normalizedUserMessage = normalizeLooseText(userMessage);

  if (
    /\b(cuantos|cuantas|cuanto|cantidad|total)\b/.test(normalizedUserMessage) &&
    /\b(productos|items|articulos)\b/.test(normalizedUserMessage)
  ) {
    return {
      text: `En esa lista hay ${listedNames.length} producto${listedNames.length === 1 ? "" : "s"} en total.`,
      meta: { kind: latestListMessage.meta?.kind ?? "info" },
      result: { source: "recent_list", count: listedNames.length, items: listedNames },
    };
  }

  const startsWithMatch = normalizedUserMessage.match(
    /\b(empiezan|empiecen|empieza|comienzan|comiencen|comienza)\b.*?\b(?:con|por)\b.*?\b([a-z0-9])\b/
  );

  if (startsWithMatch?.[2]) {
    const letter = startsWithMatch[2].toUpperCase();
    const matches = listedNames.filter(
      (name) => normalizeLooseText(name).charAt(0).toUpperCase() === letter
    );

    if (matches.length === 0) {
      return {
        text: `De esa lista, no hay productos que empiecen con ${letter}.`,
        meta: { kind: latestListMessage.meta?.kind ?? "info" },
        result: { source: "recent_list", startsWith: letter, count: 0, items: [] },
      };
    }

    return {
      text: `De esa lista, ${matches.length === 1 ? "el producto que empieza" : "los productos que empiezan"} con ${letter} ${matches.length === 1 ? "es" : "son"}: ${matches.join(", ")}.`,
      meta: { kind: latestListMessage.meta?.kind ?? "info" },
      result: {
        source: "recent_list",
        startsWith: letter,
        count: matches.length,
        items: matches,
      },
    };
  }

  return null;
}

async function findMatchingProducts(actor: AssistantActor, query: string) {
  const directMatches = await db.product.findMany({
    where: {
      businessId: actor.businessId,
      isDeleted: false,
      OR: [{ name: { contains: query } }, { sku: { contains: query } }],
    },
    orderBy: [{ stock: "desc" }, { name: "asc" }],
    take: 6,
    include: {
      categoryRel: { select: { name: true } },
    },
  });

  if (directMatches.length > 0) {
    return directMatches.map((product) => ({
      ...product,
      matchKind: "direct" as const,
      matchScore: 100,
    }));
  }

  const products = await db.product.findMany({
    where: {
      businessId: actor.businessId,
      isDeleted: false,
    },
    orderBy: [{ stock: "desc" }, { name: "asc" }],
    include: {
      categoryRel: { select: { name: true } },
    },
  });

  return products
    .map((product) => ({
      ...product,
      matchKind: "fuzzy" as const,
      matchScore: scoreProductSimilarity(query, product.name, product.sku),
    }))
    .filter((product) => product.matchScore >= 56)
    .sort((left, right) => {
      if (right.matchScore !== left.matchScore) {
        return right.matchScore - left.matchScore;
      }
      if (right.stock !== left.stock) {
        return right.stock - left.stock;
      }
      return left.name.localeCompare(right.name, "es");
    })
    .slice(0, 6);
}

async function resolveCategoryId(
  actor: AssistantActor,
  type: "PRODUCT" | "EXPENSE",
  rawValue: string | null | undefined
) {
  if (!rawValue) return null;

  const byId = await db.category.findFirst({
    where: {
      id: rawValue,
      businessId: actor.businessId,
      type,
      isActive: true,
    },
  });

  if (byId) return byId.id;

  const byName = await db.category.findFirst({
    where: {
      businessId: actor.businessId,
      type,
      isActive: true,
      name: rawValue,
    },
  });

  if (byName) return byName.id;

  const partial = await db.category.findMany({
    where: {
      businessId: actor.businessId,
      type,
      isActive: true,
      name: { contains: rawValue },
    },
    orderBy: { name: "asc" },
    take: 5,
  });

  if (partial.length === 1) return partial[0].id;
  return null;
}

function formatCategoryTypeLabel(type: "PRODUCT" | "EXPENSE") {
  return type === "PRODUCT" ? "productos" : "gastos fijos";
}

function formatCategoryStatusLabel(isActive: boolean) {
  return isActive ? "habilitada" : "deshabilitada";
}

async function findMatchingCategories(
  actor: AssistantActor,
  input: {
    query?: string | null;
    type?: "PRODUCT" | "EXPENSE" | "ANY";
    status?: "ACTIVE" | "INACTIVE" | "ANY";
    limit?: number;
  }
) {
  const categories = await db.category.findMany({
    where: {
      businessId: actor.businessId,
      type: input.type && input.type !== "ANY" ? input.type : undefined,
      isActive:
        input.status === "ACTIVE"
          ? true
          : input.status === "INACTIVE"
          ? false
          : undefined,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    take: 200,
  });

  const normalizedQuery = normalizeLooseText(input.query ?? "");
  const filtered = normalizedQuery
    ? categories
        .map((category) => {
          const normalizedName = normalizeLooseText(category.name);
          let matchScore = 0;

          if (normalizedName === normalizedQuery) {
            matchScore = 100;
          } else if (normalizedName.startsWith(normalizedQuery)) {
            matchScore = 92;
          } else if (normalizedName.includes(normalizedQuery)) {
            matchScore = 84;
          } else {
            matchScore = scoreSimilarity(normalizedQuery, category.name);
          }

          return {
            ...category,
            matchScore,
          };
        })
        .filter((category) => category.matchScore >= 60)
        .sort((left, right) => {
          if (right.matchScore !== left.matchScore) {
            return right.matchScore - left.matchScore;
          }
          if (left.type !== right.type) {
            return left.type.localeCompare(right.type);
          }
          return left.name.localeCompare(right.name, "es");
        })
    : categories.map((category) => ({
        ...category,
        matchScore: 100,
      }));

  return filtered.slice(0, input.limit ?? 20);
}

async function toolListCategories(actor: AssistantActor, rawArgs: Record<string, unknown>) {
  const { type, status, query, limit } = listCategoriesInput.parse(rawArgs);
  const categories = await findMatchingCategories(actor, {
    query,
    type,
    status,
    limit,
  });

  if (categories.length === 0) {
    const typeLabel = type === "ANY" ? "categorías" : `categorías de ${formatCategoryTypeLabel(type)}`;
    const statusLabel =
      status === "ACTIVE"
        ? " habilitadas"
        : status === "INACTIVE"
        ? " deshabilitadas"
        : "";
    const queryLabel = query?.trim() ? ` que coincidan con "${query.trim()}"` : "";

    return {
      text: `No encontré ${typeLabel}${statusLabel}${queryLabel}.`,
      meta: { kind: "categories" } satisfies AssistantMessageMeta,
      result: { count: 0, type, status, query: query?.trim() || null },
    };
  }

  const lines = categories.map((category) => {
    const usageLabel = category.type === "PRODUCT" ? "productos" : "gastos fijos";
    return `- ${category.name}: ${usageLabel} | ${category.isActive ? "habilitada" : "deshabilitada"}`;
  });

  return {
    text: `Estas son las categorías${type !== "ANY" ? ` de ${formatCategoryTypeLabel(type)}` : ""}${status !== "ANY" ? ` ${status === "ACTIVE" ? "habilitadas" : "deshabilitadas"}` : ""}${query?.trim() ? ` que coinciden con "${query.trim()}"` : ""}:\n${lines.join("\n")}`,
    meta: { kind: "categories" } satisfies AssistantMessageMeta,
    result: {
      count: categories.length,
      type,
      status,
      query: query?.trim() || null,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        type: category.type,
        isActive: category.isActive,
      })),
    },
  };
}

async function toolPrepareToggleCategoryStatus(
  actor: AssistantActor,
  conversationId: string,
  rawArgs: Record<string, unknown>
) {
  ensureWritePermission(actor);
  const values = toggleCategoryStatusDraftInput.parse(rawArgs);
  const categories = await findMatchingCategories(actor, {
    query: values.categoryQuery,
    type: values.type,
    status: "ANY",
    limit: 6,
  });

  if (categories.length === 0) {
    return {
      text: `No encontré una categoría que coincida con "${values.categoryQuery}".`,
      meta: { kind: "categories" } satisfies AssistantMessageMeta,
      result: { count: 0, categoryQuery: values.categoryQuery, type: values.type },
    };
  }

  const exactMatches = categories.filter(
    (category) =>
      normalizeLooseText(category.name) === normalizeLooseText(values.categoryQuery)
  );
  const candidatePool = exactMatches.length > 0 ? exactMatches : categories;

  if (candidatePool.length > 1) {
    const options = candidatePool
      .map(
        (category) =>
          `${category.name} (${formatCategoryTypeLabel(category.type)} - ${formatCategoryStatusLabel(category.isActive)})`
      )
      .join(", ");

    return {
      text: `Encontré varias categorías para "${values.categoryQuery}": ${options}. Decime cuál querés cambiar.`,
      meta: { kind: "categories" } satisfies AssistantMessageMeta,
      result: {
        count: candidatePool.length,
        categoryQuery: values.categoryQuery,
        matches: candidatePool.map((category) => ({
          id: category.id,
          name: category.name,
          type: category.type,
          isActive: category.isActive,
        })),
      },
    };
  }

  const category = candidatePool[0];

  if (category.isActive === values.nextStatus) {
    return {
      text: `La categoría ${category.name} de ${formatCategoryTypeLabel(category.type)} ya está ${formatCategoryStatusLabel(category.isActive)}.`,
      meta: { kind: "categories" } satisfies AssistantMessageMeta,
      result: {
        categoryId: category.id,
        categoryName: category.name,
        type: category.type,
        isActive: category.isActive,
        alreadyInDesiredState: true,
      },
    };
  }

  const previewText = `Voy a ${values.nextStatus ? "habilitar" : "deshabilitar"} la categoría ${category.name} de ${formatCategoryTypeLabel(category.type)}.`;
  const action = await createPendingAction({
    actor,
    conversationId,
    actionType: "TOGGLE_CATEGORY_STATUS",
    previewText,
    payload: {
      categoryId: category.id,
      categoryName: category.name,
      categoryType: category.type,
      nextStatus: values.nextStatus,
    },
  });

  return {
    text: `${previewText}\nSi estás de acuerdo, confirmá la acción y hago el cambio.`,
    meta: { kind: "pending_action", pendingAction: action } satisfies AssistantMessageMeta,
    result: action,
  };
}

function ensureWritePermission(actor: AssistantActor) {
  if (!["OWNER", "ADMIN"].includes(actor.role)) {
    throw new Error("No tenés permisos para ejecutar acciones de escritura desde el asistente.");
  }
}

async function createPendingAction(input: {
  actor: AssistantActor;
  conversationId: string;
  actionType:
    | "CREATE_PRODUCT"
    | "ADJUST_STOCK"
    | "CREATE_EXPENSE"
    | "TOGGLE_CATEGORY_STATUS";
  previewText: string;
  payload: Record<string, unknown>;
}) {
  const expiresAt = new Date(Date.now() + ACTION_TTL_HOURS * 60 * 60 * 1000);

  const action = await db.assistantPendingAction.create({
    data: {
      conversationId: input.conversationId,
      businessId: input.actor.businessId,
      userId: input.actor.userId,
      actionType: input.actionType,
      previewText: input.previewText,
      payloadJson: input.payload,
      expiresAt,
    },
  });

  return summarizePendingAction(action);
}

async function toolGetProductStock(actor: AssistantActor, rawArgs: Record<string, unknown>) {
  const { query } = productStockInput.parse(rawArgs);
  const products = await findMatchingProducts(actor, query);

  if (products.length === 0) {
    return {
      text: `No encontré productos activos que coincidan con "${query}".`,
      meta: { kind: "stock" } satisfies AssistantMessageMeta,
      result: { count: 0, query },
    };
  }

  if (products.length === 1) {
    const product = products[0];
    const matchConfidence = describeMatchConfidence(product.matchScore ?? 100);
    const leadText =
      product.matchKind === "fuzzy"
        ? `No encontré una coincidencia exacta para "${query}", pero el producto más parecido es ${product.name}.`
        : `Quedan ${product.stock} unidades de ${product.name}.`;
    return {
      text: `${
        product.matchKind === "fuzzy"
          ? `Interpreto que quisiste decir ${product.name} (confianza ${matchConfidence}).`
          : leadText
      } Precio de venta: $${Number(product.price).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}.`,
      meta: {
        kind: "stock",
        interpretedProduct:
          product.matchKind === "fuzzy"
            ? {
                query,
                resolvedName: product.name,
                confidence: matchConfidence,
              }
            : null,
      } satisfies AssistantMessageMeta,
      result: {
        productId: product.id,
        name: product.name,
        stock: product.stock,
        price: Number(product.price),
        matchKind: product.matchKind,
        matchScore: product.matchScore,
        matchConfidence,
      },
    };
  }

  const lines = products.map(
    (product) =>
      `- ${product.name}: ${product.stock} uds. (${product.categoryRel?.name ?? "Sin categoría"})`
  );

  return {
    text: `Encontré varias coincidencias para "${query}":\n${lines.join(
      "\n"
    )}\nDecime cuál querés revisar y sigo con esa.`,
    meta: { kind: "stock" } satisfies AssistantMessageMeta,
    result: {
      query,
      matches: products.map((product) => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        matchKind: product.matchKind,
        matchScore: product.matchScore,
        matchConfidence: describeMatchConfidence(product.matchScore ?? 100),
      })),
    },
  };
}

async function toolListProducts(actor: AssistantActor, rawArgs: Record<string, unknown>) {
  const { limit } = listProductsInput.parse(rawArgs);
  const products = await db.product.findMany({
    where: {
      businessId: actor.businessId,
      isDeleted: false,
    },
    orderBy: [{ stock: "desc" }, { name: "asc" }],
    take: limit,
    include: {
      categoryRel: { select: { name: true } },
    },
  });

  if (products.length === 0) {
    return {
      text: "Todavia no tenes productos activos cargados en el inventario.",
      meta: { kind: "stock" } satisfies AssistantMessageMeta,
      result: { count: 0, limit },
    };
  }

  const lines = products.map((product) => {
    const category = product.categoryRel?.name || product.category || "Sin categoria";
    return `- ${product.name}: ${product.stock} uds. | $${Number(product.price).toLocaleString(
      "es-AR"
    )} | ${category}`;
  });

  return {
    text: `Estos son tus productos activos${
      products.length === limit ? ` (primeros ${limit})` : ""
    }:\n${lines.join("\n")}`,
    meta: { kind: "stock" } satisfies AssistantMessageMeta,
    result: {
      count: products.length,
      items: products.map((product) => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        price: Number(product.price),
      })),
    },
  };
}

async function toolListLowStockProducts(
  actor: AssistantActor,
  rawArgs: Record<string, unknown>
) {
  const { limit } = listLowStockProductsInput.parse(rawArgs);
  const products = await db.product.findMany({
    where: {
      businessId: actor.businessId,
      isDeleted: false,
      stock: {
        lte: db.product.fields.minStock,
      },
    },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
    take: limit,
    include: {
      categoryRel: { select: { name: true } },
    },
  });

  if (products.length === 0) {
    return {
      text: "No encontré productos con stock bajo en este momento.",
      meta: { kind: "stock" } satisfies AssistantMessageMeta,
      result: { count: 0, limit },
    };
  }

  const lines = products.map((product) => {
    const category = product.categoryRel?.name || product.category || "Sin categoría";
    return `- ${product.name}: ${product.stock}/${product.minStock} uds. mínimas | ${category}`;
  });

  return {
    text: `Estos son los productos con stock bajo${products.length === limit ? ` (primeros ${limit})` : ""}:\n${lines.join("\n")}`,
    meta: { kind: "stock" } satisfies AssistantMessageMeta,
    result: {
      count: products.length,
      items: products.map((product) => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        minStock: product.minStock,
      })),
    },
  };
}

async function toolListProductsByCategory(
  actor: AssistantActor,
  rawArgs: Record<string, unknown>
) {
  const { categoryQuery, limit } = listProductsByCategoryInput.parse(rawArgs);

  const categories = await db.category.findMany({
    where: {
      businessId: actor.businessId,
      type: "PRODUCT",
      isActive: true,
      OR: [{ name: categoryQuery }, { name: { contains: categoryQuery } }],
    },
    orderBy: { name: "asc" },
    take: 5,
  });

  if (categories.length === 0) {
    return {
      text: `No encontré una categoría de productos que coincida con "${categoryQuery}".`,
      meta: { kind: "stock" } satisfies AssistantMessageMeta,
      result: { count: 0, categoryQuery },
    };
  }

  if (categories.length > 1) {
    return {
      text: `Encontré varias categorías parecidas a "${categoryQuery}": ${categories
        .map((category) => category.name)
        .join(", ")}. Decime cuál querés revisar.`,
      meta: { kind: "stock" } satisfies AssistantMessageMeta,
      result: {
        count: categories.length,
        matches: categories.map((category) => ({
          id: category.id,
          name: category.name,
        })),
      },
    };
  }

  const category = categories[0];
  const products = await db.product.findMany({
    where: {
      businessId: actor.businessId,
      isDeleted: false,
      categoryId: category.id,
    },
    orderBy: [{ stock: "desc" }, { name: "asc" }],
    take: limit,
  });

  if (products.length === 0) {
    return {
      text: `La categoría ${category.name} existe, pero no tiene productos activos cargados.`,
      meta: { kind: "stock" } satisfies AssistantMessageMeta,
      result: { count: 0, category: category.name },
    };
  }

  const lines = products.map(
    (product) =>
      `- ${product.name}: ${product.stock} uds. | $${Number(product.price).toLocaleString("es-AR")}`
  );

  return {
    text: `Estos son los productos de la categoría ${category.name}${products.length === limit ? ` (primeros ${limit})` : ""}:\n${lines.join("\n")}`,
    meta: { kind: "stock" } satisfies AssistantMessageMeta,
    result: {
      count: products.length,
      category: category.name,
      items: products.map((product) => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        price: Number(product.price),
      })),
    },
  };
}

async function toolGetSalesSummary(actor: AssistantActor, rawArgs: Record<string, unknown>) {
  const { from, to } = salesSummaryInput.parse(rawArgs);
  const start = new Date(from);
  const end = new Date(to);

  const sales = await db.sale.findMany({
    where: {
      businessId: actor.businessId,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      items: {
        include: {
          product: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const totalTickets = sales.length;

  const productSales = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items) {
      productSales.set(
        item.product.name,
        (productSales.get(item.product.name) || 0) + item.quantity
      );
    }
  }

  const topProduct = [...productSales.entries()].sort((a, b) => b[1] - a[1])[0];
  const rangeLabel = `${format(start, "d MMM", { locale: es })} al ${format(end, "d MMM", {
    locale: es,
  })}`;

  return {
    text:
      totalTickets === 0
        ? `No hubo ventas registradas entre ${rangeLabel}.`
        : `Entre ${rangeLabel} registraron ${totalTickets} venta${
            totalTickets === 1 ? "" : "s"
          } por un total de $${totalRevenue.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}.${topProduct ? ` El producto más vendido fue ${topProduct[0]} (${topProduct[1]} uds.).` : ""}`,
    meta: { kind: "sales" } satisfies AssistantMessageMeta,
    result: {
      from,
      to,
      totalRevenue,
      totalTickets,
      topProduct: topProduct
        ? { name: topProduct[0], quantity: topProduct[1] }
        : null,
    },
  };
}

async function toolGetSalesPeriodSummary(
  actor: AssistantActor,
  rawArgs: Record<string, unknown>
) {
  const { period } = salesPeriodSummaryInput.parse(rawArgs);
  const now = new Date();

  let start: Date;
  let end: Date;
  let label: string;

  switch (period) {
    case "TODAY":
      start = startOfDay(now);
      end = endOfDay(now);
      label = "hoy";
      break;
    case "THIS_WEEK":
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
      label = "esta semana";
      break;
    case "THIS_MONTH":
      start = startOfMonth(now);
      end = endOfMonth(now);
      label = "este mes";
      break;
  }

  return toolGetSalesSummary(actor, {
    from: start.toISOString(),
    to: end.toISOString(),
  }).then((result) => ({
    ...result,
    text:
      result.result.totalTickets === 0
        ? `No hubo ventas registradas para ${label}.`
        : `Resumen de ventas de ${label}:\n${result.text}`,
    result: {
      ...result.result,
      period,
    },
  }));
}

async function toolQueryInventoryReport(
  actor: AssistantActor,
  rawArgs: Record<string, unknown>
) {
  const input = inventoryReportInput.parse(rawArgs);
  const result = await executeInventoryReportQuery(actor, input);
  return formatInventoryReport(input, result);
}

async function toolQuerySalesReport(
  actor: AssistantActor,
  rawArgs: Record<string, unknown>
) {
  const input = salesReportInput.parse(rawArgs);
  const result = await executeSalesReportQuery(actor, input);
  return formatSalesReport(input, result);
}

async function toolQueryExpenseReport(
  actor: AssistantActor,
  rawArgs: Record<string, unknown>
) {
  const input = expenseReportInput.parse(rawArgs);
  const result = await executeExpenseReportQuery(actor, input);
  return formatExpenseReport(input, result);
}

async function toolGetDueExpenses(actor: AssistantActor, rawArgs: Record<string, unknown>) {
  const { date } = expensesDateInput.parse(rawArgs);
  const baseDate = new Date(date);
  const start = startOfDay(baseDate);
  const end = endOfDay(baseDate);

  const expenses = await db.fixedExpense.findMany({
    where: {
      businessId: actor.businessId,
      isDeleted: false,
      dueDate: {
        gte: start,
        lte: end,
      },
    },
    include: {
      categoryRel: { select: { name: true } },
    },
    orderBy: { amount: "desc" },
  });

  if (expenses.length === 0) {
    return {
      text: `No hay gastos con vencimiento para ${format(baseDate, "d 'de' MMMM", {
        locale: es,
      })}.`,
      meta: { kind: "expenses" } satisfies AssistantMessageMeta,
      result: { count: 0, date },
    };
  }

  const lines = expenses.map((expense) => {
    const category = expense.categoryRel?.name || expense.category || "Otros";
    return `- ${expense.description}: $${Number(expense.amount).toLocaleString(
      "es-AR"
    )} (${category})${expense.isPaid ? " [pagado]" : " [pendiente]"}`;
  });

  return {
    text: `Estos son los gastos que vencen el ${format(baseDate, "d 'de' MMMM", {
      locale: es,
    })}:\n${lines.join("\n")}`,
    meta: { kind: "expenses" } satisfies AssistantMessageMeta,
    result: {
      date,
      count: expenses.length,
      items: expenses.map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: Number(expense.amount),
        isPaid: expense.isPaid,
      })),
    },
  };
}

async function toolListExpensesForRange(
  actor: AssistantActor,
  input: {
    from: Date;
    to: Date;
    label: string;
  }
) {
  const expenses = await db.fixedExpense.findMany({
    where: {
      businessId: actor.businessId,
      dueDate: {
        gte: input.from,
        lte: input.to,
      },
    },
    include: {
      categoryRel: { select: { name: true } },
    },
    orderBy: [{ dueDate: "asc" }, { description: "asc" }],
  });

  if (expenses.length === 0) {
    return {
      text: `No encontré gastos registrados para ${input.label}.`,
      meta: { kind: "expenses" } satisfies AssistantMessageMeta,
      result: { count: 0, from: input.from.toISOString(), to: input.to.toISOString() },
    };
  }

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const lines = expenses.map((expense) => {
    const category = expense.categoryRel?.name || expense.category || "Otros";
    return `- ${expense.description}: ${format(expense.dueDate, "d MMM", { locale: es })} | $${Number(
      expense.amount
    ).toLocaleString("es-AR")} | ${category}${expense.isPaid ? " | pagado" : " | pendiente"}`;
  });

  return {
    text: `Estos son tus gastos de ${input.label}:\n${lines.join("\n")}\nTotal: $${total.toLocaleString(
      "es-AR",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}.`,
    meta: { kind: "expenses" } satisfies AssistantMessageMeta,
    result: {
      count: expenses.length,
      total,
      from: input.from.toISOString(),
      to: input.to.toISOString(),
    },
  };
}

async function toolGetUnpaidExpenses(actor: AssistantActor, rawArgs: Record<string, unknown>) {
  const { from, to } = unpaidExpensesInput.parse(rawArgs);
  const start = new Date(from);
  const end = new Date(to);

  const expenses = await db.fixedExpense.findMany({
    where: {
      businessId: actor.businessId,
      isDeleted: false,
      isPaid: false,
      dueDate: {
        gte: start,
        lte: end,
      },
    },
    include: {
      categoryRel: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 12,
  });

  if (expenses.length === 0) {
    return {
      text: "No encontré gastos pendientes en ese rango.",
      meta: { kind: "expenses" } satisfies AssistantMessageMeta,
      result: { count: 0, from, to },
    };
  }

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const lines = expenses.map((expense) => {
    const category = expense.categoryRel?.name || expense.category || "Otros";
    return `- ${expense.description}: vence ${format(expense.dueDate, "d MMM", {
      locale: es,
    })} por $${Number(expense.amount).toLocaleString("es-AR")} (${category})`;
  });

  return {
    text: `Hay ${expenses.length} gasto${expenses.length === 1 ? "" : "s"} pendiente${
      expenses.length === 1 ? "" : "s"
    } por un total de $${total.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}.\n${lines.join("\n")}`,
    meta: { kind: "expenses" } satisfies AssistantMessageMeta,
    result: { count: expenses.length, total, from, to },
  };
}

async function toolPrepareCreateProduct(
  actor: AssistantActor,
  conversationId: string,
  rawArgs: Record<string, unknown>
) {
  ensureWritePermission(actor);
  const values = createProductDraftInput.parse(rawArgs);

  const existingSku =
    values.sku && values.sku.trim()
      ? await db.product.findFirst({
          where: {
            businessId: actor.businessId,
            sku: values.sku.trim(),
          },
        })
      : null;

  if (existingSku) {
    throw new Error(`El SKU "${values.sku}" ya existe en el negocio.`);
  }

  const categoryId = await resolveCategoryId(actor, "PRODUCT", values.categoryNameOrId);
  const previewText = `Voy a crear el producto ${values.name} con precio de venta $${values.price.toLocaleString(
    "es-AR"
  )}, costo $${values.cost.toLocaleString("es-AR")} y stock inicial ${values.stock}.`;

  const action = await createPendingAction({
    actor,
    conversationId,
    actionType: "CREATE_PRODUCT",
    previewText,
    payload: {
      ...values,
      sku: values.sku?.trim() || null,
      categoryId,
      categoryNameOrId: values.categoryNameOrId ?? null,
    },
  });

  return {
    text: `${previewText}\nSi está bien, confirmá la acción y lo dejo cargado.`,
    meta: { kind: "pending_action", pendingAction: action } satisfies AssistantMessageMeta,
    result: action,
  };
}

async function toolPrepareAdjustStock(
  actor: AssistantActor,
  conversationId: string,
  rawArgs: Record<string, unknown>
) {
  ensureWritePermission(actor);
  const values = adjustStockDraftInput.parse(rawArgs);
  const matches = await findMatchingProducts(actor, values.productQuery);

  if (matches.length === 0) {
    throw new Error(`No encontré un producto activo para "${values.productQuery}".`);
  }

  if (matches.length > 1) {
    const options = matches
      .map((product) => `${product.name} (${product.stock} uds.)`)
      .join(", ");
    throw new Error(`Hay varias coincidencias para "${values.productQuery}": ${options}.`);
  }

  const product = matches[0];
  const previewText = `Voy a dejar el stock de ${product.name} en ${values.newStock} unidades. Motivo: ${values.reason}.`;
  const action = await createPendingAction({
    actor,
    conversationId,
    actionType: "ADJUST_STOCK",
    previewText,
    payload: {
      productId: product.id,
      productName: product.name,
      newStock: values.newStock,
      reason: values.reason,
    },
  });

  return {
    text: `${previewText}\nConfirmame y hago el ajuste.`,
    meta: { kind: "pending_action", pendingAction: action } satisfies AssistantMessageMeta,
    result: action,
  };
}

async function toolPrepareCreateExpense(
  actor: AssistantActor,
  conversationId: string,
  rawArgs: Record<string, unknown>
) {
  ensureWritePermission(actor);
  const values = createExpenseDraftInput.parse(rawArgs);
  const categoryId = await resolveCategoryId(actor, "EXPENSE", values.categoryNameOrId);

  if (!categoryId) {
    throw new Error(`No encontré una categoría de gasto activa para "${values.categoryNameOrId}".`);
  }

  const dueDate = new Date(values.dueDate);
  const previewText = `Voy a registrar el gasto "${values.description}" por $${values.amount.toLocaleString(
    "es-AR"
  )} con vencimiento el ${format(dueDate, "d 'de' MMMM", { locale: es })}.`;

  const action = await createPendingAction({
    actor,
    conversationId,
    actionType: "CREATE_EXPENSE",
    previewText,
    payload: {
      description: values.description,
      amount: values.amount,
      dueDate: dueDate.toISOString(),
      categoryId,
      categoryNameOrId: values.categoryNameOrId,
    },
  });

  return {
    text: `${previewText}\nSi querés, confirmalo y lo cargo.`,
    meta: { kind: "pending_action", pendingAction: action } satisfies AssistantMessageMeta,
    result: action,
  };
}

function resolveDateRangeFromIntent(parameters: Record<string, unknown>) {
  const now = new Date();
  const relativeDays =
    typeof parameters.relativeDays === "number"
      ? parameters.relativeDays
      : typeof parameters.relativeDays === "string"
      ? Number(parameters.relativeDays)
      : NaN;
  const month =
    typeof parameters.month === "number"
      ? parameters.month
      : typeof parameters.month === "string"
      ? Number(parameters.month)
      : NaN;
  const year =
    typeof parameters.year === "number"
      ? parameters.year
      : typeof parameters.year === "string"
      ? Number(parameters.year)
      : NaN;

  if (typeof parameters.from === "string" && typeof parameters.to === "string") {
    return {
      from: new Date(parameters.from),
      to: new Date(parameters.to),
      label: "el período indicado",
    };
  }

  if (typeof parameters.period === "string") {
    switch (parameters.period) {
      case "TODAY":
        return {
          from: startOfDay(now),
          to: endOfDay(now),
          label: "hoy",
        };
      case "THIS_WEEK":
        return {
          from: startOfWeek(now, { weekStartsOn: 1 }),
          to: endOfWeek(now, { weekStartsOn: 1 }),
          label: "esta semana",
        };
      case "THIS_MONTH":
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
          label: "este mes",
        };
    }
  }

  if (Number.isFinite(relativeDays)) {
    const days = Math.max(1, Math.round(relativeDays));
    return {
      from: startOfDay(subDays(now, days - 1)),
      to: now,
      label: `los últimos ${days} días`,
    };
  }

  if (
    Number.isFinite(month) &&
    Number.isFinite(year)
  ) {
    const monthIndex = Math.min(12, Math.max(1, Math.round(month))) - 1;
    const resolvedYear = Math.round(year);
    return {
      from: startOfMonth(new Date(resolvedYear, monthIndex, 1)),
      to: endOfMonth(new Date(resolvedYear, monthIndex, 1)),
      label: format(new Date(resolvedYear, monthIndex, 1), "MMMM 'de' yyyy", { locale: es }),
    };
  }

  return null;
}

async function executeStructuredIntent(
  actor: AssistantActor,
  conversationId: string,
  decision: Extract<AssistantIntentDecision, { kind: "intent" }>
) {
  const parameters = decision.parameters ?? {};

  switch (decision.intentName) {
    case "GREETING":
      return {
        text: `Puedo ayudarte con stock, ventas, gastos, categorías y acciones como crear productos, ajustar stock, registrar gastos o cambiar el estado de categorías. Decime qué necesitás del negocio y lo resolvemos.`,
        meta: { kind: "info" } satisfies AssistantMessageMeta,
        result: { intentName: decision.intentName },
      };
    case "LIST_PRODUCTS":
      return toolListProducts(actor, { limit: parameters.limit ?? 12 });
    case "LIST_LOW_STOCK_PRODUCTS":
      return toolListLowStockProducts(actor, { limit: parameters.limit ?? 12 });
    case "LIST_PRODUCTS_BY_CATEGORY":
      if (typeof parameters.categoryQuery !== "string" || !parameters.categoryQuery.trim()) {
        return {
          text: "¿De qué categoría de productos querés que te liste los productos?",
          meta: { kind: "info" } satisfies AssistantMessageMeta,
          result: { intentName: decision.intentName, needsClarification: true },
        };
      }
      return toolListProductsByCategory(actor, {
        categoryQuery: parameters.categoryQuery,
        limit: parameters.limit ?? 12,
      });
    case "GET_PRODUCT_STOCK":
      if (typeof parameters.productQuery !== "string" || !parameters.productQuery.trim()) {
        return {
          text: "¿Qué producto querés revisar?",
          meta: { kind: "info" } satisfies AssistantMessageMeta,
          result: { intentName: decision.intentName, needsClarification: true },
        };
      }
      return toolGetProductStock(actor, { query: parameters.productQuery });
    case "INVENTORY_REPORT":
      return toolQueryInventoryReport(actor, parameters);
    case "SALES_REPORT": {
      const range = resolveDateRangeFromIntent(parameters);
      if (!range) {
        return {
          text: "¿Qué período de ventas querés revisar?",
          meta: { kind: "info" } satisfies AssistantMessageMeta,
          result: { intentName: decision.intentName, needsClarification: true },
        };
      }

      if (
        typeof parameters.period === "string" &&
        ["TODAY", "THIS_WEEK", "THIS_MONTH"].includes(parameters.period)
      ) {
        return toolGetSalesPeriodSummary(actor, { period: parameters.period });
      }

      return toolGetSalesSummary(actor, {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
    }
    case "EXPENSE_REPORT": {
      const range = resolveDateRangeFromIntent(parameters);
      const responseMode =
        typeof parameters.responseMode === "string" ? parameters.responseMode : "summary";

      if (responseMode === "list" && range) {
        return toolListExpensesForRange(actor, range);
      }

      if (!range) {
        return {
          text: "¿Qué período de gastos querés revisar?",
          meta: { kind: "info" } satisfies AssistantMessageMeta,
          result: { intentName: decision.intentName, needsClarification: true },
        };
      }

      return toolQueryExpenseReport(actor, {
        dateRange: {
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        },
        filters: {
          status:
            typeof parameters.expenseStatus === "string" ? parameters.expenseStatus : undefined,
          categoryQueryAny:
            typeof parameters.categoryQuery === "string" && parameters.categoryQuery.trim()
              ? [parameters.categoryQuery]
              : undefined,
        },
        metrics: ["amount_total", "expense_count"],
        groupBy: responseMode === "count" ? undefined : ["category"],
        sort: responseMode === "count" ? undefined : { field: "amount_total", direction: "desc" },
        limit: typeof parameters.limit === "number" ? parameters.limit : 12,
      });
    }
    case "LIST_CATEGORIES":
      return toolListCategories(actor, {
        type: parameters.categoryType ?? "ANY",
        status: parameters.categoryStatus ?? "ANY",
        query: parameters.categoryQuery ?? null,
        limit: parameters.limit ?? 20,
      });
    case "CREATE_PRODUCT":
      return toolPrepareCreateProduct(actor, conversationId, parameters);
    case "ADJUST_STOCK":
      return toolPrepareAdjustStock(actor, conversationId, parameters);
    case "CREATE_EXPENSE":
      return toolPrepareCreateExpense(actor, conversationId, parameters);
    case "TOGGLE_CATEGORY_STATUS":
      if (
        typeof (parameters.categoryQuery ?? parameters.query ?? parameters.name) !== "string" ||
        !String(parameters.categoryQuery ?? parameters.query ?? parameters.name).trim()
      ) {
        return {
          text: "Decime qué categoría querés cambiar y lo preparo.",
          meta: { kind: "info" } satisfies AssistantMessageMeta,
          result: { intentName: decision.intentName, needsClarification: true },
        };
      }
      return toolPrepareToggleCategoryStatus(actor, conversationId, {
        categoryQuery: String(parameters.categoryQuery ?? parameters.query ?? parameters.name),
        type: (parameters.categoryType ?? parameters.type ?? "ANY") as "PRODUCT" | "EXPENSE" | "ANY",
        nextStatus:
          typeof parameters.nextStatus === "boolean"
            ? parameters.nextStatus
            : typeof parameters.nextStatus === "string"
            ? ["true", "1", "habilitar", "activar", "enable"].includes(
                parameters.nextStatus.toLowerCase()
              )
            : typeof parameters.action === "string"
            ? ["habilitar", "activar", "enable"].includes(parameters.action.toLowerCase())
            : false,
      });
  }
}

export async function listAssistantConversations(
  actor: AssistantActor,
  limit = CONVERSATION_LIMIT,
  options?: { status?: "ACTIVE" | "ARCHIVED" }
) {
  const status = options?.status ?? "ACTIVE";
  const archivedCutoff = new Date(
    Date.now() - ARCHIVED_RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const conversations = await db.assistantConversation.findMany({
    where: {
      businessId: actor.businessId,
      userId: actor.userId,
      ...(status === "ACTIVE"
        ? { isDeleted: false }
        : { isDeleted: true, deletedAt: { gte: archivedCutoff } }),
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
        },
      },
      pendingActions: {
        where: { status: "PENDING" },
        take: 1,
        select: { id: true },
      },
    },
      orderBy: status === "ACTIVE" ? { updatedAt: "desc" } : { deletedAt: "desc" },
      take: Math.min(Math.max(limit, 1), MAX_CONVERSATION_PAGE_SIZE),
    });

  return conversations.map(serializeConversationWithMeta);
}

export async function createAssistantConversation(actor: AssistantActor) {
  const conversation = await db.assistantConversation.create({
    data: {
      businessId: actor.businessId,
      userId: actor.userId,
      title: "Nueva conversación",
    },
  });

  return serializeConversation(conversation);
}

export async function archiveAssistantConversation(input: {
  actor: AssistantActor;
  conversationId: string;
}) {
  const conversation = await db.assistantConversation.findFirst({
    where: {
      id: input.conversationId,
      businessId: input.actor.businessId,
      userId: input.actor.userId,
      isDeleted: false,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!conversation) {
    throw new Error("Conversación no encontrada.");
  }

  await db.assistantConversation.update({
    where: { id: conversation.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const nextConversation = await db.assistantConversation.findFirst({
    where: {
      businessId: input.actor.businessId,
      userId: input.actor.userId,
      isDeleted: false,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  return {
    conversationId: conversation.id,
    title: conversation.title?.trim() || "Nueva conversación",
    nextConversationId: nextConversation?.id ?? null,
    deletedAt: new Date().toISOString(),
  };
}

export async function restoreAssistantConversation(input: {
  actor: AssistantActor;
  conversationId: string;
}) {
  const archivedCutoff = new Date(
    Date.now() - ARCHIVED_RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const conversation = await db.assistantConversation.findFirst({
    where: {
      id: input.conversationId,
      businessId: input.actor.businessId,
      userId: input.actor.userId,
      isDeleted: true,
      deletedAt: { gte: archivedCutoff },
    },
    select: {
      id: true,
    },
  });

  if (!conversation) {
    throw new Error(
      "La conversación no está disponible para restaurar. El plazo de 30 días puede haber vencido."
    );
  }

  await db.assistantConversation.update({
    where: { id: conversation.id },
    data: {
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date(),
    },
  });

  const restoredConversation = await db.assistantConversation.findUnique({
    where: { id: conversation.id },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
        },
      },
      pendingActions: {
        where: { status: "PENDING" },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!restoredConversation) {
    throw new Error("No pude restaurar la conversación.");
  }

  return {
    conversation: serializeConversationWithMeta(restoredConversation),
  };
}

export async function getAssistantBootstrap(
  actor: AssistantActor
): Promise<AssistantBootstrapPayload> {
  const conversations = await listAssistantConversations(actor, CONVERSATION_LIMIT, {
    status: "ACTIVE",
  });

  return {
    assistantName: "Asistente",
    businessName: actor.businessName,
    userRole: actor.role,
    starterPrompts: [
      "Cuánto stock queda de medialunas",
      "Cuántas ventas hicimos en los últimos 10 días",
      "Qué gastos vencen hoy",
      "Cargame el gasto de luz de este mes",
    ],
    latestConversationId: conversations[0]?.id ?? null,
    conversations,
  };
}

export async function getConversationMessages(
  actor: AssistantActor,
  conversationId: string,
  limit = MESSAGE_LIMIT
) {
  const conversation = await db.assistantConversation.findFirst({
    where: {
      id: conversationId,
      businessId: actor.businessId,
      userId: actor.userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: Math.min(Math.max(limit, 1), MAX_MESSAGE_PAGE_SIZE),
      },
    },
  });

  if (!conversation) {
    throw new Error("Conversación no encontrada.");
  }

  const messages = await syncPendingActionsInMessages(
    conversation.messages.map(serializeMessage)
  );

  return {
    conversation: serializeConversation(conversation),
    messages,
  };
}

async function appendConversationMessage(input: {
  conversationId: string;
  role: "USER" | "ASSISTANT" | "TOOL" | "SYSTEM";
  content: string;
  meta?: AssistantMessageMeta | null;
}) {
  const message = await db.assistantMessage.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      retentionClass: classifyMessageRetention({
        role: input.role,
        content: input.content,
        meta: input.meta,
      }),
      content: normalizePotentialMojibake(input.content),
      metaJson: input.meta ?? undefined,
    },
  });

  await db.assistantConversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });

  return serializeMessage(message);
}

async function interpretAssistantIntent(input: {
  actor: AssistantActor;
  messages: AssistantMessageItem[];
  conversationSummary: string | null;
  userMessage: string;
}) {
  const prompt = buildIntentParserPrompt(
    input.actor,
    input.messages,
    input.conversationSummary,
    input.userMessage
  );
  const response = await callGeminiJson(prompt);
  return assistantIntentSchema.parse(response.json) as AssistantIntentDecision;
}

export async function sendAssistantMessage(input: {
  actor: AssistantActor;
  conversationId: string;
  message: string;
}) {
  const conversation = await db.assistantConversation.findFirst({
    where: {
      id: input.conversationId,
      businessId: input.actor.businessId,
      userId: input.actor.userId,
      isDeleted: false,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: MESSAGE_LIMIT,
      },
    },
  });

  if (!conversation) {
    throw new Error("Conversación no encontrada.");
  }

  if (!conversation.title || conversation.title === "Nueva conversación") {
    await db.assistantConversation.update({
      where: { id: conversation.id },
      data: { title: buildConversationTitle(input.message) },
    });
  }

  const userMessage = await appendConversationMessage({
      conversationId: input.conversationId,
      role: "USER",
      content: input.message,
    });

    try {
      const serializedMessages = conversation.messages.map(serializeMessage);
      const deterministicAnswer = await resolveDeterministicAssistantIntent(
        input.actor,
        input.conversationId,
        serializedMessages,
        input.message
      );

      if (deterministicAnswer) {
        const assistantMessage = await appendConversationMessage({
          conversationId: input.conversationId,
          role: "ASSISTANT",
          content: deterministicAnswer.text,
          meta: deterministicAnswer.meta,
        });

        await insertAuditLog({
          actor: input.actor,
          conversationId: input.conversationId,
          toolName: "deterministic_intent",
          toolInputJson: { userMessage: input.message },
          toolResultJson: deterministicAnswer.result,
          status: "SUCCESS",
        });

        return {
          userMessage,
          assistantMessage,
        };
      }

      const decision = await interpretAssistantIntent({
        actor: input.actor,
        messages: serializedMessages,
        conversationSummary: conversation.memorySummary ?? null,
        userMessage: input.message,
      });

    if (decision.kind === "message") {
      const assistantMessage = await appendConversationMessage({
        conversationId: input.conversationId,
        role: "ASSISTANT",
        content: decision.message,
        meta: { kind: "info" },
      });

      await insertAuditLog({
        actor: input.actor,
        conversationId: input.conversationId,
        toolName: "intent_message",
        toolInputJson: { userMessage: input.message },
        toolResultJson: decision,
        status: "SUCCESS",
      });

      return {
        userMessage,
        assistantMessage,
      };
    }

    const toolResult = await executeStructuredIntent(
      input.actor,
      input.conversationId,
      decision
    );
    const assistantMessage = await appendConversationMessage({
      conversationId: input.conversationId,
      role: "ASSISTANT",
      content: toolResult.text,
      meta: toolResult.meta,
    });

    await insertAuditLog({
      actor: input.actor,
      conversationId: input.conversationId,
      toolName: decision.intentName,
      toolInputJson: decision.parameters,
      toolResultJson: toolResult.result,
      status: "SUCCESS",
      entityType: toolResult.meta.pendingAction?.actionType,
      entityId: toolResult.meta.pendingAction?.id,
    });

    return {
      userMessage,
      assistantMessage,
    };
    } catch (error) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : "No pude procesar tu pedido en este momento.";
      const normalizedError = rawMessage.toLowerCase();
      const looksLikeValidationLeak =
        normalizedError.includes("invalid option") ||
        normalizedError.includes("invalid_value") ||
        normalizedError.includes("\"code\"") ||
        normalizedError.includes("zoderror") ||
        normalizedError.includes("expected one of") ||
        normalizedError.startsWith("[{") ||
        normalizedError.startsWith("[\r\n") ||
        normalizedError.startsWith("[\n");
      let message = looksLikeValidationLeak
        ? "No pude interpretar ese pedido con suficiente precisión. Probá reformularlo o pedime el dato de otra manera y lo intento de nuevo."
        : toUserFacingAssistantError(rawMessage);

      if (looksLikeValidationLeak) {
        message =
          "No terminé de interpretar bien ese pedido. Si querés, decímelo de otra forma y sigo desde ahí con vos.";
      }

      const assistantMessage = await appendConversationMessage({
        conversationId: input.conversationId,
        role: "ASSISTANT",
      content: message,
      meta: { kind: "error" },
    });

    await insertAuditLog({
      actor: input.actor,
      conversationId: input.conversationId,
      toolName: "planner_or_tool_error",
      toolInputJson: { userMessage: input.message },
      toolResultJson: { error: rawMessage, userFacingError: message },
      status: "ERROR",
    });

    return {
      userMessage,
      assistantMessage,
    };
  } finally {
    void compactConversationMemory(input.conversationId);
  }
}

async function executeCreateProduct(
  actor: AssistantActor,
  payload: Record<string, unknown>
) {
  const values = createProductDraftInput
    .extend({
      categoryId: z.string().uuid().nullable().optional(),
    })
    .parse(payload);

  const product = await db.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        name: values.name.trim(),
        sku: values.sku?.trim() || null,
        categoryId: values.categoryId || null,
        category: values.categoryNameOrId?.trim() || null,
        cost: values.cost,
        price: values.price,
        stock: values.stock,
        minStock: values.minStock,
        businessId: actor.businessId,
      },
    });

    await tx.productCatalog.create({
      data: {
        productId: created.id,
        businessId: actor.businessId,
        isPublic: values.isPublic !== undefined ? values.isPublic : true,
        isDeleted: false,
      }
    });

    if (values.stock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: created.id,
          businessId: actor.businessId,
          type: "IN",
          quantity: values.stock,
          reason: "Stock inicial desde asistente",
        },
      });
    }

    return created;
  });

  return {
    entityType: "Product",
    entityId: product.id,
    message: `Listo, creé el producto ${product.name} correctamente.`,
  };
}

async function executeAdjustStock(
  actor: AssistantActor,
  payload: Record<string, unknown>
) {
  const values = z
    .object({
      productId: z.string().uuid(),
      productName: z.string(),
      newStock: z.coerce.number().int().min(0),
      reason: z.string().min(1),
    })
    .parse(payload);

  await db.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: {
        id: values.productId,
        businessId: actor.businessId,
        isDeleted: false,
      },
    });

    if (!product) {
      throw new Error("El producto a ajustar ya no está disponible.");
    }

    const delta = values.newStock - product.stock;

    await tx.product.update({
      where: { id: product.id },
      data: { stock: values.newStock },
    });

    if (delta !== 0) {
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          businessId: actor.businessId,
          type: delta > 0 ? "IN" : "OUT",
          quantity: Math.abs(delta),
          reason: values.reason,
        },
      });
    }
  });

  return {
    entityType: "Product",
    entityId: values.productId,
    message: `Listo, dejé el stock de ${values.productName} en ${values.newStock} unidades.`,
  };
}

async function executeCreateExpense(
  actor: AssistantActor,
  payload: Record<string, unknown>
) {
  const values = z
    .object({
      description: z.string().min(1),
      amount: z.coerce.number().positive(),
      dueDate: z.string().min(1),
      categoryId: z.string().uuid(),
      categoryNameOrId: z.string().min(1),
    })
    .parse(payload);

  const expense = await db.fixedExpense.create({
    data: {
      description: values.description.trim(),
      amount: values.amount,
      dueDate: new Date(values.dueDate),
      categoryId: values.categoryId,
      category: values.categoryNameOrId,
      businessId: actor.businessId,
    },
  });

  return {
    entityType: "FixedExpense",
    entityId: expense.id,
    message: `Listo, registré el gasto "${expense.description}" por $${Number(
      expense.amount
    ).toLocaleString("es-AR")}.`,
  };
}

async function executeToggleCategoryStatus(
  actor: AssistantActor,
  payload: Record<string, unknown>
) {
  const values = z
    .object({
      categoryId: z.string().uuid(),
      categoryName: z.string().min(1),
      categoryType: z.enum(["PRODUCT", "EXPENSE"]),
      nextStatus: z.coerce.boolean(),
    })
    .parse(payload);

  const category = await db.category.findFirst({
    where: {
      id: values.categoryId,
      businessId: actor.businessId,
    },
  });

  if (!category) {
    throw new Error("La categoria que queres actualizar ya no esta disponible.");
  }

  await db.category.update({
    where: { id: category.id },
    data: { isActive: values.nextStatus },
  });

  revalidatePath("/dashboard/settings/categories");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/expenses");

  return {
    entityType: "Category",
    entityId: category.id,
    message: `Listo, ${values.nextStatus ? "habilite" : "deshabilite"} la categoria ${category.name} de ${formatCategoryTypeLabel(category.type)}.`,
  };
}

export async function confirmPendingAction(input: {
  actor: AssistantActor;
  actionId: string;
}) {
  const action = await db.assistantPendingAction.findFirst({
    where: {
      id: input.actionId,
      businessId: input.actor.businessId,
      userId: input.actor.userId,
      status: "PENDING",
    },
  });

  if (!action) {
    throw new Error("La acción pendiente no existe o ya no está disponible.");
  }

  if (action.expiresAt && action.expiresAt < new Date()) {
    await db.assistantPendingAction.update({
      where: { id: action.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("La acción expiró. Pedime nuevamente la operación.");
  }

  ensureWritePermission(input.actor);

  let executionResult: {
    entityType: string;
    entityId: string;
    message: string;
  };

  try {
    const payload = action.payloadJson as Record<string, unknown>;
    switch (action.actionType) {
      case "CREATE_PRODUCT":
        executionResult = await executeCreateProduct(input.actor, payload);
        break;
      case "ADJUST_STOCK":
        executionResult = await executeAdjustStock(input.actor, payload);
        break;
      case "CREATE_EXPENSE":
        executionResult = await executeCreateExpense(input.actor, payload);
        break;
      case "TOGGLE_CATEGORY_STATUS":
        executionResult = await executeToggleCategoryStatus(input.actor, payload);
        break;
      default:
        throw new Error("Tipo de acción no soportado.");
    }

    await db.assistantPendingAction.update({
      where: { id: action.id },
      data: {
        status: "EXECUTED",
        executedAt: new Date(),
      },
    });

    const assistantMessage = await appendConversationMessage({
      conversationId: action.conversationId,
      role: "ASSISTANT",
      content: executionResult.message,
      meta: { kind: "success" },
    });

    await insertAuditLog({
      actor: input.actor,
      conversationId: action.conversationId,
      toolName: `confirm_${action.actionType.toLowerCase()}`,
      toolInputJson: action.payloadJson,
      toolResultJson: executionResult,
      status: "SUCCESS",
      entityType: executionResult.entityType,
      entityId: executionResult.entityId,
    });

    return {
      action: summarizePendingAction({
        ...action,
        status: "EXECUTED",
      }),
      assistantMessage,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pude ejecutar la acción pendiente.";

    await db.assistantPendingAction.update({
      where: { id: action.id },
      data: {
        status: "FAILED",
      },
    });

    await insertAuditLog({
      actor: input.actor,
      conversationId: action.conversationId,
      toolName: `confirm_${action.actionType.toLowerCase()}`,
      toolInputJson: action.payloadJson,
      toolResultJson: { error: message },
      status: "ERROR",
    });

    throw new Error(message);
  }
}

export async function cancelPendingAction(input: {
  actor: AssistantActor;
  actionId: string;
}) {
  const action = await db.assistantPendingAction.findFirst({
    where: {
      id: input.actionId,
      businessId: input.actor.businessId,
      userId: input.actor.userId,
      status: "PENDING",
    },
  });

  if (!action) {
    throw new Error("La acción ya no está disponible para cancelar.");
  }

  await db.assistantPendingAction.update({
    where: { id: action.id },
    data: { status: "CANCELLED" },
  });

  const assistantMessage = await appendConversationMessage({
    conversationId: action.conversationId,
    role: "ASSISTANT",
    content: "Perfecto, cancelé esa acción. Si querés, la reformulamos juntos.",
    meta: { kind: "info" },
  });

  await insertAuditLog({
    actor: input.actor,
    conversationId: action.conversationId,
    toolName: `cancel_${action.actionType.toLowerCase()}`,
    toolInputJson: action.payloadJson,
    toolResultJson: { cancelled: true },
    status: "SUCCESS",
  });

  return {
    action: summarizePendingAction({
      ...action,
      status: "CANCELLED",
    }),
    assistantMessage,
  };
}
