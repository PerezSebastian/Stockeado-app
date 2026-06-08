"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ThemeMode } from "@prisma/client";
import { Moon, Palette, Settings2, Sun } from "lucide-react";
import { toast } from "sonner";
import { updateThemeMode } from "@/actions/theme";
import {
  THEME_MODE_DESCRIPTIONS,
  THEME_MODE_LABELS,
  THEME_MODE_OPTIONS,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ThemeSelectorProps {
  currentThemeMode: ThemeMode;
  variant?: "compact" | "full";
}

const THEME_MODE_ICONS = {
  LIGHT: Sun,
  DARK: Moon,
} satisfies Record<ThemeMode, typeof Sun>;

export function ThemeSelector({
  currentThemeMode,
  variant = "full",
}: ThemeSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticThemeMode, setOptimisticThemeMode] = useOptimistic(
    currentThemeMode,
    (_previous, nextThemeMode: ThemeMode) => nextThemeMode
  );

  const isCompact = variant === "compact";

  function handleThemeChange(nextThemeMode: ThemeMode) {
    if (nextThemeMode === optimisticThemeMode || isPending) {
      return;
    }

    startTransition(() => {
      setOptimisticThemeMode(nextThemeMode);

      void (async () => {
        const result = await updateThemeMode(nextThemeMode);

        if (result.error) {
          toast.error(result.error);
          router.refresh();
          return;
        }

        toast.success(result.success);
        router.refresh();
      })();
    });
  }

  if (isCompact) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/80 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Tema del panel</p>
            <Badge variant="secondary" className="h-6 shrink-0 px-2 text-[11px]">
              {isPending ? "Guardando..." : THEME_MODE_LABELS[optimisticThemeMode]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cambialo rapido desde aca o ajustalo en configuracion.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-xl border border-border bg-surface-subtle p-1">
            {THEME_MODE_OPTIONS.map((option) => {
              const isSelected = optimisticThemeMode === option.value;
              const Icon = THEME_MODE_ICONS[option.value];

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleThemeChange(option.value)}
                  disabled={isPending}
                  title={`Cambiar a modo ${option.label.toLowerCase()}`}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isSelected
                      ? "bg-background text-foreground shadow-sm"
                      : "cursor-pointer text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    isPending && "cursor-wait opacity-80",
                    !isPending && isSelected && "cursor-default"
                  )}
                  aria-pressed={isSelected}
                  aria-label={`Cambiar a modo ${option.label.toLowerCase()}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                  {isSelected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 cursor-pointer rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/dashboard/settings/appearance")}
            aria-label="Abrir opciones completas de apariencia"
            title="Abrir opciones completas de apariencia"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Palette className="h-5 w-5 text-primary" />
              Apariencia
            </CardTitle>
            <CardDescription>
              Elige el tema base de tu panel. Mas adelante vas a poder personalizar colores,
              acentos y superficies.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Actual: {THEME_MODE_LABELS[optimisticThemeMode]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {THEME_MODE_OPTIONS.map((option) => {
            const isSelected = optimisticThemeMode === option.value;
            const Icon = THEME_MODE_ICONS[option.value];

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleThemeChange(option.value)}
                disabled={isPending}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-surface-elevated hover:border-primary/40 hover:bg-accent/40",
                  isPending && "cursor-wait"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl border",
                        isSelected
                          ? "border-primary/30 bg-primary text-primary-foreground"
                          : "border-border bg-surface-subtle text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{option.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {THEME_MODE_DESCRIPTIONS[option.value]}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                      Predeterminado
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-surface-subtle/80 p-4">
          <p className="text-sm font-medium text-foreground">Personalizacion avanzada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            En la siguiente etapa vas a poder definir acentos, fondos, tarjetas y colores del
            panel con mayor detalle.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
