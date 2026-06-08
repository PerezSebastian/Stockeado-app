import type { NextAuthConfig } from "next-auth";
import { ExtendedUser } from "./next-auth.d";
import { ThemeMode, UserRole } from "@prisma/client";

export default {
    providers: [], // Configured in auth.ts
    callbacks: {
        async session({ token, session }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }

            const user = session.user as ExtendedUser;

            if (token.role && user) {
                user.role = token.role as UserRole;
            }

            if (token.businessId && user) {
                user.businessId = token.businessId as string;
            }

            if (token.planStatus && user) {
                user.planStatus = token.planStatus as string;
            }

            if (token.isActive !== undefined && user) {
                user.isActive = token.isActive as boolean;
            }

            if (token.themeMode && user) {
                user.themeMode = token.themeMode as ThemeMode;
            }

            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                const extendedUser = user as ExtendedUser;
                token.role = extendedUser.role;
                token.businessId = extendedUser.businessId;
                token.planStatus = extendedUser.planStatus;
                token.isActive = extendedUser.isActive;
                token.themeMode = extendedUser.themeMode;
            }
            return token;
        },
    },
} satisfies NextAuthConfig;
