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
            className={`font-bold gap-1.5 h-8 px-3 transition-all active:scale-95 cursor-pointer ${isActive ? "text-danger-soft-foreground hover:text-danger-soft-foreground hover:bg-danger-soft" : "bg-success hover:bg-success/90 text-primary-foreground"}`}
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

