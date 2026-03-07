"use client";

import { loginAction } from "@/actions/login";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(1, "La contraseña es requerida"),
});

export default function LoginPage() {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | undefined>();

    const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({
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
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
            <Card className="w-full max-w-sm shadow-xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight text-center">Galape App</CardTitle>
                    <CardDescription className="text-center">
                        Ingresa tus credenciales para acceder a tu cuenta
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm text-center">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700" htmlFor="email">
                                Email
                            </label>
                            <Input
                                {...register("email")}
                                id="email"
                                type="email"
                                placeholder="nombre@ejemplo.com"
                                disabled={isPending}
                                className={errors.email ? "border-red-500" : ""}
                            />
                            {errors.email && (
                                <p className="text-xs text-red-500">{errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700" htmlFor="password">
                                Contraseña
                            </label>
                            <Input
                                {...register("password")}
                                id="password"
                                type="password"
                                disabled={isPending}
                                className={errors.password ? "border-red-500" : ""}
                            />
                            {errors.password && (
                                <p className="text-xs text-red-500">{errors.password.message}</p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-zinc-900 text-zinc-50 hover:bg-zinc-800"
                            disabled={isPending}
                        >
                            {isPending ? "Iniciando..." : "Iniciar Sesión"}
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        <p className="text-zinc-500">
                            ¿No tienes cuenta?{" "}
                            <a href="/auth/register" className="font-semibold text-zinc-900 hover:underline">
                                Regístrate ahora
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
