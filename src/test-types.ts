import { Prisma } from "@prisma/client";

const data: Prisma.UserUpdateInput = {
    isActive: true
};

console.log("TypeScript test success:", data);
