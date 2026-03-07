"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleUserStatusAction } from "@/actions/user-admin";
import { UserCheck, UserMinus } from "lucide-react";

interface ToggleUserButtonProps {
    userId: string;
    isActive: boolean;
    isAdmin: boolean;
}

export function ToggleUserButton({ userId, isActive, isAdmin }: ToggleUserButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        if (isAdmin) return; // Protection for safety

        startTransition(async () => {
            const result = await toggleUserStatusAction(userId, isActive);
            if (result.success) {
                window.location.reload();
            } else if (result.error) {
                alert(result.error);
            }
        });
    };

    if (isAdmin) return null;

    return (
        <Button
            size="sm"
            variant={isActive ? "outline" : "default"}
            disabled={isPending}
            onClick={handleToggle}
            className={`flex items-center gap-2 font-bold h-8 ${isActive ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
        >
            {isActive ? (
                <>
                    <UserMinus className="h-4 w-4" />
                    Baja Cuenta
                </>
            ) : (
                <>
                    <UserCheck className="h-4 w-4" />
                    Alta Cuenta
                </>
            )}
        </Button>
    );
}
