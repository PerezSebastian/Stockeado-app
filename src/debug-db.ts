import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: {
            business: true,
        },
    });

    console.log("USERS AND BUSINESSES:");
    users.forEach((u) => {
        console.log(`- User: ${u.email}, Business: ${u.business.name} (ID: ${u.business.id}), Role: ${u.role}`);
    });

    const businesses = await prisma.business.findMany();
    console.log("\nALL BUSINESSES:");
    businesses.forEach((b) => {
        console.log(`- Business: ${b.name} (ID: ${b.id}), Status: ${b.planStatus}`);
    });
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
