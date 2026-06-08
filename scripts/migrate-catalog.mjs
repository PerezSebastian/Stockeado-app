import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando migración de productos al catálogo...");
  
  // Buscar todos los productos que no tienen catálogo asociado
  const productsWithoutCatalog = await prisma.product.findMany({
    where: {
      catalog: null
    }
  });
  
  console.log(`Se encontraron ${productsWithoutCatalog.length} productos sin registro en el catálogo.`);
  
  if (productsWithoutCatalog.length === 0) {
    console.log("Todos los productos ya tienen catálogo. Finalizando.");
    return;
  }
  
  let count = 0;
  // Insertar en lotes o uno a uno
  for (const product of productsWithoutCatalog) {
    await prisma.productCatalog.create({
      data: {
        productId: product.id,
        businessId: product.businessId,
        isDeleted: product.isDeleted,
        isPublic: false // Por defecto falso para todos los existentes
      }
    });
    count++;
  }
  
  console.log(`Migración completada con éxito. Se crearon ${count} registros de catálogo.`);
}

main()
  .catch((e) => {
    console.error("Error durante la migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
