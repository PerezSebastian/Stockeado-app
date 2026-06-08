import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-surface-subtle px-6 font-sans">
            <div className="flex flex-col items-center max-w-md text-center">
                {/* Icon Container */}
                <div className="relative flex items-center justify-center w-24 h-24 mb-8 group">
                    <div className="absolute inset-0 bg-danger-soft rounded-full blur-xl scale-150 transition-transform duration-1000 group-hover:scale-125 opacity-50"></div>
                    <div className="relative flex items-center justify-center w-full h-full bg-background border border-border shadow-sm rounded-3xl rotate-12 transition-transform duration-500 group-hover:rotate-0">
                        <SearchX className="w-10 h-10 text-muted-foreground" />
                    </div>
                </div>

                <h1 className="text-6xl font-black tracking-tighter text-foreground mb-2">
                    404
                </h1>
                
                <h2 className="text-2xl font-bold text-foreground mb-4 tracking-tight">
                    Página no encontrada
                </h2>
                
                <p className="text-muted-foreground mb-8 leading-relaxed text-sm md:text-base">
                    Ups... parece que te has perdido. La ruta a la que intentas acceder no existe, ha sido movida o está en construcción.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <Link 
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Volver al Panel
                    </Link>
                </div>
            </div>

            {/* Subtle branding pattern/footer */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center opacity-30 pointer-events-none select-none">
                <span className="text-xl font-black tracking-tighter text-muted-foreground">Stockeado</span>
            </div>
        </div>
    );
}

