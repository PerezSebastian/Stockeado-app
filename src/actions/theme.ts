"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const updateThemeModeSchema = z.enum(["LIGHT", "DARK"]);

export async function updateThemeMode(themeMode: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { error: "No autorizado" };
    }

    const parsedThemeMode = updateThemeModeSchema.safeParse(themeMode);

    if (!parsedThemeMode.success) {
      return { error: "Tema invalido" };
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { themeMode: parsedThemeMode.data },
    });

    revalidatePath("/", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/appearance");

    return {
      success: "Tema actualizado correctamente",
      themeMode: parsedThemeMode.data,
    };
  } catch (error) {
    console.error("[UPDATE_THEME_MODE]", error);
    return { error: "Error al actualizar el tema" };
  }
}
