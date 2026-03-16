"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export function WelcomeToast() {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        if (searchParams.get("registered") === "true") {
            toast.success("¡Registro exitoso! Bienvenido a Stockeado 🎉", {
                description: "Tu negocio fue creado con éxito. Ya podés empezar a cargar productos.",
                duration: 6000,
            });
            // Clean up the URL parameter
            router.replace("/dashboard");
        }
    }, [searchParams, router]);

    return null;
}
