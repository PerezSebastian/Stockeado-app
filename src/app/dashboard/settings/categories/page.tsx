import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCategories } from "@/actions/categories";
import { CategoryList } from "./category-list";

export default async function SettingsCategoriesPage() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/auth/login");

  const result = await getCategories();

  if (result.error) {
    return <div className="rounded-2xl border border-danger-soft-foreground/20 bg-danger-soft p-6 text-danger-soft-foreground">{result.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Categorias</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona las categorias de tus productos y gastos fijos para un mejor orden y reportes
          precisos.
        </p>
      </div>

      <CategoryList initialCategories={result.categories || []} />
    </div>
  );
}
