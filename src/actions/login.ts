"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(values: any) {
    try {
        await signIn("credentials", {
            email: values.email,
            password: values.password,
            redirectTo: "/dashboard",
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Credenciales inválidas" };
                default:
                    return { error: "Algo salió mal" };
            }
        }
        throw error;
    }
}
