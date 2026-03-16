"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createUserAction, getBusinesses } from "@/actions/user-admin";
import { UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect } from "react";

const schema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    role: z.enum(["ADMIN", "OWNER", "SELLER"]),
    businessId: z.string().min(1, "Selecciona un negocio"),
    newBusinessName: z.string().optional(),
}).refine((data) => {
    if (data.businessId === "new" && (!data.newBusinessName || data.newBusinessName.length < 3)) {
        return false;
    }
    return true;
}, {
    message: "El nombre debe tener al menos 3 caracteres",
    path: ["newBusinessName"],
});

type Business = { id: string; name: string; slug: string };

interface CreateUserSheetProps {
    callerRole: string;
    callerBusinessId: string;
}

export function CreateUserSheet({ callerRole, callerBusinessId }: CreateUserSheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | undefined>();
    const [success, setSuccess] = useState<string | undefined>();
    const [businesses, setBusinesses] = useState<Business[]>([]);

    const isAdmin = callerRole === "ADMIN";

    // Available roles based on the caller's role
    const availableRoles = isAdmin
        ? [{ value: "ADMIN" as const, label: "Admin" }, { value: "OWNER" as const, label: "Dueño" }, { value: "SELLER" as const, label: "Vendedor" }]
        : [{ value: "OWNER" as const, label: "Dueño" }, { value: "SELLER" as const, label: "Vendedor" }];

    const defaultRole = isAdmin ? "SELLER" : "SELLER";
    const defaultBusinessId = isAdmin ? "" : callerBusinessId;

    const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { email: "", password: "", role: defaultRole, businessId: defaultBusinessId },
    });

    const role = watch("role");
    const businessId = watch("businessId");

    // Load businesses when sheet opens (ADMIN only)
    useEffect(() => {
        if (open && isAdmin) {
            getBusinesses().then((data) => {
                if (data && "businesses" in data && data.businesses) {
                    setBusinesses(data.businesses);
                }
            });
        }
    }, [open, isAdmin]);

    // For OWNER, always set businessId to their own business
    useEffect(() => {
        if (!isAdmin && open) {
            setValue("businessId", callerBusinessId);
        }
    }, [open, isAdmin, callerBusinessId, setValue]);

    const onSubmit = (values: z.infer<typeof schema>) => {
        setError(undefined);
        setSuccess(undefined);
        startTransition(() => {
            createUserAction(values).then((data: any) => {
                if (data && "error" in data) {
                    setError(data.error);
                }
                if (data && "success" in data) {
                    setSuccess(data.success);
                    reset({ email: "", password: "", role: defaultRole, businessId: defaultBusinessId });
                    // Close the sheet after success
                    setTimeout(() => {
                        setOpen(false);
                        setSuccess(undefined);
                        // Refresh the page
                        window.location.reload();
                    }, 1500);
                }
            });
        });
    };

    return (
        <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset({ email: "", password: "", role: defaultRole, businessId: defaultBusinessId }); setError(undefined); setSuccess(undefined); } }}>
            <SheetTrigger asChild>
                <Button className="bg-zinc-900 text-white hover:bg-zinc-800 gap-2 font-bold shadow-sm cursor-pointer">
                    <UserPlus className="h-4 w-4" />
                    Nuevo Usuario
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
                <SheetHeader className="p-6 border-b">
                    <SheetTitle className="text-xl font-black tracking-tighter">Crear Usuario</SheetTitle>
                    <SheetDescription className="text-zinc-500 text-sm">
                        {isAdmin
                            ? "Crea un nuevo acceso y asígnalo a un negocio existente o crea uno nuevo."
                            : "Crea un nuevo usuario para tu negocio."
                        }
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                            <AlertCircle className="h-5 w-5 shrink-0" /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
                            <CheckCircle2 className="h-5 w-5 shrink-0" /> {success}
                        </div>
                    )}

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700" htmlFor="email">Email</label>
                        <Input {...register("email")} id="email" type="email" placeholder="usuario@email.com" disabled={isPending} className={errors.email ? "border-red-500" : ""} />
                        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700" htmlFor="password">Contraseña inicial</label>
                        <Input {...register("password")} id="password" type="password" placeholder="••••••••" disabled={isPending} className={errors.password ? "border-red-500" : ""} />
                        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                    </div>

                    {/* Role Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Rol</label>
                        <div className="flex gap-3">
                            {availableRoles.map((r) => (
                                <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => setValue("role", r.value, { shouldValidate: true })}
                                    className={`flex-1 rounded-lg border-2 py-3 text-sm font-bold transition-all cursor-pointer ${role === r.value
                                        ? "border-zinc-900 bg-zinc-900 text-white"
                                        : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
                                        }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
                    </div>

                    {/* Business Selector - ADMIN only */}
                    {isAdmin && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700">Negocio</label>
                            <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
                                {/* New Business Option */}
                                <button
                                    type="button"
                                    onClick={() => setValue("businessId", "new", { shouldValidate: true })}
                                    className={`flex items-center justify-between rounded-lg border-2 px-4 py-3 text-sm transition-all text-left cursor-pointer ${businessId === "new"
                                        ? "border-zinc-900 bg-zinc-50"
                                        : "border-zinc-200 hover:border-zinc-400"
                                        }`}
                                >
                                    <span className="font-bold text-zinc-900">+ Crear Nuevo Negocio</span>
                                </button>

                                {businesses.map((b) => (
                                    <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => setValue("businessId", b.id, { shouldValidate: true })}
                                        className={`flex items-center justify-between rounded-lg border-2 px-4 py-3 text-sm transition-all text-left cursor-pointer ${businessId === b.id
                                            ? "border-zinc-900 bg-zinc-50"
                                            : "border-zinc-200 hover:border-zinc-400"
                                            }`}
                                    >
                                        <span className="font-semibold text-zinc-800">{b.name}</span>
                                        <span className="text-xs text-zinc-400">/{b.slug}</span>
                                    </button>
                                ))}
                            </div>
                            {errors.businessId && <p className="text-xs text-red-500">{errors.businessId.message}</p>}
                        </div>
                    )}

                    {/* For OWNER: Show which business the user will be added to */}
                    {!isAdmin && (
                        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                            <p className="text-sm text-zinc-500">
                                El usuario será creado en <span className="font-semibold text-zinc-800">tu negocio</span>.
                            </p>
                        </div>
                    )}

                    {/* New Business Name Input (ADMIN only) */}
                    {isAdmin && businessId === "new" && (
                        <div className="space-y-2 p-4 bg-zinc-50 rounded-xl border border-zinc-100 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-semibold text-zinc-700" htmlFor="newBusinessName">Nombre de la Empresa</label>
                            <Input
                                {...register("newBusinessName")}
                                id="newBusinessName"
                                placeholder="Ej: Mi Tienda S.A."
                                disabled={isPending}
                                className={errors.newBusinessName ? "border-red-500 bg-white" : "bg-white"}
                            />
                            {errors.newBusinessName && <p className="text-xs text-red-500">{errors.newBusinessName.message}</p>}
                        </div>
                    )}
                </form>

                <div className="p-6 border-t bg-zinc-50/50">
                    <Button
                        type="submit"
                        onClick={handleSubmit(onSubmit)}
                        className="w-full h-12 bg-zinc-900 text-white hover:bg-zinc-800 font-bold text-base cursor-pointer"
                        disabled={isPending}
                    >
                        {isPending ? "Creando..." : "Crear Usuario"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
