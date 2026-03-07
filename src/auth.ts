import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import authConfig from "./auth.config";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    debug: true,
    adapter: PrismaAdapter(db),
    session: { strategy: "jwt" },
    pages: {
        signIn: "/auth/login",
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                const validatedFields = loginSchema.safeParse(credentials);

                if (validatedFields.success) {
                    const { email, password } = validatedFields.data;

                    const user = await db.user.findUnique({
                        where: { email },
                        include: { business: true },
                    });

                    if (!user || !user.password) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (!passwordsMatch) return null;

                    // Check if user account is active
                    if (!user.isActive) {
                        return null; // Account disabled
                    }

                    // Check if user's business plan is active
                    if (user.business?.planStatus === "INACTIVE") {
                        return null; // Logical deletion of business
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        businessId: user.businessId,
                        planStatus: user.business.planStatus,
                        isActive: user.isActive,
                    };
                }

                return null;
            },
        }),
    ],
});
