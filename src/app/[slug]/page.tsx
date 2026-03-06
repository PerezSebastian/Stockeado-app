export default async function TenantPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const resolvedParams = await params;

    // Mock data para propósitos UI de Landing Page
    const business = {
        name: "La Cafetería",
        slug: resolvedParams.slug,
        products: [
            { id: 1, name: "Café de Especialidad 250g", price: 4500, label: "Destacado" },
            { id: 2, name: "Taza de Cerámica", price: 6500, label: null },
            { id: 3, name: "Blend de la Casa 500g", price: 8900, label: "Más Vendido" },
            { id: 4, name: "Filtro V60", price: 2100, label: null },
        ]
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Premium Header */}
            <header className="bg-white border-b border-zinc-200 sticky top-0 z-10 shadow-sm backdrop-blur-md bg-white/70">
                <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                            {business.name.charAt(0)}
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-zinc-900">{business.name}</h1>
                    </div>
                    <nav className="hidden sm:flex gap-6">
                        <a href="#" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Catálogo</a>
                        <a href="#" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Turnos</a>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative px-6 py-20 bg-gradient-to-br from-zinc-100 to-zinc-200/50">
                <div className="relative max-w-5xl mx-auto flex flex-col items-center text-center space-y-6">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-zinc-900 max-w-3xl">
                        Bienvenido al catálogo digital de {business.name}
                    </h2>
                    <p className="text-lg md:text-xl text-zinc-600 max-w-xl font-medium">
                        Explora nuestros productos y descubre lo mejor que tenemos para ofrecerte.
                    </p>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-50 to-transparent"></div>
            </section>

            {/* Catalog */}
            <main className="max-w-5xl mx-auto px-6 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold tracking-tight text-zinc-900">Productos Destacados</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {business.products.map(product => (
                        <div key={product.id} className="group relative bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-zinc-300 flex flex-col justify-between">
                            <div className="aspect-square bg-zinc-100 flex items-center justify-center p-6 relative">
                                {product.label && (
                                    <span className="absolute top-3 right-3 bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded-full tracking-wider uppercase">
                                        {product.label}
                                    </span>
                                )}
                                {/* Placeholder Image */}
                                <span className="text-zinc-300 text-4xl">☕</span>
                            </div>
                            <div className="p-5 flex flex-col gap-1">
                                <h4 className="font-semibold text-zinc-800 line-clamp-2">{product.name}</h4>
                                <p className="font-black text-xl text-zinc-900 mt-2">${product.price.toLocaleString('es-AR')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-zinc-200 py-12 mt-12">
                <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-zinc-500 font-medium">
                    <p>&copy; {new Date().getFullYear()} {business.name}. Todos los derechos reservados.</p>
                    <p>Potenciado por Galape App</p>
                </div>
            </footer>
        </div>
    );
}
