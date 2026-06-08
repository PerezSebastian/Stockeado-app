"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { loginAction } from "@/actions/login";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(1, "La contrasena es requerida"),
});

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    setError(undefined);
    startTransition(() => {
      loginAction(values).then((data) => {
        if (data?.error) {
          setError(data.error);
        }
      });
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold tracking-tight text-foreground">
            Stockeado
          </CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md border border-danger-soft-foreground/20 bg-danger-soft px-4 py-3 text-center text-sm text-danger-soft-foreground">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email
              </label>
              <Input
                {...register("email")}
                id="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                disabled={isPending}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Contrasena
              </label>
              <Input
                {...register("password")}
                id="password"
                type="password"
                disabled={isPending}
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Iniciando..." : "Iniciar Sesion"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <p className="text-muted-foreground">
              No tienes cuenta?{" "}
              <Link href="/auth/register" className="font-semibold text-foreground hover:underline">
                Registrate ahora
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
