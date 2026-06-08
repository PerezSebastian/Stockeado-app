import { ThemeMode } from "@prisma/client";

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  LIGHT: "Claro",
  DARK: "Oscuro",
};

export const THEME_MODE_DESCRIPTIONS: Record<ThemeMode, string> = {
  LIGHT: "Paleta luminosa para trabajar con alto contraste durante el dia.",
  DARK: "Paleta oscura para entornos con poca luz y jornadas largas.",
};

export const THEME_MODE_OPTIONS = [
  {
    value: "LIGHT" as const,
    label: THEME_MODE_LABELS.LIGHT,
    description: THEME_MODE_DESCRIPTIONS.LIGHT,
  },
  {
    value: "DARK" as const,
    label: THEME_MODE_LABELS.DARK,
    description: THEME_MODE_DESCRIPTIONS.DARK,
  },
] satisfies Array<{
  value: ThemeMode;
  label: string;
  description: string;
}>;

export function getThemeClassName(themeMode?: ThemeMode | null) {
  return themeMode === "DARK" ? "dark" : "";
}

export function getThemeModeLabel(themeMode?: ThemeMode | null) {
  return THEME_MODE_LABELS[themeMode ?? "LIGHT"];
}
