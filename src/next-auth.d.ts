import { UserRole, PlanStatus } from "@prisma/client";
import { DefaultSession } from "next-auth";
import "next-auth/jwt";

export type ExtendedUser = DefaultSession["user"] & {
    role: UserRole;
    businessId: string;
    planStatus?: string;
    isActive?: boolean;
};

declare module "next-auth" {
    interface Session {
        user: ExtendedUser;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: UserRole;
        businessId?: string;
        planStatus?: string;
        isActive?: boolean;
    }
}
