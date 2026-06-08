"use client";

import { useTransition } from "react";
import { KeyRound, Mail, ShieldCheck, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { updateAccountEmail, updatePassword } from "@/actions/account";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { UserRole } from "@prisma/client";

interface AccountFormProps {
  user: {
    email: string;
    role: string;
    businessName: string;
  };
}

export function AccountForm({ user }: AccountFormProps) {
  const [isPendingEmail, startTransitionEmail] = useTransition();
  const [isPendingPass, startTransitionPass] = useTransition();

  async function handleEmailUpdate(formData: FormData) {
    const email = formData.get("email") as string;
    startTransitionEmail(async () => {
      const result = await updateAccountEmail(email);
      if (result.error) toast.error(result.error);
      else toast.success(result.success);
    });
  }

  async function handlePasswordUpdate(formData: FormData) {
    const current = formData.get("currentPassword") as string;
    const next = formData.get("newPassword") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (next !== confirm) {
      toast.error("Las nuevas contrasenas no coinciden");
      return;
    }

    startTransitionPass(async () => {
      const result = await updatePassword(current, next);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success);
        (document.getElementById("pass-form") as HTMLFormElement).reset();
      }
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="overflow-hidden border-border shadow-sm">
        <CardHeader className="flex flex-row items-center gap-4 border-b border-border bg-surface-subtle">
          <div className="rounded-lg border border-border bg-background p-2 shadow-sm">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-foreground">Perfil de Usuario</CardTitle>
            <CardDescription>Informacion vinculada a tu cuenta.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="font-medium text-muted-foreground">Rol Asignado</Label>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  className={
                    user.role === UserRole.ADMIN
                      ? "bg-primary text-primary-foreground"
                      : user.role === UserRole.OWNER
                        ? "bg-success/15 text-success hover:bg-success/15"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary"
                  }
                >
                  {user.role === UserRole.ADMIN ? "Administrador" : user.role === UserRole.OWNER ? "Dueno" : "Vendedor"}
                </Badge>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="font-medium text-muted-foreground">Negocio Vinculado</Label>
              <p className="mt-1 font-semibold text-foreground">{user.businessName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="rounded-lg bg-surface-subtle p-2">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Email de Acceso</CardTitle>
            <CardDescription>Esta es la direccion con la que inicias sesion.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form action={handleEmailUpdate} className="flex flex-col items-end gap-4 sm:flex-row">
            <div className="w-full max-w-md flex-1 space-y-2">
              <Label htmlFor="email">Correo Electronico</Label>
              <Input id="email" name="email" type="email" defaultValue={user.email} className="h-11" required />
            </div>
            <Button disabled={isPendingEmail} type="submit" className="h-11 rounded-xl px-6">
              {isPendingEmail ? "Actualizando..." : "Actualizar Email"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="rounded-lg bg-surface-subtle p-2">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Seguridad</CardTitle>
            <CardDescription>Actualiza tu contrasena para mantener tu cuenta segura.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form id="pass-form" action={handlePasswordUpdate} className="max-w-md space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contrasena Actual</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder="••••••••"
                required
                className="h-11 bg-surface-subtle"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contrasena</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="Min. 6 caracteres"
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="h-11"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <Button disabled={isPendingPass} type="submit" className="h-11 w-full rounded-xl px-8 sm:w-auto">
                {isPendingPass ? "Guardando..." : "Cambiar Contrasena"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
