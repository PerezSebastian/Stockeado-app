import { z } from "zod";

export const reportSortDirectionSchema = z.enum(["asc", "desc"]);

function normalizeMetricAliases(
  values: unknown,
  aliasMap: Record<string, string>
) {
  if (!Array.isArray(values)) return values;

  return values.map((value) => {
    const normalized = String(value).trim().toLowerCase();
    return aliasMap[normalized] ?? value;
  });
}

export const dateRangeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const inventoryReportInput = z.object({
  filters: z
    .object({
      productQueryAny: z.array(z.string().min(1)).max(8).optional(),
      categoryQueryAny: z.array(z.string().min(1)).max(8).optional(),
      stockStatus: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]).optional(),
      isPublic: z.boolean().optional(),
    })
    .optional(),
  metrics: z.preprocess(
    (value) =>
      normalizeMetricAliases(value, {
        count: "product_count",
        total: "product_count",
        total_count: "product_count",
        total_products: "product_count",
        total_productos: "product_count",
        products_count: "product_count",
        cantidad: "product_count",
        cantidad_productos: "product_count",
        productos: "product_count",
        numero_productos: "product_count",
        stock: "current_stock",
        stock_total: "current_stock",
        currentstock: "current_stock",
        total_stock: "current_stock",
        cantidad_stock: "current_stock",
      }),
    z.array(z.enum(["current_stock", "product_count"])).min(1).max(3)
  ),
  groupBy: z.array(z.enum(["product", "category"])).max(2).optional(),
  sort: z
    .object({
      field: z.enum(["name", "stock", "category"]),
      direction: reportSortDirectionSchema,
    })
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const salesReportInput = z.object({
  dateRange: dateRangeSchema,
  filters: z
    .object({
      productQueryAny: z.array(z.string().min(1)).max(8).optional(),
      categoryQueryAny: z.array(z.string().min(1)).max(8).optional(),
      paymentMethodQueryAny: z.array(z.string().min(1)).max(8).optional(),
    })
    .optional(),
  metrics: z.preprocess(
    (value) =>
      normalizeMetricAliases(value, {
        total: "revenue",
        amount: "revenue",
        total_revenue: "revenue",
        sales_count: "ticket_count",
        count: "ticket_count",
        tickets: "ticket_count",
        ventas: "ticket_count",
        quantity: "quantity_sold",
        cantidad: "quantity_sold",
        unidades: "quantity_sold",
        units_sold: "quantity_sold",
      }),
    z.array(z.enum(["revenue", "ticket_count", "quantity_sold"])).min(1).max(3)
  ),
  groupBy: z.array(z.enum(["product", "category", "day"])).max(2).optional(),
  sort: z
    .object({
      field: z.enum(["revenue", "ticket_count", "quantity_sold", "day", "label"]),
      direction: reportSortDirectionSchema,
    })
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const expenseReportInput = z.object({
  dateRange: dateRangeSchema.optional(),
  filters: z
    .object({
      categoryQueryAny: z.array(z.string().min(1)).max(8).optional(),
      status: z.enum(["PENDING", "PAID", "OVERDUE"]).optional(),
      minAmount: z.coerce.number().nonnegative().optional(),
      maxAmount: z.coerce.number().nonnegative().optional(),
    })
    .optional(),
  metrics: z.preprocess(
    (value) =>
      normalizeMetricAliases(value, {
        total: "amount_total",
        amount: "amount_total",
        total_amount: "amount_total",
        count: "expense_count",
        cantidad: "expense_count",
        gastos: "expense_count",
        expenses_count: "expense_count",
      }),
    z.array(z.enum(["amount_total", "expense_count"])).min(1).max(3)
  ),
  groupBy: z.array(z.enum(["category", "day", "status"])).max(2).optional(),
  sort: z
    .object({
      field: z.enum(["amount_total", "expense_count", "due_date", "label"]),
      direction: reportSortDirectionSchema,
    })
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type InventoryReportInput = z.infer<typeof inventoryReportInput>;
export type SalesReportInput = z.infer<typeof salesReportInput>;
export type ExpenseReportInput = z.infer<typeof expenseReportInput>;

export interface ResolvedEntityNote {
  type: "product" | "category" | "payment_method";
  input: string;
  resolved: string[];
  confidence: string;
}
