"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AttributeType } from "@prisma/client";
import { deleteImageFromCloudinary } from "@/lib/cloudinary";

// Helper de Formateo de Texto para Atributos TEXT
function formatTextValue(val: string): string {
    let trimmed = val.trim();
    if (trimmed.length === 0) return "";
    
    // Asegurar primera letra en Mayúscula
    trimmed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    
    // Asegurar punto final (.)
    if (!trimmed.endsWith(".")) {
        trimmed += ".";
    }
    return trimmed;
}

const AttributeSchema = z.object({
    name: z.string().min(1, "El nombre es requerido").max(100, "El nombre es demasiado largo"),
    type: z.nativeEnum(AttributeType),
    isList: z.boolean().default(false),
    options: z.array(z.string()).optional(),
});

// 1. Obtener productos del catálogo con autocuración
export async function getCatalogProducts(query?: string, isPublicFilter?: boolean, page: number = 1, limit: number = 10, categoryId?: string) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado o sin negocio vinculado" };
    }
    const businessId = session.user.businessId;

    try {
        // ── AUTOCURACIÓN: Crear ProductCatalog para productos existentes que no lo tengan ──
        const activeProducts = await db.product.findMany({
            where: {
                businessId,
                catalog: null,
            },
            select: { id: true, isDeleted: true }
        });

        if (activeProducts.length > 0) {
            await db.$transaction(
                activeProducts.map((p) =>
                    db.productCatalog.create({
                        data: {
                            productId: p.id,
                            businessId,
                            isDeleted: p.isDeleted,
                            isPublic: !p.isDeleted,
                        }
                    })
                )
            );
        }

        const skip = (page - 1) * limit;

        const whereClause: any = {
            businessId,
        };

        if (isPublicFilter !== undefined) {
            whereClause.isPublic = isPublicFilter;
        }

        if (categoryId && categoryId !== "all") {
            whereClause.product = {
                ...whereClause.product,
                categoryId: categoryId,
            };
        }

        if (query) {
            whereClause.product = {
                ...whereClause.product,
                OR: [
                    { name: { contains: query } },
                    { sku: { contains: query } },
                ]
            };
        }

        const [totalCount, rawCatalogs] = await db.$transaction([
            db.productCatalog.count({ where: whereClause }),
            db.productCatalog.findMany({
                where: whereClause,
                include: {
                    product: {
                        include: {
                            categoryRel: { select: { name: true } }
                        }
                    },
                    values: {
                        include: {
                            attribute: true,
                            option: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
                skip,
                take: limit,
            })
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        // Mapear los datos para consumo más fácil
        const catalogs = rawCatalogs.map(c => {
            // Mapear valores actuales
            const mappedValues = c.values.map(val => ({
                id: val.id,
                attributeId: val.attributeId,
                attributeName: val.attribute.name,
                type: val.attribute.type,
                isList: val.attribute.isList,
                value: val.value,
                optionId: val.optionId,
                optionValue: val.option?.value ?? null,
            }));

            return {
                id: c.id,
                productId: c.productId,
                isPublic: c.isPublic,
                isDeleted: c.isDeleted,
                productName: c.product.name,
                productSku: c.product.sku,
                productPrice: Number(c.product.price),
                categoryName: c.product.categoryRel?.name ?? c.product.category ?? "Sin categoría",
                values: mappedValues,
            };
        });

        return { catalogs, totalCount, totalPages };
    } catch (error) {
        console.error("GET_CATALOG_PRODUCTS_ERROR", error);
        return { error: "Error al obtener los productos del catálogo" };
    }
}

// 2. Cambiar visibilidad del producto en catálogo
export async function toggleCatalogProductVisibility(catalogId: string, isPublic: boolean) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }
    const businessId = session.user.businessId;

    try {
        const catalog = await db.productCatalog.findFirst({
            where: { id: catalogId, businessId }
        });

        if (!catalog) {
            return { error: "Producto de catálogo no encontrado" };
        }

        if (catalog.isDeleted) {
            return { error: "No se puede publicar un producto dado de baja en el inventario." };
        }

        await db.productCatalog.update({
            where: { id: catalogId },
            data: { isPublic }
        });

        revalidatePath("/dashboard/catalog");
        return { success: `Producto ${isPublic ? "publicado" : "ocultado"} con éxito` };
    } catch (error) {
        console.error("TOGGLE_VISIBILITY_ERROR", error);
        return { error: "Error al cambiar la visibilidad" };
    }
}

// 3. Obtener atributos personalizados del negocio
export async function getCatalogAttributes() {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }
    const businessId = session.user.businessId;

    try {
        const attributes = await db.catalogAttribute.findMany({
            where: { businessId },
            include: {
                options: {
                    orderBy: { value: "asc" }
                }
            },
            orderBy: { name: "asc" }
        });

        return { attributes };
    } catch (error) {
        console.error("GET_ATTRIBUTES_ERROR", error);
        return { error: "Error al obtener los atributos" };
    }
}

// 4. Crear un atributo de catálogo nuevo
export async function createCatalogAttribute(values: z.infer<typeof AttributeSchema>) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }
    const businessId = session.user.businessId;

    const validatedFields = AttributeSchema.safeParse(values);
    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0]?.message ?? "Campos inválidos" };
    }

    const { name, type, isList, options } = validatedFields.data;

    try {
        // Validar nombre único
        const conflict = await db.catalogAttribute.findFirst({
            where: { businessId, name: name.trim() }
        });
        if (conflict) {
            return { error: `Ya existe un atributo con el nombre "${name.trim()}"` };
        }

        const attribute = await db.$transaction(async (tx) => {
            const newAttr = await tx.catalogAttribute.create({
                data: {
                    name: name.trim(),
                    type,
                    isList,
                    businessId,
                }
            });

            if (type === AttributeType.CHOICE && options && options.length > 0) {
                const uniqueOptions = Array.from(new Set(options.map(o => o.trim()).filter(o => o !== "")));
                await tx.catalogAttributeOption.createMany({
                    data: uniqueOptions.map(opt => ({
                        attributeId: newAttr.id,
                        value: opt
                    }))
                });
            }

            return newAttr;
        });

        revalidatePath("/dashboard/catalog");
        return { success: "Atributo creado con éxito", attribute };
    } catch (error) {
        console.error("CREATE_ATTRIBUTE_ERROR", error);
        return { error: "Error al crear el atributo" };
    }
}

// 4.5. Editar un atributo de catálogo
export async function updateCatalogAttribute(
    id: string,
    values: {
        name: string;
        type: AttributeType;
        isList: boolean;
        options?: string[];
    }
) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }
    const businessId = session.user.businessId;

    try {
        const attr = await db.catalogAttribute.findFirst({
            where: { id, businessId },
            include: { options: true }
        });

        if (!attr) {
            return { error: "Atributo no encontrado" };
        }

        const nameTrimmed = values.name.trim();

        // Validar nombre único (excluyendo el actual)
        const conflict = await db.catalogAttribute.findFirst({
            where: {
                businessId,
                name: nameTrimmed,
                NOT: { id }
            }
        });
        if (conflict) {
            return { error: `Ya existe otro atributo con el nombre "${nameTrimmed}"` };
        }

        await db.$transaction(async (tx) => {
            // 1. Si cambia el tipo, purgamos absolutamente todo
            if (attr.type !== values.type) {
                if (attr.type === AttributeType.IMAGE) {
                    const oldValues = await tx.catalogAttributeValue.findMany({
                        where: { attributeId: id }
                    });
                    for (const val of oldValues) {
                        if (val.value) {
                            await deleteImageFromCloudinary(val.value);
                        }
                    }
                }
                await tx.catalogAttributeValue.deleteMany({
                    where: { attributeId: id }
                });
            }
            // 2. Si NO cambia el tipo, pero cambia de Lista a No-Lista (mantener solo el primer elemento)
            else if (attr.isList === true && values.isList === false) {
                const allProductValues = await tx.catalogAttributeValue.findMany({
                    where: { attributeId: id },
                    orderBy: { createdAt: "asc" }
                });

                const valuesByProduct: Record<string, typeof allProductValues> = {};
                for (const val of allProductValues) {
                    if (!valuesByProduct[val.productCatalogId]) {
                        valuesByProduct[val.productCatalogId] = [];
                    }
                    valuesByProduct[val.productCatalogId].push(val);
                }

                const idsToDelete: string[] = [];
                const imageUrlsToDelete: string[] = [];

                for (const [_, vals] of Object.entries(valuesByProduct)) {
                    if (vals.length > 1) {
                        const toDelete = vals.slice(1);
                        for (const v of toDelete) {
                            idsToDelete.push(v.id);
                            if (attr.type === AttributeType.IMAGE && v.value) {
                                imageUrlsToDelete.push(v.value);
                            }
                        }
                    }
                }

                if (idsToDelete.length > 0) {
                    for (const url of imageUrlsToDelete) {
                        await deleteImageFromCloudinary(url);
                    }
                    await tx.catalogAttributeValue.deleteMany({
                        where: { id: { in: idsToDelete } }
                    });
                }
            }

            // Actualizar datos del atributo
            await tx.catalogAttribute.update({
                where: { id },
                data: {
                    name: nameTrimmed,
                    type: values.type,
                    isList: values.isList,
                }
            });

            // Manejar opciones si es tipo CHOICE
            if (values.type === "CHOICE" && values.options) {
                const newOptionValues = Array.from(new Set(values.options.map(o => o.trim()).filter(Boolean)));
                const existingOptions = attr.options;
                const existingOptionValues = existingOptions.map(o => o.value);

                const optionsToCreate = newOptionValues.filter(v => !existingOptionValues.includes(v));
                const optionsToDelete = existingOptions.filter(o => !newOptionValues.includes(o.value));

                if (optionsToDelete.length > 0) {
                    // Limpiar valores del catálogo que usaban estas opciones borradas
                    await tx.catalogAttributeValue.deleteMany({
                        where: {
                            optionId: { in: optionsToDelete.map(o => o.id) }
                        }
                    });

                    // Eliminar las opciones físicas
                    await tx.catalogAttributeOption.deleteMany({
                        where: {
                            id: { in: optionsToDelete.map(o => o.id) }
                        }
                    });
                }

                if (optionsToCreate.length > 0) {
                    await tx.catalogAttributeOption.createMany({
                        data: optionsToCreate.map(val => ({
                            attributeId: id,
                            value: val
                        }))
                    });
                }
            } else {
                // Si el atributo ya no es CHOICE, borrar todas sus opciones
                await tx.catalogAttributeOption.deleteMany({
                    where: { attributeId: id }
                });
            }
        });

        revalidatePath("/dashboard/catalog");
        return { success: "Atributo actualizado con éxito" };
    } catch (error) {
        console.error("UPDATE_ATTRIBUTE_ERROR", error);
        return { error: "Error al actualizar el atributo" };
    }
}


// 5. Eliminar un atributo de catálogo
export async function deleteCatalogAttribute(id: string) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }
    const businessId = session.user.businessId;

    try {
        const attr = await db.catalogAttribute.findFirst({
            where: { id, businessId },
            include: { values: true }
        });
        if (!attr) {
            return { error: "Atributo no encontrado" };
        }

        // Si es tipo IMAGE, borrar las imágenes de Cloudinary
        if (attr.type === AttributeType.IMAGE) {
            for (const val of attr.values) {
                if (val.value) {
                    await deleteImageFromCloudinary(val.value);
                }
            }
        }

        await db.catalogAttribute.delete({
            where: { id }
        });

        revalidatePath("/dashboard/catalog");
        return { success: "Atributo eliminado con éxito" };
    } catch (error) {
        console.error("DELETE_ATTRIBUTE_ERROR", error);
        return { error: "Error al eliminar el atributo" };
    }
}

// 6. Guardar/Actualizar los valores de atributos para un producto del catálogo
export async function updateCatalogProductValues(productCatalogId: string, valuesMap: Record<string, any>) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }
    const businessId = session.user.businessId;

    try {
        // Validar que el catálogo pertenece al negocio
        const catalog = await db.productCatalog.findFirst({
            where: { id: productCatalogId, businessId }
        });
        if (!catalog) {
            return { error: "Producto de catálogo no encontrado" };
        }

        // 1. Capa de Validación Previa en Memoria
        // Validamos tipos, longitudes y opciones antes de abrir cualquier transacción.
        const validatedValues: Array<{
            attributeId: string;
            valueStr: string | null;
            optionId: string | null;
        }> = [];

        for (const [attributeId, rawValue] of Object.entries(valuesMap)) {
            const attr = await db.catalogAttribute.findFirst({
                where: { id: attributeId, businessId },
                include: { options: true }
            });

            if (!attr) continue;

            // Si el valor es nulo, vacío o array vacío, omitimos (equivale a limpiar el valor)
            if (rawValue === null || rawValue === undefined || rawValue === "") continue;
            if (Array.isArray(rawValue) && rawValue.length === 0) continue;

            const valuesArray = Array.isArray(rawValue) ? rawValue : [rawValue];

            for (let val of valuesArray) {
                if (val === null || val === undefined || String(val).trim() === "") continue;

                let valueStr: string | null = String(val).trim();
                let optionId: string | null = null;

                if (attr.type === AttributeType.TEXT) {
                    valueStr = formatTextValue(valueStr);
                    // Validar longitud razonable del texto
                    if (valueStr.length > 5000) {
                        return { error: `El valor para el atributo "${attr.name}" es demasiado largo (máximo 5000 caracteres).` };
                    }
                } else if (attr.type === AttributeType.CHOICE) {
                    // Validar que el ID de la opción elegida exista para este atributo
                    const optionExists = attr.options.some(opt => opt.id === valueStr);
                    if (!optionExists) {
                        return { error: `La opción seleccionada para el atributo "${attr.name}" no es válida.` };
                    }
                    optionId = valueStr;
                    valueStr = null;
                } else if (attr.type === AttributeType.NUMBER) {
                    const parsedNum = Number(valueStr);
                    if (isNaN(parsedNum)) {
                        return { error: `El valor para "${attr.name}" debe ser un número válido.` };
                    }
                    if (parsedNum > 1000000000 || parsedNum < -1000000000) {
                        return { error: `El número para "${attr.name}" está fuera del rango permitido.` };
                    }
                } else if (attr.type === AttributeType.BOOLEAN) {
                    valueStr = (String(val) === "true" || val === true) ? "true" : "false";
                } else if (attr.type === AttributeType.IMAGE) {
                    // Validar formato de URL o base64 (por si acaso)
                    if (!valueStr.startsWith("http://") && !valueStr.startsWith("https://") && !valueStr.startsWith("data:image/")) {
                        return { error: `El valor para el atributo de imagen "${attr.name}" no es válido.` };
                    }
                }

                validatedValues.push({
                    attributeId,
                    valueStr,
                    optionId
                });
            }
        }

        // 2. Ejecución de la Transacción Limpia
        await db.$transaction(async (tx) => {
            // Borrar los valores anteriores únicamente de los atributos recibidos en el mapa
            const attributeIdsToClear = Object.keys(valuesMap);

            // Buscar valores anteriores de tipo IMAGE
            const oldValues = await tx.catalogAttributeValue.findMany({
                where: {
                    productCatalogId,
                    attributeId: { in: attributeIdsToClear },
                    attribute: { type: AttributeType.IMAGE }
                }
            });

            // Filtrar las imágenes que ya no están presentes en los nuevos valores
            const newImageUrls = new Set(
                validatedValues
                    .filter(item => item.valueStr)
                    .map(item => item.valueStr as string)
            );

            const imagesToDelete = oldValues.filter(val => val.value && !newImageUrls.has(val.value));

            // Borrar de Cloudinary solo las que realmente se removieron
            for (const val of imagesToDelete) {
                if (val.value) {
                    await deleteImageFromCloudinary(val.value);
                }
            }

            await tx.catalogAttributeValue.deleteMany({
                where: {
                    productCatalogId,
                    attributeId: { in: attributeIdsToClear }
                }
            });

            // Crear los nuevos registros pre-validados
            for (const item of validatedValues) {
                await tx.catalogAttributeValue.create({
                    data: {
                        productCatalogId,
                        attributeId: item.attributeId,
                        value: item.valueStr,
                        optionId: item.optionId,
                    }
                });
            }
        });

        revalidatePath("/dashboard/catalog");
        return { success: "Valores actualizados con éxito" };
    } catch (error) {
        console.error("UPDATE_VALUES_ERROR", error);
        return { error: "Error al actualizar los valores de atributos" };
    }
}
