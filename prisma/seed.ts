import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // 1. Create a Business
    const business = await db.business.upsert({
        where: { slug: "admin-shop" },
        update: {},
        create: {
            name: "Admin Shop",
            slug: "admin-shop",
        },
    });

    // 2. Create the Admin User associated with the Business
    const admin = await db.user.upsert({
        where: { email: "admin@galape.com" },
        update: {
            password: hashedPassword,
            role: "ADMIN",
            businessId: business.id,
        },
        create: {
            email: "admin@galape.com",
            password: hashedPassword,
            role: "ADMIN",
            businessId: business.id,
        },
    });

    console.log("✅ Database seeded successfully!");
    console.log(`User: ${admin.email}`);
    console.log(`Business: ${business.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
