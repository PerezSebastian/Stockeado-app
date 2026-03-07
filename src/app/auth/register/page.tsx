"use client";

import { registerAction } from "@/actions/register";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";

const registerSchema = z.object({
    businessName: z.string().min(2, "Mínimo 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
});

export default function RegisterPage() {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | undefined>();
    const [success, setSuccess] = useState<string | undefined>();

    const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            businessName: "",
            email: "",
            password: "",
        },
    });

    const onSubmit = (values: z.infer<typeof registerSchema>) => {
        setError(undefined);
        setSuccess(undefined);

        startTransition(() => {
            registerAction(values).then((data) => {
                if (data?.error) {
                    setError(data.error);
                }
                if (data?.success) {
                    setSuccess(data.success);
                    reset(); // Clear the form on success
                }
            });
        });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
            <Card className="w-full max-w-md shadow-xl border-zinc-200">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-black tracking-tighter text-zinc-900 overflow-hidden">
                        Únete a Galape App
                    </CardTitle>
                    <CardDescription>
                        Crea tu negocio y empieza a gestionar tu stock hoy mismo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {error && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
                                <CheckCircle2 className="h-5 w-5 shrink-0" />
                                {success}
                            </div>
                        )}

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-zinc-700" htmlFor="businessName">
                                    Nombre de tu Negocio
                                </label>
                                <Input
                                    {...register("businessName")}
                                    id="businessName"
                                    placeholder="Ej: La Esquina de San Juan"
                                    disabled={isPending}
                                    className={errors.businessName ? "border-red-500 focus-visible:ring-red-500" : "bg-white"}
                                />
                                {errors.businessName && <p className="text-xs font-medium text-red-500">{errors.businessName.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-zinc-700" htmlFor="email">
                                    Email Administrador
                                </label>
                                <Input
                                    {...register("email")}
                                    id="email"
                                    type="email"
                                    placeholder="admin@ejemplo.com"
                                    disabled={isPending}
                                    className={errors.email ? "border-red-500 focus-visible:ring-red-500" : "bg-white"}
                                />
                                {errors.email && <p className="text-xs font-medium text-red-500">{errors.email.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-zinc-700" htmlFor="password">
                                    Contraseña maestra
                                </label>
                                <Input
                                    {...register("password")}
                                    id="password"
                                    type="password"
                                    disabled={isPending}
                                    placeholder="••••••••"
                                    className={errors.password ? "border-red-500 focus-visible:ring-red-500" : "bg-white"}
                                />
                                {errors.password && <p className="text-xs font-medium text-red-500">{errors.password.message}</p>}
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 text-base font-bold transition-all shadow-md active:scale-[0.98]"
                            disabled={isPending}
                        >
                            {isPending ? "Creando cuenta..." : "Comenzar gratis"}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm border-t border-zinc-100 pt-6">
                        <p className="text-zinc-500">
                            ¿Ya tienes un negocio?{" "}
                            <a href="/auth/login" className="font-bold text-zinc-900 hover:underline">
                                Inicia Sesión
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
