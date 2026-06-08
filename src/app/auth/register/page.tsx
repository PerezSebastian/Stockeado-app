"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { registerAction } from "@/actions/register";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const registerSchema = z.object({
  registrationKey: z.string().min(1, "La clave de registro es requerida para crear un negocio"),
  businessName: z.string().min(2, "Minimo 2 caracteres"),
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
});

export default function RegisterPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      registrationKey: "",
      businessName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    setError(undefined);

    startTransition(() => {
      registerAction(values).then((data) => {
        if (data?.error) {
          setError(data.error);
        }
      });
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="overflow-hidden text-2xl font-black tracking-tighter text-foreground">
            Unete a Stockeado
          </CardTitle>
          <CardDescription>
            Crea tu negocio y empieza a gestionar tu stock hoy mismo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-danger-soft-foreground/20 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="registrationKey">
                  Clave de Registro (Proporcionada por el administrador)
                </label>
                <Input
                  {...register("registrationKey")}
                  id="registrationKey"
                  type="password"
                  placeholder="Ingrese la clave autorizada"
                  disabled={isPending}
                  className={errors.registrationKey ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.registrationKey && (
                  <p className="text-xs font-medium text-destructive">{errors.registrationKey.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="businessName">
                  Nombre de tu Negocio
                </label>
                <Input
                  {...register("businessName")}
                  id="businessName"
                  placeholder="Ej: La Esquina de San Juan"
                  disabled={isPending}
                  className={errors.businessName ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.businessName && (
                  <p className="text-xs font-medium text-destructive">{errors.businessName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="email">
                  Email del Dueno
                </label>
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  placeholder="dueno@ejemplo.com"
                  disabled={isPending}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="password">
                  Contrasena
                </label>
                <Input
                  {...register("password")}
                  id="password"
                  type="password"
                  disabled={isPending}
                  placeholder="••••••••"
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" className="h-12 w-full text-base font-bold" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando negocio...
                </span>
              ) : (
                "Registrar negocio"
              )}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Ya tienes un negocio?{" "}
              <Link href="/auth/login" className="font-bold text-foreground hover:underline">
                Inicia Sesion
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
