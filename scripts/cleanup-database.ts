import { db } from "../src/lib/db";

async function main() {
  console.log("🚀 Iniciando limpieza de base de datos...");

  // 1. Obtener la lista de usuarios activos para saber cuáles dejar
  const activeUsers = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, email: true, businessId: true },
  });

  console.log("Usuarios activos detectados que se van a CONSERVAR:");
  activeUsers.forEach((u) => {
    console.log(`- Usuario ID: ${u.id} | Email: ${u.email} | Business ID: ${u.businessId}`);
  });

  const activeUserIds = activeUsers.map((u) => u.id);
  const activeBusinessIds = activeUsers
    .map((u) => u.businessId)
    .filter((id): id is string => !!id);

  console.log(`IDs de negocios activos a conservar: ${JSON.stringify(activeBusinessIds)}`);

  // 2. Limpiar todas las tablas relacionadas con el asistente por completo (usando PascalCase de schema.prisma original)
  console.log("🧹 Limpiando tablas de asistente por completo...");
  const deleteMessages = await db.assistantMessage.deleteMany({});
  const deletePendingActions = await db.assistantPendingAction.deleteMany({});
  const deleteAuditLogs = await db.assistantAuditLog.deleteMany({});
  const deleteConversations = await db.assistantConversation.deleteMany({});

  console.log(`- Mensajes de asistente eliminados: ${deleteMessages.count}`);
  console.log(`- Acciones pendientes de asistente eliminadas: ${deletePendingActions.count}`);
  console.log(`- Logs de auditoría de asistente eliminados: ${deleteAuditLogs.count}`);
  console.log(`- Conversaciones de asistente eliminadas: ${deleteConversations.count}`);

  // 3. Obtener los IDs de negocios que vamos a eliminar
  const businessesToDelete = await db.business.findMany({
    where: {
      id: { notIn: activeBusinessIds },
    },
    select: { id: true },
  });
  const businessIdsToDelete = businessesToDelete.map((b) => b.id);

  console.log(`Encontrados ${businessIdsToDelete.length} negocios para eliminar.`);

  if (businessIdsToDelete.length > 0) {
    console.log("🧹 Eliminando registros dependientes de los negocios que se van a borrar...");
    
    // Eliminamos los saleitems asociados a ventas de estos negocios
    const deleteSaleItems = await db.saleItem.deleteMany({
      where: {
        sale: {
          businessId: { in: businessIdsToDelete },
        },
      },
    });
    console.log(`- SaleItems eliminados: ${deleteSaleItems.count}`);

    // Eliminamos los purchaseitems asociados a compras de estos negocios
    const deletePurchaseItems = await db.purchaseItem.deleteMany({
      where: {
        purchase: {
          businessId: { in: businessIdsToDelete },
        },
      },
    });
    console.log(`- PurchaseItems eliminados: ${deletePurchaseItems.count}`);

    // Eliminamos los stockmovements asociados a estos negocios o a productos de estos negocios
    const deleteStockMovements = await db.stockMovement.deleteMany({
      where: {
        businessId: { in: businessIdsToDelete },
      },
    });
    console.log(`- StockMovements eliminados: ${deleteStockMovements.count}`);
  }

  // 4. Eliminar usuarios inactivos
  console.log("🧹 Eliminando usuarios que no están marcados como activos...");
  const deleteUsersResult = await db.user.deleteMany({
    where: {
      id: { notIn: activeUserIds },
    },
  });
  console.log(`- Usuarios eliminados: ${deleteUsersResult.count}`);

  // 5. Eliminar negocios que no están asociados a los usuarios activos conservados
  console.log("🧹 Eliminando negocios que no pertenecen a los usuarios activos...");
  const deleteBusinessesResult = await db.business.deleteMany({
    where: {
      id: { notIn: activeBusinessIds },
    },
  });
  console.log(`- Negocios eliminados: ${deleteBusinessesResult.count}`);

  // 6. Mostrar resumen final de lo que quedó
  const remainingUsers = await db.user.findMany({
    include: { business: true },
  });
  const remainingBusinesses = await db.business.findMany({});

  console.log("\n=================================");
  console.log("✨ RESUMEN DE NEGOCIOS QUE QUEDARON:");
  remainingBusinesses.forEach((b) => {
    console.log(`- Negocio: ${b.name} (${b.slug}) | ID: ${b.id}`);
  });

  console.log("\n✨ RESUMEN DE USUARIOS QUE QUEDARON:");
  remainingUsers.forEach((u) => {
    console.log(`- Usuario: ${u.email} | Rol: ${u.role} | Negocio: ${u.business?.name || "Sin negocio"}`);
  });
  console.log("=================================");
  console.log("✅ Limpieza completada con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando la limpieza:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
