import type { AssistantMessageMeta } from "@/types/assistant";
import type { QueryExecutionResult } from "@/lib/assistant/query-compiler";
import type { ExpenseReportInput, InventoryReportInput, SalesReportInput } from "@/lib/assistant/query-dsl";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function buildNotesMeta(result: QueryExecutionResult): Pick<AssistantMessageMeta, "interpretedEntities"> {
  return {
    interpretedEntities: result.notes.length > 0 ? result.notes : null,
  };
}

export function formatInventoryReport(
  input: InventoryReportInput,
  result: QueryExecutionResult
) {
  if (result.rows.length === 0) {
    return {
      text: "No encontré productos que cumplan con esos criterios.",
      meta: {
        kind: "stock",
        ...buildNotesMeta(result),
      } satisfies AssistantMessageMeta,
      result,
    };
  }

  const lines = result.rows.map((row) => {
    const parts = [String(row.label)];
    if ("current_stock" in row) parts.push(`${Number(row.current_stock)} uds.`);
    if ("product_count" in row && input.groupBy?.includes("category")) {
      parts.push(`${Number(row.product_count)} productos`);
    }
    if ("category" in row && input.groupBy?.includes("product")) {
      parts.push(String(row.category));
    }
    return `- ${parts.join(" | ")}`;
  });

  return {
    text: `Encontré este resumen de inventario:\n${lines.join("\n")}`,
    meta: {
      kind: "stock",
      ...buildNotesMeta(result),
    } satisfies AssistantMessageMeta,
    result,
  };
}

export function formatSalesReport(input: SalesReportInput, result: QueryExecutionResult) {
  const rangeLabel = result.range
    ? `${format(new Date(result.range.from!), "d MMM", { locale: es })} al ${format(
        new Date(result.range.to!),
        "d MMM",
        { locale: es }
      )}`
    : "el período indicado";

  if (result.rows.length === 0) {
    return {
      text: `No encontré ventas para ${rangeLabel} con esos criterios.`,
      meta: {
        kind: "sales",
        ...buildNotesMeta(result),
      } satisfies AssistantMessageMeta,
      result,
    };
  }

  const lines = result.rows.map((row) => {
    const parts = [String(row.label)];
    if ("quantity_sold" in row) parts.push(`${Number(row.quantity_sold)} uds.`);
    if ("ticket_count" in row) parts.push(`${Number(row.ticket_count)} tickets`);
    if ("revenue" in row) {
      parts.push(
        `$${Number(row.revenue).toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      );
    }
    return `- ${parts.join(" | ")}`;
  });

  return {
    text: `Resumen de ventas entre ${rangeLabel}:\n${lines.join("\n")}`,
    meta: {
      kind: "sales",
      ...buildNotesMeta(result),
    } satisfies AssistantMessageMeta,
    result,
  };
}

export function formatExpenseReport(
  input: ExpenseReportInput,
  result: QueryExecutionResult
) {
  if (result.rows.length === 0) {
    return {
      text: "No encontré gastos que cumplan con esos criterios.",
      meta: {
        kind: "expenses",
        ...buildNotesMeta(result),
      } satisfies AssistantMessageMeta,
      result,
    };
  }

  const lines = result.rows.map((row) => {
    const parts = [String(row.label)];
    if ("expense_count" in row) parts.push(`${Number(row.expense_count)} gastos`);
    if ("amount_total" in row) {
      parts.push(
        `$${Number(row.amount_total).toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      );
    }
    return `- ${parts.join(" | ")}`;
  });

  return {
    text: `Encontré este resumen de gastos:\n${lines.join("\n")}`,
    meta: {
      kind: "expenses",
      ...buildNotesMeta(result),
    } satisfies AssistantMessageMeta,
    result,
  };
}
