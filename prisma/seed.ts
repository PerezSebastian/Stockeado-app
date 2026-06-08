import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
    const adminEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
    const adminPassword = process.env.MASTER_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        throw new Error(
            "❌ ERROR: Las variables de entorno NEXT_PUBLIC_MASTER_ADMIN_EMAIL y MASTER_ADMIN_PASSWORD deben estar definidas en tu archivo .env"
        );
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const crypto = await import("crypto");
    const masterApiKey = "sk_" + crypto.randomUUID().replace(/-/g, "");

    // 1. Create a Business
    const business = await db.business.upsert({
        where: { slug: "admin-shop" },
        update: {},
        create: {
            name: "Admin Shop",
            slug: "admin-shop",
            apiKey: masterApiKey,
        },
    });

    // 2. Create the Admin User associated with the Business
    const admin = await db.user.upsert({
        where: { email: adminEmail },
        update: {
            password: hashedPassword,
            role: "ADMIN",
            businessId: business.id,
        },
        create: {
            email: adminEmail,
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
