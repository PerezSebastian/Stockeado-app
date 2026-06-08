"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import type {
  AssistantBootstrapPayload,
  AssistantConversationItem,
  AssistantMessageItem,
  AssistantPendingActionSummary,
} from "@/types/assistant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  Archive,
  ArrowLeft,
  Bot,
  CheckCheck,
  Clock3,
  Inbox,
  Loader2,
  MessageCircleMore,
  Plus,
  RotateCcw,
  Search,
  SendHorizonal,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type ApiError = { error?: string };
const CONVERSATION_PAGE_SIZE = 100;
const MESSAGE_PAGE_SIZE = 500;

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(data.error || "Ocurrio un error inesperado.");
  }

  return data;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDaysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function buildOptimisticMessage(
  id: string,
  role: AssistantMessageItem["role"],
  content: string,
  meta?: AssistantMessageItem["meta"]
): AssistantMessageItem {
  return {
    id,
    role,
    content,
    createdAt: new Date().toISOString(),
    meta: meta ?? null,
  };
}

function updatePendingActionStatus(
  messages: AssistantMessageItem[],
  actionId: string,
  status: AssistantPendingActionSummary["status"]
) {
  return messages.map((message) => {
    if (message.meta?.pendingAction?.id !== actionId) {
      return message;
    }

    return {
      ...message,
      meta: {
        ...message.meta,
        pendingAction: {
          ...message.meta.pendingAction,
          status,
        },
      },
    };
  });
}

function getPendingActionPresentation(status: AssistantPendingActionSummary["status"]) {
  switch (status) {
    case "EXECUTED":
      return {
        title: "Accion ejecutada",
        badge: "Ejecutada",
        badgeClassName: "bg-success/15 text-success",
      };
    case "CANCELLED":
      return {
        title: "Accion cancelada",
        badge: "Cancelada",
        badgeClassName: "bg-surface-subtle text-muted-foreground",
      };
    case "FAILED":
      return {
        title: "Accion fallida",
        badge: "Fallida",
        badgeClassName: "bg-destructive/15 text-destructive",
      };
    case "EXPIRED":
      return {
        title: "Accion vencida",
        badge: "Vencida",
        badgeClassName: "bg-surface-subtle text-muted-foreground",
      };
    default:
      return {
        title: "Accion pendiente",
        badge: "Pendiente",
        badgeClassName: "bg-warning/15 text-warning",
      };
  }
}

export function AssistantWorkspace() {
  const [viewMode, setViewMode] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [bootstrap, setBootstrap] = useState<AssistantBootstrapPayload | null>(null);
  const [conversations, setConversations] = useState<AssistantConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [initialLoading, setInitialLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [archiveLoadingId, setArchiveLoadingId] = useState<string | null>(null);
  const [restoreLoadingId, setRestoreLoadingId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const optimisticMessageIdRef = useRef(0);

  const starterPrompts = bootstrap?.starterPrompts ?? [];
  const businessName = bootstrap?.businessName ?? "tu negocio";

  const filteredConversations = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) => {
      return (
        conversation.title.toLowerCase().includes(query) ||
        conversation.lastMessagePreview?.toLowerCase().includes(query)
      );
    });
  }, [conversations, debouncedSearch]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  );
  const isArchivedConversation = !!activeConversation?.isDeleted;

  useEffect(() => {
    function syncViewport() {
      setIsDesktop(window.innerWidth >= 768);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => {
    if (!listRef.current || messagesLoading) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, messagesLoading]);

  const focusComposer = useCallback(() => {
    window.setTimeout(() => textareaRef.current?.focus(), 40);
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      setMessagesLoading(true);
      setError(null);
      setActiveConversationId(conversationId);

      const data = await fetchJson<{
        conversation: AssistantConversationItem;
        messages: AssistantMessageItem[];
      }>(`/api/chat/conversations/${conversationId}/messages?limit=${MESSAGE_PAGE_SIZE}`);

      setMessages(data.messages);
      setConversations((current) => {
        const existing = current.find((item) => item.id === conversationId);
        return current.map((item) =>
          item.id === conversationId
            ? {
                ...existing,
                ...data.conversation,
                hasPendingActions:
                  data.conversation.hasPendingActions ?? existing?.hasPendingActions ?? false,
                lastMessagePreview:
                  data.conversation.lastMessagePreview ?? existing?.lastMessagePreview ?? null,
                lastMessageCreatedAt:
                  data.conversation.lastMessageCreatedAt ??
                  existing?.lastMessageCreatedAt ??
                  null,
              }
            : item
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude cargar la conversacion.");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const createConversation = useCallback(
    async (options?: { preserveMessages?: boolean; focusComposer?: boolean }) => {
      const data = await fetchJson<{ conversation: AssistantConversationItem }>(
        "/api/chat/conversations",
        { method: "POST" }
      );

      if (viewMode === "ARCHIVED") {
        setViewMode("ACTIVE");
        setConversations([data.conversation]);
      } else {
        setConversations((current) => [data.conversation, ...current]);
      }
      setBootstrap((current) =>
        current
          ? {
              ...current,
              latestConversationId: data.conversation.id,
            }
          : current
      );
      setActiveConversationId(data.conversation.id);
      if (!options?.preserveMessages) {
        setMessages([]);
      }
      if (options?.focusComposer) {
        focusComposer();
      }
      return data.conversation.id;
    },
    [focusComposer, viewMode]
  );

  const loadWorkspace = useCallback(async () => {
    try {
      setInitialLoading(true);
      const [bootstrapData, conversationsData] = await Promise.all([
        fetchJson<AssistantBootstrapPayload>("/api/chat/bootstrap"),
        fetchJson<{ conversations: AssistantConversationItem[] }>(
          `/api/chat/conversations?limit=${CONVERSATION_PAGE_SIZE}&status=${viewMode}`
        ),
      ]);

      setBootstrap(bootstrapData);
      setConversations(conversationsData.conversations);
      setActiveConversationId(null);
      setMessages([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude cargar el asistente.");
    } finally {
      setInitialLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!isDesktop || activeConversationId || conversations.length === 0) return;
    void loadConversation(conversations[0].id);
  }, [activeConversationId, conversations, isDesktop, loadConversation]);

  const archiveConversation = useCallback(
    async (conversation: AssistantConversationItem) => {
      try {
        setArchiveLoadingId(conversation.id);
        setError(null);

        const result = await fetchJson<{
          conversationId: string;
          nextConversationId: string | null;
        }>(`/api/chat/conversations/${conversation.id}`, {
          method: "DELETE",
        });

        setConversations((current) =>
          current.filter((item) => item.id !== result.conversationId)
        );

        setBootstrap((current) =>
          current
            ? {
                ...current,
                latestConversationId:
                  current.latestConversationId === result.conversationId
                    ? result.nextConversationId
                    : current.latestConversationId,
              }
            : current
        );

        if (activeConversationId === result.conversationId) {
          if (result.nextConversationId) {
            setMessages([]);
            setActiveConversationId(result.nextConversationId);
            await loadConversation(result.nextConversationId);
          } else {
            setActiveConversationId(null);
            setMessages([]);
            setInput("");
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No pude archivar la conversación en este momento."
        );
      } finally {
        setArchiveLoadingId(null);
      }
    },
    [activeConversationId, loadConversation]
  );

  const restoreConversation = useCallback(
    async (conversation: AssistantConversationItem) => {
      try {
        setRestoreLoadingId(conversation.id);
        setError(null);

        const result = await fetchJson<{
          conversation: AssistantConversationItem;
        }>(`/api/chat/conversations/${conversation.id}/restore`, {
          method: "POST",
        });

        setConversations((current) =>
          current.filter((item) => item.id !== conversation.id)
        );

        setBootstrap((current) =>
          current
            ? {
                ...current,
                latestConversationId: result.conversation.id,
              }
            : current
        );

        setViewMode("ACTIVE");
        setConversations((current) => [result.conversation, ...current]);
        setActiveConversationId(result.conversation.id);
        setMessages([]);
        await loadConversation(result.conversation.id);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No pude restaurar la conversación en este momento."
        );
      } finally {
        setRestoreLoadingId(null);
      }
    },
    [loadConversation]
  );

  async function sendMessage(prefilled?: string) {
    const content = (prefilled ?? input).trim();
    if (!content || sending || isArchivedConversation) return;

    const optimisticId = optimisticMessageIdRef.current + 1;
    optimisticMessageIdRef.current = optimisticId;
    const optimisticUserMessage = buildOptimisticMessage(
      `workspace-user-${optimisticId}`,
      "USER",
      content
    );
    const optimisticAssistantMessage = buildOptimisticMessage(
      `workspace-assistant-${optimisticId}`,
      "ASSISTANT",
      "Enviando...",
      { kind: "info" }
    );

    setSending(true);
    setError(null);
    setInput("");
    setMessages((current) => [
      ...current,
      optimisticUserMessage,
      optimisticAssistantMessage,
    ]);

    try {
      const conversationId =
        activeConversationId ??
        (await createConversation({ preserveMessages: true, focusComposer: true }));

      setActiveConversationId(conversationId);
      setConversations((current) => {
        const next = current.filter((item) => item.id !== conversationId);
        const existing = current.find((item) => item.id === conversationId);
        const shouldReuseTitle =
          !!existing?.title &&
          !existing.title.toLowerCase().includes("nueva convers");

        return [
          {
            id: conversationId,
            title: shouldReuseTitle
              ? existing!.title
              : content.slice(0, 48) || "Nueva conversacion",
            updatedAt: new Date().toISOString(),
            lastMessagePreview: content,
            lastMessageCreatedAt: new Date().toISOString(),
            hasPendingActions: existing?.hasPendingActions ?? false,
          },
          ...next,
        ];
      });

      const result = await fetchJson<{
        userMessage: AssistantMessageItem;
        assistantMessage: AssistantMessageItem;
      }>(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: content }),
      });

      setMessages((current) =>
        current.flatMap((message) => {
          if (message.id === optimisticUserMessage.id) return [result.userMessage];
          if (message.id === optimisticAssistantMessage.id) {
            return [result.assistantMessage];
          }
          return [message];
        })
      );

      setConversations((current) => {
        const next = current.filter((item) => item.id !== conversationId);
        const existing = current.find((item) => item.id === conversationId);
        const shouldReuseTitle =
          !!existing?.title &&
          !existing.title.toLowerCase().includes("nueva convers");

        return [
          {
            id: conversationId,
            title: shouldReuseTitle
              ? existing!.title
              : content.slice(0, 48) || "Nueva conversacion",
            updatedAt: result.assistantMessage.createdAt,
            lastMessagePreview: result.assistantMessage.content,
            lastMessageCreatedAt: result.assistantMessage.createdAt,
            hasPendingActions:
              result.assistantMessage.meta?.pendingAction?.status === "PENDING" ||
              false,
          },
          ...next,
        ];
      });
    } catch (err) {
      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !== optimisticUserMessage.id &&
            message.id !== optimisticAssistantMessage.id
        )
      );
      setInput(content);
      setError(err instanceof Error ? err.message : "No pude enviar el mensaje.");
    } finally {
      setSending(false);
      focusComposer();
    }
  }

  async function handlePendingAction(actionId: string, mode: "confirm" | "cancel") {
    try {
      setActionLoadingId(actionId);
      setError(null);

      const result = await fetchJson<{
        action: AssistantPendingActionSummary;
        assistantMessage: AssistantMessageItem;
      }>(`/api/chat/actions/${actionId}/${mode}`, { method: "POST" });

      setMessages((current) => [
        ...updatePendingActionStatus(current, actionId, result.action.status),
        result.assistantMessage,
      ]);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                hasPendingActions: result.action.status === "PENDING",
                lastMessagePreview: result.assistantMessage.content,
                lastMessageCreatedAt: result.assistantMessage.createdAt,
                updatedAt: result.assistantMessage.createdAt,
              }
            : conversation
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pude procesar la accion pendiente."
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  const showMobileList = !isDesktop && !activeConversationId;

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            <Bot className="h-3.5 w-3.5" />
            Conectado a {businessName}
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground">
            Asistente
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Gestiona todas tus conversaciones con el asistente y continua cada hilo
            con el contexto del negocio siempre disponible.
          </p>
        </div>
        <Button
          type="button"
          title="Crear una nueva conversacion"
          onClick={() => void createConversation({ focusComposer: true })}
          className="h-11 cursor-pointer rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nueva conversacion
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[32px] border border-border bg-background shadow-2xl">
        <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)]">
          <aside
            className={cn(
              "min-h-0 border-r border-border bg-surface-subtle/70",
              showMobileList ? "flex" : "hidden md:flex",
              "flex-col"
            )}
          >
            <div className="border-b border-border bg-background/90 px-5 py-5 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black tracking-tight text-foreground">
                    Conversaciones
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Todo tu historial con el asistente
                  </p>
                </div>
                <Button
                  type="button"
                  title="Crear una nueva conversacion"
                  variant="outline"
                  size="icon-sm"
                  className="cursor-pointer rounded-full border-border"
                  onClick={() => void createConversation({ focusComposer: true })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-border bg-surface-subtle px-4 py-3 shadow-sm transition-all duration-200 focus-within:border-border focus-within:bg-background focus-within:shadow-md">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar conversacion"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="mt-4 inline-flex w-full rounded-[20px] border border-border bg-surface-subtle p-1 shadow-sm">
                <button
                  type="button"
                  title="Ver conversaciones activas"
                  onClick={() => setViewMode("ACTIVE")}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[16px] px-3 py-2 text-xs font-semibold transition-all duration-200",
                    viewMode === "ACTIVE"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageCircleMore className="h-3.5 w-3.5" />
                  Activas
                </button>
                <button
                  type="button"
                  title="Ver conversaciones archivadas restaurables"
                  onClick={() => setViewMode("ARCHIVED")}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[16px] px-3 py-2 text-xs font-semibold transition-all duration-200",
                    viewMode === "ARCHIVED"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archivadas
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {initialLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="animate-pulse rounded-[24px] border border-border bg-background p-4"
                    >
                      <div className="h-4 w-2/3 rounded-full bg-surface-subtle" />
                      <div className="mt-3 h-3 w-full rounded-full bg-surface-subtle" />
                      <div className="mt-2 h-3 w-1/2 rounded-full bg-surface-subtle" />
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-[26px] border border-dashed border-border bg-background px-5 text-center">
                  <MessageCircleMore className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-4 text-sm font-semibold text-foreground">
                    {search.trim()
                      ? "No encontre conversaciones con esa busqueda."
                      : viewMode === "ACTIVE"
                      ? "Todavia no tenes conversaciones activas. Las que archives dejaran de verse aca."
                      : "No tenes conversaciones archivadas restaurables en los ultimos 30 dias."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => {
                    const isActive = conversation.id === activeConversationId;
                    const isArchiving = archiveLoadingId === conversation.id;
                    const isRestoring = restoreLoadingId === conversation.id;
                    const daysLeft = getDaysUntil(conversation.restorableUntil);

                    return (
                      <div
                        key={conversation.id}
                        className={cn(
                          "group relative rounded-[24px] transition-all duration-200",
                          isActive
                            ? "shadow-[0_14px_34px_-24px_hsl(var(--primary)/0.7)]"
                            : ""
                        )}
                      >
                        <button
                          type="button"
                          title={`Abrir conversacion: ${conversation.title}`}
                          onClick={() => void loadConversation(conversation.id)}
                          className={cn(
                            "w-full cursor-pointer rounded-[24px] border px-4 py-4 pr-14 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            isActive
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:-translate-y-0.5 hover:border-border hover:bg-surface-subtle hover:shadow-md"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="line-clamp-1 text-sm font-semibold">
                              {conversation.title}
                            </p>
                            {conversation.hasPendingActions && (
                              <span
                                className={cn(
                                  "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
                                  isActive ? "bg-warning/80" : "bg-warning"
                                )}
                              />
                            )}
                          </div>
                          <p
                            className={cn(
                              "mt-2 line-clamp-2 text-sm leading-6",
                              isActive ? "text-muted-foreground" : "text-muted-foreground"
                            )}
                          >
                            {conversation.lastMessagePreview || "Sin mensajes todavia."}
                          </p>
                          <div
                            className={cn(
                              "mt-3 flex items-center justify-between text-[11px] font-medium",
                              isActive ? "text-muted-foreground" : "text-muted-foreground"
                            )}
                          >
                            <span>
                              {formatDistanceToNow(
                                new Date(
                                  conversation.lastMessageCreatedAt ?? conversation.updatedAt
                                ),
                                { addSuffix: true, locale: es }
                              )}
                            </span>
                            {viewMode === "ARCHIVED" ? (
                              <span className="inline-flex items-center gap-1">
                                <Inbox className="h-3 w-3" />
                                {daysLeft === 1
                                  ? "1 día para restaurar"
                                  : `${daysLeft ?? 0} días para restaurar`}
                              </span>
                            ) : (
                              conversation.hasPendingActions && (
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3 w-3" />
                                Pendiente
                              </span>
                              )
                            )}
                          </div>
                        </button>
                        <div className="absolute right-3 top-3 z-10 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                          <ConfirmDialog
                            title={
                              viewMode === "ARCHIVED"
                                ? "¿Restaurar conversación?"
                                : "¿Archivar conversación?"
                            }
                            description={
                              viewMode === "ARCHIVED"
                                ? `"${conversation.title}" volverá a tu historial activo y vas a poder seguir escribiendo en ese hilo.`
                                : `"${conversation.title}" va a salir de tu historial activo y se conservará como baja lógica durante 30 días para que puedas restaurarla.`
                            }
                            confirmLabel={viewMode === "ARCHIVED" ? "Restaurar" : "Archivar"}
                            variant={viewMode === "ARCHIVED" ? "default" : "destructive"}
                            trigger={
                              <Button
                                type="button"
                                size="icon-sm"
                                variant={isActive ? "secondary" : "ghost"}
                                title={
                                  viewMode === "ARCHIVED"
                                    ? `Restaurar conversacion: ${conversation.title}`
                                    : `Archivar conversacion: ${conversation.title}`
                                }
                                disabled={isArchiving || isRestoring}
                                onClick={(event) => event.stopPropagation()}
                                className={cn(
                                  "cursor-pointer rounded-full shadow-sm transition-all duration-200",
                                  isActive
                                    ? "bg-background/15 text-primary-foreground hover:bg-background/25"
                                    : viewMode === "ARCHIVED"
                                    ? "border border-border bg-background/95 text-muted-foreground hover:bg-background hover:text-foreground"
                                    : "border border-border bg-background/95 text-muted-foreground hover:bg-background hover:text-destructive"
                                )}
                              >
                                {isArchiving || isRestoring ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    {viewMode === "ARCHIVED" ? (
                                      <RotateCcw className="h-4 w-4" />
                                    ) : (
                                      <Archive className="h-4 w-4" />
                                    )}
                                  </>
                                )}
                              </Button>
                            }
                            onConfirm={async () => {
                              if (viewMode === "ARCHIVED") {
                                await restoreConversation(conversation);
                                return;
                              }

                              await archiveConversation(conversation);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section
            className={cn(
              "min-h-0 overflow-hidden bg-surface-subtle/40",
              showMobileList ? "hidden md:flex" : "flex"
            )}
          >
            <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
              <div className="border-b border-border bg-background/90 px-5 py-5 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {!isDesktop && activeConversationId && (
                      <Button
                        type="button"
                        title="Volver al listado de conversaciones"
                        variant="outline"
                        size="icon-sm"
                        className="cursor-pointer rounded-full border-border"
                        onClick={() => setActiveConversationId(null)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary text-primary-foreground shadow-sm">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black tracking-tight text-foreground">
                        {activeConversation?.title ?? "Selecciona una conversacion"}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activeConversation
                          ? activeConversation.isDeleted
                            ? `Conversación archivada de ${businessName}`
                            : `Trabajando sobre ${businessName}`
                          : "Elige una conversacion o crea una nueva para empezar"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeConversation?.isDeleted && (
                      <Badge className="bg-surface-subtle text-muted-foreground hover:bg-surface-subtle">
                        Archivada
                      </Badge>
                    )}
                    {activeConversation?.hasPendingActions && (
                      <Badge className="bg-warning/15 text-warning hover:bg-warning/15">
                        Accion pendiente
                      </Badge>
                    )}
                    {activeConversation?.isDeleted && activeConversation.canRestore && (
                      <ConfirmDialog
                        title="¿Restaurar conversación?"
                        description={`"${activeConversation.title}" volverá a tu historial activo y vas a poder retomar el chat normalmente.`}
                        confirmLabel="Restaurar"
                        variant="default"
                        trigger={
                          <Button
                            type="button"
                            size="sm"
                            title={`Restaurar conversacion: ${activeConversation.title}`}
                            className="cursor-pointer rounded-full"
                            disabled={restoreLoadingId === activeConversation.id}
                          >
                            {restoreLoadingId === activeConversation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            Restaurar
                          </Button>
                        }
                        onConfirm={async () => {
                          await restoreConversation(activeConversation);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {!activeConversationId ? (
                <div className="min-h-0 overflow-y-auto px-4 py-8">
                  <div className="flex min-h-full items-center justify-center">
                  <Card className="w-full max-w-2xl gap-5 rounded-[32px] border-border bg-background/95 py-6 shadow-sm">
                    <CardHeader className="gap-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-primary text-primary-foreground shadow-sm">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-black tracking-tight text-foreground">
                            {viewMode === "ARCHIVED"
                              ? "Explora tus conversaciones archivadas"
                              : "Empeza una nueva conversacion"}
                          </CardTitle>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {viewMode === "ARCHIVED"
                              ? "Las conversaciones archivadas se conservan por 30 dias para que puedas revisarlas o restaurarlas."
                              : "Usa el asistente para consultar stock, ventas y gastos sin perder el contexto del negocio."}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    {viewMode === "ARCHIVED" ? (
                      <CardContent className="px-6">
                        <div className="rounded-[24px] border border-dashed border-border bg-surface-subtle px-5 py-5 text-sm leading-6 text-muted-foreground">
                          Cuando archives una conversación, va a aparecer en esta vista con su historial intacto. Desde acá la vas a poder restaurar dentro de la ventana de 30 días.
                        </div>
                      </CardContent>
                    ) : (
                      <CardContent className="grid gap-3 px-6 md:grid-cols-2">
                        {starterPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            title={`Enviar sugerencia: ${prompt}`}
                            onClick={() => void sendMessage(prompt)}
                            className="cursor-pointer rounded-[22px] border border-border bg-surface-subtle px-4 py-4 text-left text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-background hover:shadow-md"
                          >
                            {prompt}
                          </button>
                        ))}
                      </CardContent>
                    )}
                  </Card>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    ref={listRef}
                    className="min-h-0 space-y-4 overflow-y-auto px-4 py-5 md:px-6"
                  >
                    {messagesLoading ? (
                      <div className="space-y-4">
                        <div className="h-24 w-4/5 animate-pulse rounded-[24px] bg-background shadow-sm" />
                        <div className="ml-auto h-24 w-3/5 animate-pulse rounded-[24px] bg-primary/90" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Esta conversacion todavia no tiene mensajes.
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.role === "USER" ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[92%] rounded-[26px] px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md md:max-w-[78%]",
                              message.role === "USER"
                                ? "bg-primary text-primary-foreground"
                                : message.meta?.kind === "info"
                                ? "border border-border bg-surface-subtle text-muted-foreground"
                                : "border border-border bg-background text-foreground"
                            )}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-6">
                              {message.content}
                            </p>
                            {message.meta?.interpretedProduct && (
                              <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                                Interpretado como: {message.meta.interpretedProduct.resolvedName}
                                {" · "}
                                Confianza {message.meta.interpretedProduct.confidence}
                              </div>
                            )}
                            {message.meta?.interpretedEntities &&
                              message.meta.interpretedEntities.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {message.meta.interpretedEntities.map((entity) => (
                                    <div
                                      key={`${entity.type}-${entity.input}`}
                                      className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary"
                                    >
                                      Interpretado {entity.type === "payment_method" ? "medio de pago" : entity.type}
                                      {": "}
                                      {entity.input}
                                      {" -> "}
                                      {entity.resolved.join(", ")}
                                      {" · "}
                                      Confianza {entity.confidence}
                                    </div>
                                  ))}
                                </div>
                              )}
                            <div
                              className={cn(
                                "mt-2 flex items-center justify-between gap-3 text-[11px]",
                                message.role === "USER" ? "text-muted-foreground" : "text-muted-foreground"
                              )}
                            >
                              <span>{formatTime(message.createdAt)}</span>
                              {message.meta?.kind === "error" && (
                                <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                                  <TriangleAlert className="h-3 w-3" />
                                  Error
                                </span>
                              )}
                            </div>

                            {message.meta?.pendingAction && (
                              <div className="mt-4 rounded-[20px] border border-border bg-surface-subtle p-3 text-foreground shadow-sm">
                                {(() => {
                                  const pendingActionUi = getPendingActionPresentation(
                                    message.meta.pendingAction.status
                                  );

                                  return (
                                    <>
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <Clock3 className="h-4 w-4 text-warning" />
                                          <p className="text-sm font-bold">
                                            {pendingActionUi.title}
                                          </p>
                                        </div>
                                        <Badge className={pendingActionUi.badgeClassName}>
                                          {pendingActionUi.badge}
                                        </Badge>
                                      </div>
                                      <p className="mt-2 text-sm leading-6 text-foreground">
                                        {message.meta.pendingAction.previewText}
                                      </p>
                                      {message.meta.pendingAction.status === "PENDING" && (
                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                          <Button
                                            type="button"
                                            title="Confirmar y ejecutar esta accion"
                                            className="flex-1 cursor-pointer rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                                            onClick={() =>
                                              void handlePendingAction(
                                                message.meta!.pendingAction!.id,
                                                "confirm"
                                              )
                                            }
                                            disabled={
                                              actionLoadingId ===
                                              message.meta.pendingAction.id
                                            }
                                          >
                                            {actionLoadingId ===
                                            message.meta.pendingAction.id ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <CheckCheck className="h-4 w-4" />
                                            )}
                                            Confirmar
                                          </Button>
                                          <Button
                                            type="button"
                                            title="Cancelar esta accion pendiente"
                                            variant="outline"
                                            className="flex-1 cursor-pointer rounded-full border-border"
                                            onClick={() =>
                                              void handlePendingAction(
                                                message.meta!.pendingAction!.id,
                                                "cancel"
                                              )
                                            }
                                            disabled={
                                              actionLoadingId ===
                                              message.meta.pendingAction.id
                                            }
                                          >
                                            Cancelar
                                          </Button>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="shrink-0 border-t border-border bg-background px-4 py-4 md:px-6">
                    {error && (
                      <div className="mb-3 rounded-[22px] border border-danger-soft-foreground/20 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
                        {error}
                      </div>
                    )}
                    {isArchivedConversation && (
                      <div className="mb-3 flex items-center justify-between gap-3 rounded-[22px] border border-border bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
                        <p>
                          Esta conversación está archivada. Restaurala para volver a escribir en este hilo.
                        </p>
                        {activeConversation?.canRestore && (
                          <ConfirmDialog
                            title="¿Restaurar conversación?"
                            description={`"${activeConversation.title}" volverá a tu historial activo y vas a poder seguir escribiendo.`}
                            confirmLabel="Restaurar"
                            variant="default"
                            trigger={
                              <Button
                                type="button"
                                size="sm"
                                title={`Restaurar conversacion: ${activeConversation.title}`}
                                className="cursor-pointer rounded-full"
                                disabled={restoreLoadingId === activeConversation.id}
                              >
                                {restoreLoadingId === activeConversation.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                                Restaurar
                              </Button>
                            }
                            onConfirm={async () => {
                              await restoreConversation(activeConversation);
                            }}
                          />
                        )}
                      </div>
                    )}
                    <div className="rounded-[28px] border border-border bg-surface-subtle p-2 shadow-sm transition-all duration-200 focus-within:border-border focus-within:bg-background focus-within:shadow-md">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void sendMessage();
                          }
                        }}
                        rows={1}
                        disabled={sending || isArchivedConversation}
                        placeholder={
                          isArchivedConversation
                            ? "Restaurá esta conversación para continuar"
                            : "Escribi tu mensaje para el asistente"
                        }
                        className="max-h-[180px] min-h-[88px] w-full resize-none bg-transparent px-3 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-70"
                      />
                      <div className="flex items-center justify-between gap-3 px-2 pb-2">
                        <p className="text-xs text-muted-foreground">
                          {isArchivedConversation
                            ? "Podés leer el historial completo, pero no enviar mensajes hasta restaurarla."
                            : "Solo responde sobre el negocio actual."}
                        </p>
                        <Button
                          type="button"
                          title={sending ? "Enviando mensaje" : "Enviar mensaje"}
                          onClick={() => void sendMessage()}
                          disabled={sending || !input.trim() || isArchivedConversation}
                          className="cursor-pointer rounded-full bg-primary px-4 text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted-foreground/40"
                        >
                          {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SendHorizonal className="h-4 w-4" />
                          )}
                          {sending ? "Enviando..." : "Enviar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

