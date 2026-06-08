import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Configuracion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra las preferencias de tu negocio, tu cuenta y la apariencia del panel.
        </p>
      </div>

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
        <aside className="shrink-0 lg:w-1/5">
          <SettingsNav />
        </aside>
        <div className="flex-1 lg:max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
