import { auth } from "@/auth";
import { getUsers } from "@/actions/user-admin";
import { CreateUserSheet } from "@/components/create-user-sheet";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { ToggleStatusButton } from "@/components/toggle-status-button";
import { ToggleUserButton } from "@/components/toggle-user-button";
import { PlanStatus, UserRole } from "@prisma/client";

interface UserWithBusiness {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    business: {
        id: string;
        name: string;
        slug: string;
        planStatus: PlanStatus;
        users: { email: string }[];
    };
}

export default async function UsersPage() {
    const session = await auth();

    // Server-side role guard
    if (!session?.user || session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const data = await getUsers();
    if (!("users" in data) || !data.users) redirect("/dashboard");
    const users = data.users as unknown as UserWithBusiness[];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-zinc-900">Usuarios</h1>
                    <p className="text-zinc-500 mt-1 text-sm">
                        Gestiona cuentas individuales y estados de negocios.
                    </p>
                </div>
                <CreateUserSheet />
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-3 text-sm text-zinc-500">
                <Users className="h-4 w-4" />
                <span>{users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Users Table */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50/50">
                                <th className="text-left px-6 py-4 font-semibold text-zinc-600">Email</th>
                                <th className="text-left px-6 py-4 font-semibold text-zinc-600">Rol</th>
                                <th className="text-left px-6 py-4 font-semibold text-zinc-600">Negocio</th>
                                <th className="text-left px-6 py-4 font-semibold text-zinc-600">Estado</th>
                                <th className="text-left px-6 py-4 font-semibold text-zinc-600">Desde</th>
                                <th className="text-right px-6 py-4 font-semibold text-zinc-600">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-zinc-400">
                                        No hay usuarios registrados todavía.
                                    </td>
                                </tr>
                            )}
                            {users.map((user) => {
                                // A business is 'master' if it contains the admin@galape.com user
                                const isMasterBusiness = user.business?.users?.some((u: any) => u.email === "admin@galape.com");

                                return (
                                    <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-zinc-800">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <Badge
                                                variant={user.role === "ADMIN" ? "default" : "secondary"}
                                                className={
                                                    user.role === "ADMIN"
                                                        ? "bg-zinc-900 text-white text-xs font-bold"
                                                        : "bg-zinc-100 text-zinc-700 text-xs font-bold"
                                                }
                                            >
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-600">
                                            {user.business ? (
                                                <span className="flex flex-col">
                                                    <span className="font-medium text-zinc-800">{user.business.name}</span>
                                                    <span className="text-xs text-zinc-400">/{user.business.slug}</span>
                                                </span>
                                            ) : (
                                                <span className="text-zinc-400 italic">Sin negocio</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.business?.planStatus === "INACTIVE" ? (
                                                <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-black">
                                                    NEGOCIO BLOQUEADO
                                                </Badge>
                                            ) : user.isActive ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-black">
                                                    ACTIVO
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-zinc-100 text-zinc-500 border-zinc-200 text-[10px] font-black">
                                                    CUENTA DESACTIVADA
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400">
                                            {new Date(user.createdAt).toLocaleDateString("es-AR", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <ToggleUserButton
                                                    userId={user.id}
                                                    isActive={user.isActive}
                                                    isAdmin={user.email === "admin@galape.com"}
                                                />

                                                {user.business && !isMasterBusiness && (
                                                    <ToggleStatusButton
                                                        businessId={user.business.id}
                                                        currentStatus={user.business.planStatus as any}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
