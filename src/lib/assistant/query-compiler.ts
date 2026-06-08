import { db } from "@/lib/db";
import type { AssistantActor } from "@/lib/assistant/service";
import type {
  ExpenseReportInput,
  InventoryReportInput,
  ResolvedEntityNote,
  SalesReportInput,
} from "@/lib/assistant/query-dsl";
import {
  resolveCategoryQueries,
  resolvePaymentMethodQueries,
  resolveProductQueries,
} from "@/lib/assistant/query-resolvers";
import { endOfDay, startOfDay } from "date-fns";

export interface QueryExecutionResult {
  rows: Array<Record<string, unknown>>;
  totals: Record<string, number>;
  notes: ResolvedEntityNote[];
  range?: {
    from?: string;
    to?: string;
  };
}

function sortRows(
  rows: Array<Record<string, unknown>>,
  sort:
    | { field: string; direction: "asc" | "desc" }
    | undefined
) {
  if (!sort) return rows;

  const direction = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue = left[sort.field];
    const rightValue = right[sort.field];

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * direction;
    }

    return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "es") * direction;
  });
}

export async function executeInventoryReportQuery(
  actor: AssistantActor,
  input: InventoryReportInput
): Promise<QueryExecutionResult> {
  const resolvedProducts = await resolveProductQueries(
    actor,
    input.filters?.productQueryAny
  );
  const resolvedCategories = await resolveCategoryQueries(
    actor,
    input.filters?.categoryQueryAny,
    "PRODUCT"
  );

  let products = await db.product.findMany({
    where: {
      businessId: actor.businessId,
      isDeleted: false,
    },
    include: {
      categoryRel: { select: { id: true, name: true } },
      catalog: { select: { isPublic: true } },
    },
  });

  if (resolvedProducts.ids.length > 0) {
    products = products.filter((product) => resolvedProducts.ids.includes(product.id));
  }

  if (resolvedCategories.ids.length > 0) {
    products = products.filter(
      (product) =>
        product.categoryId && resolvedCategories.ids.includes(product.categoryId)
    );
  }

  if (typeof input.filters?.isPublic === "boolean") {
    products = products.filter((product) => (product.catalog?.isPublic ?? false) === input.filters?.isPublic);
  }

  if (input.filters?.stockStatus) {
    products = products.filter((product) => {
      switch (input.filters?.stockStatus) {
        case "OUT_OF_STOCK":
          return product.stock <= 0;
        case "LOW_STOCK":
          return product.stock <= product.minStock;
        case "IN_STOCK":
          return product.stock > 0;
      }
    });
  }

  const rows =
    input.groupBy?.includes("category") && !input.groupBy?.includes("product")
      ? Object.values(
          products.reduce<Record<string, Record<string, unknown>>>((acc, product) => {
            const categoryName =
              product.categoryRel?.name || product.category || "Sin categoria";
            const current = acc[categoryName] ?? {
              label: categoryName,
              category: categoryName,
              current_stock: 0,
              product_count: 0,
            };

            current.current_stock = Number(current.current_stock) + product.stock;
            current.product_count = Number(current.product_count) + 1;
            acc[categoryName] = current;
            return acc;
          }, {})
        )
      : products.map((product) => ({
          label: product.name,
          product: product.name,
          category: product.categoryRel?.name || product.category || "Sin categoria",
          current_stock: product.stock,
          product_count: 1,
          is_public: product.catalog?.isPublic ?? false,
        }));

  const sortedRows = sortRows(
    rows,
    input.sort
      ? { field: input.sort.field === "name" ? "label" : input.sort.field, direction: input.sort.direction }
      : undefined
  ).slice(0, input.limit);

  return {
    rows: sortedRows,
    totals: {
      current_stock: products.reduce((sum, product) => sum + product.stock, 0),
      product_count: products.length,
    },
    notes: [...resolvedProducts.notes, ...resolvedCategories.notes],
  };
}

export async function executeSalesReportQuery(
  actor: AssistantActor,
  input: SalesReportInput
): Promise<QueryExecutionResult> {
  const resolvedProducts = await resolveProductQueries(
    actor,
    input.filters?.productQueryAny
  );
  const resolvedCategories = await resolveCategoryQueries(
    actor,
    input.filters?.categoryQueryAny,
    "PRODUCT"
  );
  const resolvedMethods = await resolvePaymentMethodQueries(
    actor,
    input.filters?.paymentMethodQueryAny
  );

  const start = new Date(input.dateRange.from);
  const end = new Date(input.dateRange.to);

  const saleItems = await db.saleItem.findMany({
    where: {
      sale: {
        businessId: actor.businessId,
        createdAt: {
          gte: start,
          lte: end,
        },
        ...(resolvedMethods.ids.length > 0
          ? { paymentMethodId: { in: resolvedMethods.ids } }
          : {}),
      },
      ...(resolvedProducts.ids.length > 0 ? { productId: { in: resolvedProducts.ids } } : {}),
      ...(resolvedCategories.ids.length > 0
        ? { product: { categoryId: { in: resolvedCategories.ids } } }
        : {}),
    },
    include: {
      sale: {
        select: {
          id: true,
          total: true,
          createdAt: true,
          paymentMethodRel: { select: { name: true } },
          paymentMethod: true,
        },
      },
      product: {
        select: {
          name: true,
          category: true,
          categoryRel: { select: { name: true } },
        },
      },
    },
  });

  const rowsByKey = new Map<string, Record<string, unknown>>();
  const uniqueTicketIds = new Set<string>();
  let totalRevenue = 0;
  let quantitySold = 0;

  for (const item of saleItems) {
    uniqueTicketIds.add(item.saleId);
    totalRevenue += Number(item.unitPrice) * item.quantity;
    quantitySold += item.quantity;

    const dayLabel = item.sale.createdAt.toISOString().slice(0, 10);
    const categoryLabel =
      item.product.categoryRel?.name || item.product.category || "Sin categoria";

    const keyParts = (input.groupBy?.length ? input.groupBy : ["product"]).map((group) => {
      switch (group) {
        case "day":
          return dayLabel;
        case "category":
          return categoryLabel;
        case "product":
        default:
          return item.product.name;
      }
    });

    const key = keyParts.join(" | ");
    const current = rowsByKey.get(key) ?? {
      label: key,
      product: item.product.name,
      category: categoryLabel,
      day: dayLabel,
      quantity_sold: 0,
      revenue: 0,
      ticket_ids: new Set<string>(),
    };

    current.quantity_sold = Number(current.quantity_sold) + item.quantity;
    current.revenue = Number(current.revenue) + Number(item.unitPrice) * item.quantity;
    (current.ticket_ids as Set<string>).add(item.saleId);
    rowsByKey.set(key, current);
  }

  const rows = [...rowsByKey.values()].map((row) => ({
    ...row,
    ticket_count: (row.ticket_ids as Set<string>).size,
  }));

  const sortedRows = sortRows(
    rows,
    input.sort ?? { field: "revenue", direction: "desc" }
  ).slice(0, input.limit);

  return {
    rows: sortedRows.map((row) => {
      const rowWithoutTicketIds = { ...row };
      delete rowWithoutTicketIds.ticket_ids;
      return rowWithoutTicketIds;
    }),
    totals: {
      revenue: totalRevenue,
      quantity_sold: quantitySold,
      ticket_count: uniqueTicketIds.size,
    },
    notes: [...resolvedProducts.notes, ...resolvedCategories.notes, ...resolvedMethods.notes],
    range: input.dateRange,
  };
}

export async function executeExpenseReportQuery(
  actor: AssistantActor,
  input: ExpenseReportInput
): Promise<QueryExecutionResult> {
  const resolvedCategories = await resolveCategoryQueries(
    actor,
    input.filters?.categoryQueryAny,
    "EXPENSE"
  );

  const now = new Date();
  const start = input.dateRange?.from ? new Date(input.dateRange.from) : undefined;
  const end = input.dateRange?.to ? new Date(input.dateRange.to) : undefined;

  let expenses = await db.fixedExpense.findMany({
    where: {
      businessId: actor.businessId,
      isDeleted: false,
      ...(start || end
        ? {
            dueDate: {
              ...(start ? { gte: startOfDay(start) } : {}),
              ...(end ? { lte: endOfDay(end) } : {}),
            },
          }
        : {}),
      ...(resolvedCategories.ids.length > 0
        ? { categoryId: { in: resolvedCategories.ids } }
        : {}),
    },
    include: {
      categoryRel: { select: { name: true } },
    },
  });

  if (input.filters?.status) {
    expenses = expenses.filter((expense) => {
      switch (input.filters?.status) {
        case "PAID":
          return expense.isPaid;
        case "PENDING":
          return !expense.isPaid;
        case "OVERDUE":
          return !expense.isPaid && expense.dueDate < now;
      }
    });
  }

  if (typeof input.filters?.minAmount === "number") {
    expenses = expenses.filter(
      (expense) => Number(expense.amount) >= input.filters!.minAmount!
    );
  }
  if (typeof input.filters?.maxAmount === "number") {
    expenses = expenses.filter(
      (expense) => Number(expense.amount) <= input.filters!.maxAmount!
    );
  }

  const rowsByKey = new Map<string, Record<string, unknown>>();
  let amountTotal = 0;

  for (const expense of expenses) {
    amountTotal += Number(expense.amount);
    const categoryLabel =
      expense.categoryRel?.name || expense.category || "Sin categoria";
    const dayLabel = expense.dueDate.toISOString().slice(0, 10);
    const statusLabel = expense.isPaid
      ? "PAID"
      : expense.dueDate < now
      ? "OVERDUE"
      : "PENDING";

    const keyParts = (input.groupBy?.length ? input.groupBy : ["category"]).map((group) => {
      switch (group) {
        case "day":
          return dayLabel;
        case "status":
          return statusLabel;
        case "category":
        default:
          return categoryLabel;
      }
    });

    const key = keyParts.join(" | ");
    const current = rowsByKey.get(key) ?? {
      label: key,
      category: categoryLabel,
      day: dayLabel,
      status: statusLabel,
      amount_total: 0,
      expense_count: 0,
    };

    current.amount_total = Number(current.amount_total) + Number(expense.amount);
    current.expense_count = Number(current.expense_count) + 1;
    rowsByKey.set(key, current);
  }

  const rows = [...rowsByKey.values()];
  const sortedRows = sortRows(
    rows,
    input.sort ?? { field: "amount_total", direction: "desc" }
  ).slice(0, input.limit);

  return {
    rows: sortedRows,
    totals: {
      amount_total: amountTotal,
      expense_count: expenses.length,
    },
    notes: [...resolvedCategories.notes],
    range: input.dateRange,
  };
}
