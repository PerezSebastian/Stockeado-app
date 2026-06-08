"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { createCategory, deleteCategory, toggleCategoryStatus } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CircleOff,
  Filter,
  Layers3,
  Loader2,
  Search,
  Plus,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { Category } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CategoryListProps {
  initialCategories: (Category & { isActive?: boolean })[];
}

type CategoryViewFilter = "ALL" | "ACTIVE" | "INACTIVE" | "SYSTEM";

const DEFAULT_EXPENSE_NAMES = [
  "LUZ",
  "GAS",
  "INTERNET",
  "ALQUILER",
  "AGUA",
  "SUELDOS",
  "IMPUESTOS",
  "OTROS",
];

export function CategoryList({ initialCategories }: CategoryListProps) {
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"PRODUCT" | "EXPENSE">("PRODUCT");
  const [categories, setCategories] = useState(initialCategories);
  const [viewFilters, setViewFilters] = useState<
    Record<"PRODUCT" | "EXPENSE", CategoryViewFilter>
  >({
    PRODUCT: "ALL",
    EXPENSE: "ALL",
  });
  const [searchTerms, setSearchTerms] = useState<Record<"PRODUCT" | "EXPENSE", string>>({
    PRODUCT: "",
    EXPENSE: "",
  });
  const [debouncedSearchTerms] = useDebounce(searchTerms, 300);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const filteredCategories = useMemo(() => {
    return (["PRODUCT", "EXPENSE"] as const).reduce((acc, type) => {
      const items = categories.filter((category) => category.type === type);
      const currentFilter = viewFilters[type];
      const normalizedSearch = debouncedSearchTerms[type].trim().toLowerCase();

      const visibleItems = items.filter((category) => {
        const isActive = category.isActive !== false;
        const isSystem =
          type === "EXPENSE" && DEFAULT_EXPENSE_NAMES.includes(category.name.toUpperCase());
        const matchesSearch =
          normalizedSearch.length === 0 ||
          category.name.toLowerCase().includes(normalizedSearch);

        if (!matchesSearch) {
          return false;
        }

        switch (currentFilter) {
          case "ACTIVE":
            return isActive;
          case "INACTIVE":
            return !isActive;
          case "SYSTEM":
            return isSystem;
          default:
            return true;
        }
      });
      acc[type] = visibleItems;
      return acc;
    }, {} as Record<"PRODUCT" | "EXPENSE", typeof categories>);
  }, [categories, debouncedSearchTerms, viewFilters]);

  const groupedCategories = useMemo(() => {
    return (["PRODUCT", "EXPENSE"] as const).map((type) => {
      const items = categories.filter((category) => category.type === type);
      const activeCount = items.filter((category) => category.isActive !== false).length;
      const inactiveCount = items.length - activeCount;
      const systemCount = items.filter((category) =>
        type === "EXPENSE" ? DEFAULT_EXPENSE_NAMES.includes(category.name.toUpperCase()) : false
      ).length;

      return {
        type,
        items,
        visibleItems: filteredCategories[type] || [],
        activeCount,
        inactiveCount,
        systemCount,
        currentFilter: viewFilters[type],
        searchTerm: searchTerms[type],
      };
    });
  }, [categories, filteredCategories, searchTerms, viewFilters]);

  const totalActive = categories.filter((category) => category.isActive !== false).length;
  const totalInactive = categories.length - totalActive;
  const filterOptions: CategoryViewFilter[] = ["ALL", "ACTIVE", "INACTIVE", "SYSTEM"];

  const getFilterLabel = (filter: CategoryViewFilter) => {
    switch (filter) {
      case "ACTIVE":
        return "Activas";
      case "INACTIVE":
        return "Deshabilitadas";
      case "SYSTEM":
        return "Sistema";
      default:
        return "Todas";
    }
  };

  const getFilterCount = (
    group: (typeof groupedCategories)[number],
    filter: CategoryViewFilter
  ) => {
    switch (filter) {
      case "ACTIVE":
        return group.activeCount;
      case "INACTIVE":
        return group.inactiveCount;
      case "SYSTEM":
        return group.systemCount;
      default:
        return group.items.length;
    }
  };

  const getEmptyFilterMessage = (
    type: "PRODUCT" | "EXPENSE",
    filter: CategoryViewFilter,
    searchTerm: string
  ) => {
    if (searchTerm.trim()) {
      return `No encontramos categorias que coincidan con "${searchTerm.trim()}".`;
    }

    const sectionLabel =
      type === "PRODUCT" ? "de productos" : "de gastos fijos";

    switch (filter) {
      case "ACTIVE":
        return `No hay categorias activas ${sectionLabel}.`;
      case "INACTIVE":
        return `No hay categorias deshabilitadas ${sectionLabel}.`;
      case "SYSTEM":
        return "No hay categorias del sistema en este bloque.";
      default:
        return "No hay categorias creadas en esta seccion.";
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;

    startTransition(async () => {
      const result = await createCategory(newName, newType);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Categoria creada");
      setNewName("");
    });
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    startTransition(async () => {
      const result = await deleteCategory(categoryToDelete.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Categoria eliminada");
      setCategoryToDelete(null);
    });
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    setCategories((previous) =>
      previous.map((category) =>
        category.id === id ? { ...category, isActive: nextStatus } : category
      )
    );

    const result = await toggleCategoryStatus(id, nextStatus);
    if (result.error) {
      toast.error(result.error);
      setCategories((previous) =>
        previous.map((category) =>
          category.id === id ? { ...category, isActive: currentStatus } : category
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)]">
        <Card className="overflow-hidden border-border bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--surface-subtle)/0.58))] shadow-xl shadow-black/5">
          <CardHeader className="border-b border-border/80 bg-surface-subtle/35 pb-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Organizacion
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight text-foreground">
                    Nueva categoria
                  </CardTitle>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Define categorias mas claras para que inventario, gastos y reportes
                    tengan una estructura prolija y facil de entender.
                  </p>
                </div>
              </div>

              <div className="grid w-full grid-cols-3 gap-2 min-[700px]:w-auto min-[700px]:min-w-[280px] min-[700px]:max-w-[320px]">
                <div className="rounded-2xl border border-border bg-background/80 px-3 py-3 text-center shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Total
                  </p>
                  <p className="mt-1 text-xl font-black text-foreground">{categories.length}</p>
                </div>
                <div className="rounded-2xl border border-success/20 bg-success/10 px-3 py-3 text-center shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-success">
                    Activas
                  </p>
                  <p className="mt-1 text-xl font-black text-success">{totalActive}</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/80 px-3 py-3 text-center shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Inactivas
                  </p>
                  <p className="mt-1 text-xl font-black text-foreground">{totalInactive}</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form
              onSubmit={handleCreate}
              className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_220px_auto] 2xl:items-end"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Nombre
                </Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Ej: Bebidas, Limpieza..."
                  className="h-12 rounded-2xl border-border bg-background/80 px-4 shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="type"
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Tipo
                </Label>
                <select
                  id="type"
                  value={newType}
                  onChange={(event) =>
                    setNewType(event.target.value as "PRODUCT" | "EXPENSE")
                  }
                  className="flex h-12 w-full rounded-2xl border border-border bg-background/80 px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="PRODUCT">Productos</option>
                  <option value="EXPENSE">Gastos fijos</option>
                </select>
              </div>

              <Button
                disabled={isPending || !newName.trim()}
                type="submit"
                className="h-12 rounded-2xl bg-primary px-6 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Agregar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--surface-subtle)/0.58))] shadow-xl shadow-black/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-black tracking-tight text-foreground">
              <Layers3 className="h-4.5 w-4.5 text-primary" />
              Vista rapida
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {groupedCategories.map((group) => (
              <div
                key={group.type}
                className="rounded-[24px] border border-border bg-background/80 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {group.type === "PRODUCT"
                        ? "Categorias de productos"
                        : "Categorias de gastos"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {group.items.length === 0
                        ? "Todavia no hay categorias cargadas."
                        : `${group.items.length} categorias configuradas en este bloque.`}
                    </p>
                  </div>
                  <Badge className="rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
                    {group.items.length}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-success/15 bg-success/10 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-success" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-success">
                        Activas
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-success">
                      {group.activeCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface-subtle px-3 py-3">
                    <div className="flex items-center gap-2">
                      <CircleOff className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Inactivas
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-foreground">
                      {group.inactiveCount}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-2">
        {groupedCategories.map((group) => (
          <Card
            key={group.type}
            className="overflow-hidden border-border bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--surface-subtle)/0.42))] shadow-xl shadow-black/5"
          >
            <CardHeader className="border-b border-border/80 bg-surface-subtle/35 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-[0.24em] text-foreground">
                    {group.type === "PRODUCT"
                      ? "Categorias de productos"
                      : "Categorias de gastos"}
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {group.items.length === 0
                      ? "Sin categorias todavia."
                      : `${group.activeCount} activas y ${group.inactiveCount} inactivas.`}
                  </p>
                </div>
                <Badge className="rounded-full bg-background px-3 py-1.5 text-foreground shadow-sm hover:bg-background">
                  {group.items.length} total
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3">
              {group.items.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-border bg-background/60 px-6 text-center text-sm leading-6 text-muted-foreground">
                  No hay categorias creadas en esta seccion.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-border/80 bg-background/70 p-3 shadow-sm">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="mr-1 inline-flex items-center gap-2 rounded-full bg-surface-subtle px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <Filter className="h-3.5 w-3.5" />
                          Filtrar
                        </div>
                        {filterOptions
                          .filter((filter) => filter !== "SYSTEM" || group.type === "EXPENSE")
                          .map((filter) => {
                            const isActiveFilter = group.currentFilter === filter;

                            return (
                              <button
                                key={`${group.type}-${filter}`}
                                type="button"
                                title={`Mostrar ${getFilterLabel(filter).toLowerCase()}`}
                                onClick={() =>
                                  setViewFilters((previous) => ({
                                    ...previous,
                                    [group.type]: filter,
                                  }))
                                }
                                className={cn(
                                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  isActiveFilter
                                    ? "border-primary/25 bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/20 hover:bg-surface-subtle hover:text-foreground"
                                )}
                              >
                                <span>{getFilterLabel(filter)}</span>
                                <span
                                  className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                                    isActiveFilter
                                      ? "bg-primary-foreground/20 text-primary-foreground"
                                      : "bg-surface-subtle text-foreground"
                                  )}
                                >
                                  {getFilterCount(group, filter)}
                                </span>
                              </button>
                            );
                          })}
                      </div>

                      <div className="relative w-full xl:max-w-[260px]">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={group.searchTerm}
                          onChange={(event) =>
                            setSearchTerms((previous) => ({
                              ...previous,
                              [group.type]: event.target.value,
                            }))
                          }
                          placeholder="Buscar categoria..."
                          title={`Buscar en ${group.type === "PRODUCT" ? "categorias de productos" : "categorias de gastos"}`}
                          className="h-11 rounded-2xl border-border bg-background/90 pl-11 shadow-sm transition-all duration-200 focus-visible:border-primary/20"
                        />
                      </div>
                    </div>
                  </div>

                  {group.visibleItems.length === 0 ? (
                    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-background/60 px-6 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle text-muted-foreground">
                        <CircleOff className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-foreground">
                        Nada para mostrar con este filtro
                      </p>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                        {getEmptyFilterMessage(
                          group.type,
                          group.currentFilter,
                          group.searchTerm
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {group.visibleItems.map((category, index) => {
                    const isDefault =
                      group.type === "EXPENSE" &&
                      DEFAULT_EXPENSE_NAMES.includes(category.name.toUpperCase());
                    const isActive = category.isActive !== false;

                    return (
                      <div
                        key={category.id}
                        className={cn(
                          "group flex items-center justify-between gap-4 rounded-[26px] border px-4 py-4 shadow-sm transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-2",
                          isActive
                            ? "border-border bg-background/90 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-black/5"
                            : "border-border/80 bg-surface-subtle/70 hover:border-border"
                        )}
                        style={{ animationDelay: `${Math.min(index * 45, 180)}ms` }}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                              isActive
                                ? "border-primary/15 bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground"
                            )}
                          >
                            <Tag className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={cn(
                                  "truncate text-sm font-bold tracking-tight",
                                  isActive ? "text-foreground" : "text-muted-foreground"
                                )}
                              >
                                {category.name}
                              </p>
                              <Badge
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm",
                                  isActive
                                    ? "bg-success/10 text-success hover:bg-success/10"
                                    : "bg-background text-muted-foreground hover:bg-background"
                                )}
                              >
                                {isActive ? "Activa" : "Deshabilitada"}
                              </Badge>
                              {isDefault && (
                                <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10">
                                  Sistema
                                </Badge>
                              )}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                              {isActive
                                ? "Disponible para usarse en formularios, filtros y reportes."
                                : "Se conserva para historial, pero queda fuera del uso operativo."}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <div className="hidden text-right sm:block">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Estado
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-sm font-semibold",
                                isActive ? "text-success" : "text-muted-foreground"
                              )}
                            >
                              {isActive ? "Habilitada" : "Deshabilitada"}
                            </p>
                          </div>

                          <div
                            className={cn(
                              "inline-flex items-center gap-3 rounded-2xl border px-3 py-2 transition-all duration-200",
                              isActive
                                ? "border-success/20 bg-success/10"
                                : "border-border bg-background"
                            )}
                          >
                            <div className="hidden sm:block">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Interruptor
                              </p>
                              <p
                                className={cn(
                                  "mt-1 text-sm font-semibold",
                                  isActive ? "text-success" : "text-foreground"
                                )}
                              >
                                {isActive ? "Encendida" : "Apagada"}
                              </p>
                            </div>
                            <Switch
                              checked={isActive}
                              onCheckedChange={() =>
                                void handleToggle(category.id, isActive)
                              }
                              title={
                                isActive
                                  ? `Deshabilitar categoria ${category.name}`
                                  : `Habilitar categoria ${category.name}`
                              }
                              className="cursor-pointer data-[state=checked]:bg-success data-[state=unchecked]:bg-input/80 data-[state=checked]:shadow-[0_0_0_4px_rgba(34,197,94,0.12)]"
                            />
                          </div>

                          {!isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title={`Eliminar categoria ${category.name}`}
                              onClick={() =>
                                setCategoryToDelete({
                                  id: category.id,
                                  name: category.name,
                                })
                              }
                              className="cursor-pointer rounded-full text-muted-foreground transition-all duration-200 hover:bg-danger-soft hover:text-danger-soft-foreground sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <DialogContent className="max-w-[400px] gap-6">
          <DialogHeader className="gap-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger-soft-foreground">
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl">
              Eliminar categoria
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Estas por eliminar{" "}
              <span className="font-bold text-foreground">
                &quot;{categoryToDelete?.name}&quot;
              </span>
              . Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center sm:gap-4">
            <Button
              variant="outline"
              onClick={() => setCategoryToDelete(null)}
              className="h-11 w-full px-8 sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
              className="h-11 w-full bg-destructive px-8 hover:bg-destructive/90 sm:w-auto"
            >
              {isPending ? "Eliminando..." : "Si, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

