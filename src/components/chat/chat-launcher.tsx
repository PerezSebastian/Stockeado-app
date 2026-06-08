"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type {
  AssistantBootstrapPayload,
  AssistantConversationItem,
  AssistantMessageItem,
  AssistantPendingActionSummary,
} from "@/types/assistant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Bot,
  CheckCheck,
  ChevronLeft,
  ChevronsLeftRight,
  Clock3,
  GripVertical,
  History,
  Loader2,
  Plus,
  SendHorizonal,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";

type ApiError = { error?: string };
const CHAT_MIN_WIDTH = 380;
const CHAT_MAX_WIDTH = 760;
const CHAT_DEFAULT_WIDTH = 420;
const CHAT_WIDTH_STORAGE_KEY = "assistant-chat-panel-width";
const CHAT_PANEL_ANIMATION_MS = 280;

function Tooltip({
  label,
  children,
  side = "top",
}: {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
}) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      left: rect.left + rect.width / 2,
      top: side === "top" ? rect.top - 8 : rect.bottom + 8,
    });
  }, [side]);

  useEffect(() => {
    if (!visible) return;

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [visible, updatePosition]);

  return (
    <div
      ref={triggerRef}
      className="group/tooltip relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              className={cn(
                "pointer-events-none fixed left-0 top-0 z-[120] rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold text-primary-foreground opacity-100 shadow-lg transition-all duration-150"
              )}
              style={{
                left: coords.left,
                top: coords.top,
                transform:
                  side === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
              }}
            >
              <span className="whitespace-nowrap">{label}</span>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

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
    throw new Error(data.error || "Ocurrió un error inesperado.");
  }

  return data;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [shouldRenderPanel, setShouldRenderPanel] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bootstrap, setBootstrap] = useState<AssistantBootstrapPayload | null>(null);
  const [conversations, setConversations] = useState<AssistantConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [bootLoading, setBootLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(CHAT_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showResizeFeedback, setShowResizeFeedback] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const resizeFeedbackTimeoutRef = useRef<number | null>(null);
  const closePanelTimeoutRef = useRef<number | null>(null);
  const optimisticMessageIdRef = useRef(0);
  const resizeStateRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);

  const starterPrompts = bootstrap?.starterPrompts ?? [];
  const businessName = bootstrap?.businessName ?? "tu negocio";
  const hasPendingActions = useMemo(
    () =>
      messages.some(
        (message) => message.meta?.pendingAction?.status === "PENDING"
      ),
    [messages]
  );
  const chatActive = open || shouldRenderPanel;
  const scrollToLatest = useCallback((behavior: ScrollBehavior = "auto") => {
    if (!listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior,
    });
  }, []);

  useEffect(() => {
    if (closePanelTimeoutRef.current) {
      window.clearTimeout(closePanelTimeoutRef.current);
      closePanelTimeoutRef.current = null;
    }

    if (open) {
      setShouldRenderPanel(true);
      const frame = window.requestAnimationFrame(() => setPanelVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setPanelVisible(false);
    closePanelTimeoutRef.current = window.setTimeout(() => {
      setShouldRenderPanel(false);
      closePanelTimeoutRef.current = null;
    }, CHAT_PANEL_ANIMATION_MS);

    return () => {
      if (closePanelTimeoutRef.current) {
        window.clearTimeout(closePanelTimeoutRef.current);
        closePanelTimeoutRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closePanelTimeoutRef.current) {
        window.clearTimeout(closePanelTimeoutRef.current);
      }
    };
  }, []);

  const loadBootstrap = useCallback(async () => {
    try {
      setBootLoading(true);
      const data = await fetchJson<AssistantBootstrapPayload>("/api/chat/bootstrap");
      setBootstrap(data);
      setConversations(data.conversations);

      if (data.latestConversationId) {
        setActiveConversationId(data.latestConversationId);
        await loadConversation(data.latestConversationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude cargar el chat.");
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (!open || !panelVisible || messagesLoading) return;

    const frame = window.requestAnimationFrame(() => {
      scrollToLatest("auto");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, open, panelVisible, messagesLoading, scrollToLatest]);

  useEffect(() => {
    function syncViewport() {
      setIsDesktop(window.innerWidth >= 768);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    const storedWidth = window.localStorage.getItem(CHAT_WIDTH_STORAGE_KEY);
    if (!storedWidth) return;

    const parsedWidth = Number(storedWidth);
    if (Number.isNaN(parsedWidth)) return;

    setPanelWidth(Math.min(CHAT_MAX_WIDTH, Math.max(CHAT_MIN_WIDTH, parsedWidth)));
  }, [isDesktop]);

  useEffect(() => {
    if (!isResizing) return;

    function handlePointerMove(event: PointerEvent) {
      if (!resizeStateRef.current) return;

      const delta = resizeStateRef.current.startX - event.clientX;
      const nextWidth = resizeStateRef.current.startWidth + delta;
      const boundedWidth = Math.min(CHAT_MAX_WIDTH, Math.max(CHAT_MIN_WIDTH, nextWidth));
      setPanelWidth(boundedWidth);
      window.localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, String(boundedWidth));
      setShowResizeFeedback(true);
    }

    function handlePointerUp() {
      setIsResizing(false);
      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (resizeFeedbackTimeoutRef.current) {
        window.clearTimeout(resizeFeedbackTimeoutRef.current);
      }
      resizeFeedbackTimeoutRef.current = window.setTimeout(() => {
        setShowResizeFeedback(false);
      }, 900);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizing]);

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!isDesktop) return;

    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: panelWidth,
    };
    setIsResizing(true);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }

  function resetPanelWidth() {
    setPanelWidth(CHAT_DEFAULT_WIDTH);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, String(CHAT_DEFAULT_WIDTH));
    }
    setShowResizeFeedback(true);
    if (resizeFeedbackTimeoutRef.current) {
      window.clearTimeout(resizeFeedbackTimeoutRef.current);
    }
    resizeFeedbackTimeoutRef.current = window.setTimeout(() => {
      setShowResizeFeedback(false);
    }, 900);
  }

  async function loadConversation(conversationId: string) {
    try {
      setMessagesLoading(true);
      const data = await fetchJson<{
        conversation: AssistantConversationItem;
        messages: AssistantMessageItem[];
      }>(`/api/chat/conversations/${conversationId}/messages`);
      setActiveConversationId(data.conversation.id);
      setMessages(data.messages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude cargar la conversación.");
    } finally {
      setMessagesLoading(false);
    }
  }

  function selectConversation(conversationId: string) {
    setHistoryOpen(false);
    void loadConversation(conversationId);
  }

  async function createConversation() {
    const data = await fetchJson<{ conversation: AssistantConversationItem }>(
      "/api/chat/conversations",
      { method: "POST" }
    );

    setConversations((current) => [data.conversation, ...current]);
    setActiveConversationId(data.conversation.id);
    setMessages([]);
    setHistoryOpen(false);
    return data.conversation.id;
  }

  async function sendMessage(prefilled?: string) {
    const content = (prefilled ?? input).trim();
    if (!content || sending) return;

    const optimisticId = optimisticMessageIdRef.current + 1;
    optimisticMessageIdRef.current = optimisticId;
    const optimisticUserMessage = buildOptimisticMessage(
      `optimistic-user-${optimisticId}`,
      "USER",
      content
    );
    const optimisticAssistantMessage = buildOptimisticMessage(
      `optimistic-assistant-${optimisticId}`,
      "ASSISTANT",
      "Enviando...",
      { kind: "info" }
    );

    setSending(true);
    setError(null);
    setInput("");
    setOpen(true);
    setMessages((current) => [
      ...current,
      optimisticUserMessage,
      optimisticAssistantMessage,
    ]);

    try {
      const conversationId = activeConversationId ?? (await createConversation());
      const result = await fetchJson<{
        userMessage: AssistantMessageItem;
        assistantMessage: AssistantMessageItem;
      }>(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: content }),
      });

      setMessages((current) =>
        current.flatMap((message) => {
          if (message.id === optimisticUserMessage.id) {
            return [result.userMessage];
          }

          if (message.id === optimisticAssistantMessage.id) {
            return [result.assistantMessage];
          }

          return [message];
        })
      );
      setConversations((current) => {
        const title = content.slice(0, 48) || "Nueva conversación";
        const next = current.filter((item) => item.id !== conversationId);
        return [
          {
            id: conversationId,
            title,
            updatedAt: new Date().toISOString(),
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
    }
  }

  async function handlePendingAction(
    actionId: string,
    mode: "confirm" | "cancel"
  ) {
    try {
      setActionLoadingId(actionId);
      setError(null);

      const result = await fetchJson<{
        action: AssistantPendingActionSummary;
        assistantMessage: AssistantMessageItem;
      }>(`/api/chat/actions/${actionId}/${mode}`, {
        method: "POST",
      });

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
        err instanceof Error ? err.message : "No pude procesar la acción pendiente."
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <>
      <div className="fixed right-4 top-3 z-40 flex items-center gap-3 md:bottom-6 md:right-6 md:top-auto">
        {chatActive && (
          <div
            className="hidden rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-lg backdrop-blur md:block"
            style={{
              opacity: panelVisible ? 1 : 0,
              transform: panelVisible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.96)",
              transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            Conectado a {businessName}
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={chatActive ? "Cerrar asistente" : "Abrir asistente"}
          aria-expanded={open}
          className={cn(
            "group relative flex cursor-pointer items-center justify-center gap-2 md:gap-3 border border-border bg-background/95 text-foreground backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            chatActive 
              ? "h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl px-0" 
              : "h-10 w-auto md:h-14 md:w-[178px] justify-start rounded-xl md:rounded-[24px] pl-2 pr-3 md:px-3"
          )}
          style={{
            boxShadow: chatActive
              ? "0 22px 60px rgba(15, 23, 42, 0.18)"
              : "0 14px 34px rgba(15, 23, 42, 0.14)",
            transform: chatActive ? "translateY(-1px) scale(0.995)" : "translateY(0) scale(1)",
            transition:
              "width 280ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 280ms cubic-bezier(0.22, 1, 0.36, 1), padding 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <Tooltip label={chatActive ? "Cerrar asistente" : "Abrir asistente"}>
            <div
              className={cn(
                "relative flex shrink-0 items-center justify-center overflow-hidden",
                chatActive
                  ? "h-full w-full md:h-9 md:w-9 rounded-xl bg-transparent text-foreground md:bg-primary md:text-primary-foreground"
                  : "h-8 w-8 md:h-10 md:w-10 rounded-[10px] md:rounded-2xl bg-transparent text-foreground md:bg-primary md:text-primary-foreground md:shadow-sm"
              )}
              style={{
                transition:
                  "width 260ms cubic-bezier(0.22, 1, 0.36, 1), height 260ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 260ms cubic-bezier(0.22, 1, 0.36, 1), transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
                transform: chatActive ? "scale(0.96)" : "scale(1)",
              }}
            >
              {chatActive ? <X className="h-5 w-5 md:h-4 md:w-4" /> : <Bot className="h-5 w-5 md:h-4.5 md:w-4.5" />}
              {hasPendingActions && !chatActive && (
                <>
                  <span className="absolute inset-0 rounded-2xl bg-primary/25 animate-ping" />
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-warning" />
                </>
              )}
            </div>
          </Tooltip>
          {!chatActive && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-bold md:font-semibold leading-none text-foreground">Asistente</p>
                <p className="hidden md:block mt-1 truncate text-[11px] font-medium text-muted-foreground">
                  Consultas rapidas sobre tu negocio
                </p>
              </div>
              <div className="flex h-6 w-6 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-muted-foreground transition-colors duration-200 group-hover:text-primary">
                <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5" />
              </div>
            </>
          )}
        </button>
      </div>

      {shouldRenderPanel && (
        <div
          className={cn(
            "fixed inset-0 z-30 transition-opacity duration-300 md:bg-transparent md:backdrop-blur-0 md:pointer-events-none",
            panelVisible ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          style={{
            backgroundColor: isDesktop ? "transparent" : "rgb(15 23 42 / 0.2)",
            backdropFilter: isDesktop ? "none" : "blur(2px)",
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
            className="group pointer-events-auto fixed inset-x-0 bottom-0 top-20 z-40 flex flex-col overflow-visible rounded-t-[28px] border border-border bg-background shadow-2xl md:bottom-24 md:left-auto md:right-6 md:top-auto md:rounded-[28px]"
            style={{
              width: isDesktop ? panelWidth : undefined,
              height: isDesktop ? "min(78vh, 760px)" : undefined,
              opacity: panelVisible ? 1 : 0,
              transform: panelVisible
                ? "translateY(0) scale(1)"
                : isDesktop
                ? "translateY(14px) scale(0.985)"
                : "translateY(22px) scale(0.99)",
              transformOrigin: isDesktop ? "bottom right" : "bottom center",
              transition:
                "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 280ms cubic-bezier(0.22, 1, 0.36, 1)",
              boxShadow: panelVisible
                ? "0 28px 90px rgba(15, 23, 42, 0.28)"
                : "0 10px 32px rgba(15, 23, 42, 0.16)",
              willChange: "transform, opacity",
            }}
          >
            <button
              type="button"
              aria-label="Redimensionar chat"
              onPointerDown={startResize}
              onDoubleClick={resetPanelWidth}
              className={cn(
                "absolute left-0 top-0 hidden h-full w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center md:flex",
                isResizing ? "opacity-100" : "opacity-0 transition-opacity group-hover:opacity-100"
              )}
            >
              <Tooltip label="Arrastrar para cambiar el ancho. Doble click para restaurar.">
                <span className="flex h-14 w-2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm">
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
              </Tooltip>
            </button>
            {isDesktop && showResizeFeedback && (
              <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-border bg-background/95 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                <span className="inline-flex items-center gap-1.5">
                  <ChevronsLeftRight className="h-3.5 w-3.5" />
                  {panelWidth}px
                </span>
              </div>
            )}
            <div className="relative z-20 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black tracking-tight text-foreground">
                        Asistente
                      </h2>
                      <Badge className="bg-success/15 text-success hover:bg-success/15">
                        En línea
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Trabajando sobre {businessName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip
                    label={historyOpen ? "Ocultar historial de conversaciones" : "Mostrar historial de conversaciones"}
                    side="bottom"
                  >
                    <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="cursor-pointer rounded-full border-border"
                    onClick={() => setHistoryOpen((current) => !current)}
                  >
                    {historyOpen ? <ChevronLeft className="h-4 w-4" /> : <History className="h-4 w-4" />}
                    </Button>
                  </Tooltip>
                  <Tooltip label="Crear una conversación nueva" side="bottom">
                  <Button
                    type="button"
                    title="Crear una conversación nueva"
                    variant="outline"
                    size="icon-sm"
                    className="cursor-pointer rounded-full border-border"
                    onClick={async () => {
                      const id = await createConversation();
                      setActiveConversationId(id);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr]">
              <div
                className={cn(
                  "relative z-10 overflow-hidden border-b border-border bg-surface-subtle/70 transition-[max-height,opacity,padding] duration-200 ease-out",
                  historyOpen ? "max-h-[340px] px-3 py-3 opacity-100" : "max-h-0 px-3 py-0 opacity-0"
                )}
                aria-hidden={!historyOpen}
              >
                <div
                  className={cn(
                    "transition-transform duration-200 ease-out",
                    historyOpen ? "translate-y-0" : "-translate-y-2"
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Historial
                    </p>
                    <Tooltip label="Crear una conversación nueva">
                    <Button
                      type="button"
                      title="Crear una conversación nueva"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      onClick={async () => {
                        const id = await createConversation();
                        setActiveConversationId(id);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Nueva
                    </Button>
                    </Tooltip>
                  </div>
                  <div className="space-y-2">
                    {conversations.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-border bg-background px-3 py-4 text-sm text-muted-foreground">
                        Todavía no tenés conversaciones guardadas.
                      </p>
                    )}
                    {conversations.map((conversation) => (
                      <Tooltip key={conversation.id} label={`Abrir conversación: ${conversation.title}`}>
                      <button
                        key={conversation.id}
                        type="button"
                        title={`Abrir conversación: ${conversation.title}`}
                        onClick={() => selectConversation(conversation.id)}
                        className={cn(
                          "w-full cursor-pointer rounded-2xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          activeConversationId === conversation.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-border hover:bg-surface-subtle"
                        )}
                      >
                        <p className="line-clamp-1 text-sm font-semibold">{conversation.title}</p>
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            activeConversationId === conversation.id
                              ? "text-muted-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {new Date(conversation.updatedAt).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </p>
                      </button>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div
                  ref={listRef}
                  className="relative z-0 flex-1 space-y-4 overflow-y-auto bg-surface-subtle/40 px-4 py-4"
                >
                  {(bootLoading || messagesLoading) && (
                    <div className="flex h-full items-center justify-center">
                      <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando conversación...
              </div>
            </div>
                  )}

                  {!bootLoading && !messagesLoading && messages.length === 0 && (
                    <div className="space-y-4">
                      <Card className="gap-4 rounded-[24px] border-border bg-background/95 py-5 shadow-sm">
                        <CardHeader className="gap-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                              <Sparkles className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-black tracking-tight text-foreground">
                                Preguntame por tu negocio
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                Puedo ayudarte con stock, ventas y gastos del negocio actual.
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-5">
                          <div className="grid gap-2">
                            {starterPrompts.map((prompt) => (
                              <button
                                key={prompt}
                                type="button"
                                title={`Enviar sugerencia: ${prompt}`}
                                onClick={() => void sendMessage(prompt)}
                                className="cursor-pointer rounded-2xl border border-border bg-surface-subtle px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-background hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                style={{
                                  animation: "chatSurfaceIn 260ms ease-out both",
                                  animationDelay: `${80 + starterPrompts.indexOf(prompt) * 45}ms`,
                                }}
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === "USER" ? "justify-end" : "justify-start"
                      )}
                      style={{
                        animation: "chatMessageIn 240ms ease-out both",
                        animationDelay: `${Math.min(index * 28, 180)}ms`,
                      }}
                    >
                      <div
                        className={cn(
                          "max-w-[88%] rounded-[24px] px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md",
                          message.role === "USER"
                            ? "bg-primary text-primary-foreground"
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
                          <div
                            className="mt-4 rounded-[20px] border border-border bg-surface-subtle p-3 text-foreground shadow-sm"
                            style={{ animation: "chatCardIn 280ms ease-out both" }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Clock3 className="h-4 w-4 text-warning" />
                                <p className="text-sm font-bold">Acción pendiente</p>
                              </div>
                              <Badge
                                className={cn(
                                  message.meta.pendingAction.status === "PENDING"
                                    ? "bg-warning/15 text-warning"
                                    : message.meta.pendingAction.status === "EXECUTED"
                                    ? "bg-success/15 text-success"
                                    : "bg-surface-subtle text-muted-foreground"
                                )}
                              >
                                {message.meta.pendingAction.status}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-foreground">
                              {message.meta.pendingAction.previewText}
                            </p>
                            {message.meta.pendingAction.status === "PENDING" && (
                              <div className="mt-3 flex gap-2">
                                <Button
                                  type="button"
                                  title="Confirmar y ejecutar esta acción"
                                  className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                                  onClick={() =>
                                    void handlePendingAction(
                                      message.meta!.pendingAction!.id,
                                      "confirm"
                                    )
                                  }
                                  disabled={actionLoadingId === message.meta.pendingAction.id}
                                >
                                  {actionLoadingId === message.meta.pendingAction.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCheck className="h-4 w-4" />
                                  )}
                                  Confirmar
                                </Button>
                                <Button
                                  type="button"
                                  title="Cancelar esta acción pendiente"
                                  variant="outline"
                                  className="flex-1 rounded-full border-border"
                                  onClick={() =>
                                    void handlePendingAction(
                                      message.meta!.pendingAction!.id,
                                      "cancel"
                                    )
                                  }
                                  disabled={actionLoadingId === message.meta.pendingAction.id}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                </div>

                <div className="border-t border-border bg-background px-4 py-4">
                  {error && (
                    <div
                      className="mb-3 rounded-2xl border border-danger-soft-foreground/20 bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
                      style={{ animation: "chatCardIn 220ms ease-out both" }}
                    >
                      {error}
                    </div>
                  )}
                  <div className="rounded-[26px] border border-border bg-surface-subtle p-2 shadow-sm transition-all duration-200 focus-within:border-border focus-within:bg-background focus-within:shadow-md">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      rows={1}
                      disabled={sending}
                      placeholder="Ej: cuánto stock queda de medialunas"
                      className="min-h-[72px] w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-70"
                    />
                    <div className="flex items-center justify-between gap-3 px-2 pb-1">
                      <p className="text-xs text-muted-foreground">
                        Solo trabajo sobre el negocio actual.
                      </p>
                      <Button
                        type="button"
                        title={sending ? "Enviando mensaje" : "Enviar mensaje"}
                        onClick={() => void sendMessage()}
                        disabled={sending || !input.trim()}
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
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes chatMessageIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes chatCardIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes chatSurfaceIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

