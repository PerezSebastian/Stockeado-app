const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const res = await prisma.productCatalog.updateMany({
        where: { isDeleted: false },
        data: { isPublic: true }
    });
    console.log("✅ Se actualizaron a públicos los productos del catálogo. Cantidad:", res.count);
}

main()
    .catch((err) => {
        console.error("❌ Error al actualizar catálogo:", err);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
