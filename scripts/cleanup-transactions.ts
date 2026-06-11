import { db } from "../src/lib/db";

async function main() {
  console.log("🚀 Iniciando limpieza de historial para 'Estacion 927'...");

  // 1. Encontrar el negocio de Estacion 927
  const business = await db.business.findUnique({
    where: { slug: "estacion-927" },
  });

  if (!business) {
    console.error("❌ ERROR: No se encontró el negocio con slug 'estacion927'. Verificá el slug en la base de datos.");
    process.exit(1);
  }

  console.log(`Negocio encontrado: ${business.name} | ID: ${business.id}`);

  // 2. Limpiar transacciones asociadas a este negocio
  // IMPORTANTE: NO TOCAR PRODUCTS, CATEGORIES, PRODUCTCATALOG, CATALOGATTRIBUTE, CATALOGATTRIBUTEVALUE, CATALOGATTRIBUTEOPTION.
  
  console.log("🧹 Limpiando historial transaccional de 'Estacion 927'...");

  // 2.a Eliminar SaleItems asociados a las ventas de este negocio
  const deleteSaleItems = await db.saleItem.deleteMany({
    where: {
      sale: {
        businessId: business.id,
      },
    },
  });
  console.log(`- SaleItems eliminados: ${deleteSaleItems.count}`);

  // 2.b Eliminar Sales de este negocio
  const deleteSales = await db.sale.deleteMany({
    where: {
      businessId: business.id,
    },
  });
  console.log(`- Sales (Ventas) eliminadas: ${deleteSales.count}`);

  // 2.c Eliminar PurchaseItems asociados a las compras de este negocio
  const deletePurchaseItems = await db.purchaseItem.deleteMany({
    where: {
      purchase: {
        businessId: business.id,
      },
    },
  });
  console.log(`- PurchaseItems eliminados: ${deletePurchaseItems.count}`);

  // 2.d Eliminar Purchases (Compras) de este negocio
  const deletePurchases = await db.purchase.deleteMany({
    where: {
      businessId: business.id,
    },
  });
  console.log(`- Purchases (Compras) eliminadas: ${deletePurchases.count}`);

  // 2.e Eliminar StockMovements de este negocio
  const deleteStockMovements = await db.stockMovement.deleteMany({
    where: {
      businessId: business.id,
    },
  });
  console.log(`- StockMovements (Movimientos de stock) eliminados: ${deleteStockMovements.count}`);

  // 2.f Eliminar Bookings (Reservas) de este negocio
  const deleteBookings = await db.booking.deleteMany({
    where: {
      businessId: business.id,
    },
  });
  console.log(`- Bookings (Reservas) eliminadas: ${deleteBookings.count}`);

  // 2.g Eliminar FixedExpenses (Gastos Fijos) de este negocio
  const deleteExpenses = await db.fixedExpense.deleteMany({
    where: {
      businessId: business.id,
    },
  });
  console.log(`- FixedExpenses (Gastos fijos) eliminados: ${deleteExpenses.count}`);

  // 3. Resetear el stock de todos los productos del negocio a 0 (ya que no hay movimientos)
  console.log("🔄 Reseteando stock de productos a 0...");
  const resetStock = await db.product.updateMany({
    where: {
      businessId: business.id,
    },
    data: {
      stock: 0,
    },
  });
  console.log(`- Stock reseteado a 0 en ${resetStock.count} productos.`);

  // 4. Resumen de control
  const productsCount = await db.product.count({
    where: { businessId: business.id },
  });
  const categoriesCount = await db.category.count({
    where: { businessId: business.id },
  });
  const catalogsCount = await db.productCatalog.count({
    where: { businessId: business.id },
  });

  console.log("\n=================================");
  console.log("✨ CONTROL DE INTEGRIDAD (NO TOCADOS):");
  console.log(`- Productos intactos en base de datos: ${productsCount}`);
  console.log(`- Categorías intactas: ${categoriesCount}`);
  console.log(`- Catálogos de productos intactos: ${catalogsCount}`);
  console.log("=================================");
  console.log("✅ Historial de transacciones de 'Estacion 927' limpiado con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando la limpieza de transacciones:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
