import { redirect } from "next/navigation";
import { Palette } from "lucide-react";
import { auth } from "@/auth";
import { ThemeSelector } from "@/components/theme-selector";
import { db } from "@/lib/db";
import { getThemeModeLabel } from "@/lib/theme";

export default async function SettingsAppearancePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const userTheme = await db.user.findUnique({
    where: { id: session.user.id },
    select: { themeMode: true },
  });
  const themeMode = userTheme?.themeMode ?? session.user.themeMode ?? "LIGHT";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-border bg-surface-subtle p-3">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Apariencia</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu tema actual es <span className="font-semibold text-foreground">{getThemeModeLabel(themeMode)}</span>.
            Puedes cambiarlo aqui o desde la pantalla principal del panel.
          </p>
        </div>
      </div>

      <ThemeSelector currentThemeMode={themeMode} />
    </div>
  );
}
