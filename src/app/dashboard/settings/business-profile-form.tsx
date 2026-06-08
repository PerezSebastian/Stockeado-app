"use client";

import { useTransition } from "react";
import { Building2, Save, Store } from "lucide-react";
import { toast } from "sonner";
import { updateBusinessInfo } from "@/actions/business";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BusinessProfileFormProps {
  initialData: {
    name: string;
    planStatus: string;
    subscriptionId?: string | null;
    apiKey: string;
    domain?: string | null;
  };
  isOwnerOrAdmin: boolean;
}

export function BusinessProfileForm({
  initialData,
  isOwnerOrAdmin,
}: BusinessProfileFormProps) {
  const [isPending, startTransition] = useTransition();

  async function action(formData: FormData) {
    startTransition(async () => {
      const result = await updateBusinessInfo(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Perfil del negocio actualizado");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-subtle px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-background p-2">
            <Building2 className="inline h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Informacion del Negocio</h2>
        </div>
        {initialData.planStatus === "ACTIVE" && (
          <Badge className="border-none bg-success/15 font-bold uppercase tracking-wider text-success hover:bg-success/20">
            Plan Activo
          </Badge>
        )}
      </div>

      <form action={action} className="space-y-6 p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="col-span-2 space-y-3">
            <Label htmlFor="name">Nombre del Negocio</Label>
            <Input
              id="name"
              name="name"
              placeholder="Nombre de tu local..."
              defaultValue={initialData.name}
              disabled={!isOwnerOrAdmin || isPending}
              className="h-11 max-w-md"
            />
            {!isOwnerOrAdmin && (
              <p className="text-xs text-muted-foreground">
                Solo el Administrador o Dueno puede cambiar el nombre del negocio.
              </p>
            )}
          </div>

          <div className="col-span-2 max-w-md space-y-3">
            <Label htmlFor="domain">Dominio Web Personalizado</Label>
            <Input
              id="domain"
              name="domain"
              placeholder="Ej: estacion927.com.ar"
              defaultValue={initialData.domain || ""}
              disabled={!isOwnerOrAdmin || isPending}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Ingresa el dominio apuntado a la app para habilitar tu catálogo propio.
            </p>
          </div>

          <div className="col-span-2 max-w-md space-y-3">
            <Label htmlFor="apiKey">Clave de API de Catálogo (API Key)</Label>
            <div className="relative">
              <Input
                id="apiKey"
                name="apiKey"
                readOnly
                defaultValue={initialData.apiKey}
                className="h-11 bg-surface-subtle font-mono text-xs select-all pr-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Esta clave te permite autenticarte de forma externa contra la API de catálogos. Es de solo lectura.
            </p>
          </div>

          <div className="col-span-2 space-y-3 border-t border-border pt-4">
            <Label>Logo del Negocio</Label>
            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-subtle">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Button type="button" variant="outline" size="sm" disabled>
                  Proximamente
                </Button>
                <p className="text-xs text-muted-foreground">
                  La subida de logo estara disponible en la proxima actualizacion.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button type="submit" disabled={!isOwnerOrAdmin || isPending} className="rounded-lg px-6">
            {isPending ? (
              "Guardando..."
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
