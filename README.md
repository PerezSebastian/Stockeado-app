# 📦 Stockeado

Stockeado es una plataforma SaaS **SaaS multi-tenant** diseñada para que emprendedores gestionen su stock, ventas y tengan presencia online mediante una landing page, catálogo y sistema de turnos integrado.

> [!NOTE]
> Este proyecto está desarrollado utilizando las últimas tecnologías de Next.js y sigue una arquitectura modular y escalable.

## 🚀 Características Principales

- **Arquitectura Multi-tenant**: Gestión de múltiples negocios en una sola instancia con aislamiento de datos por `businessId`.
- **Landing Pages Dinámicas**: Motor de renderizado automático para catálogos públicos en `/[slug]`.
- **Punto de Venta (POS)**: Interfaz ágil para procesar ventas con actualización atómica de stock.
- **Gestión de Inventario**: CRUD completo con SKU, seguimiento de stock mínimo y trazabilidad de movimientos.
- **Dashboard de Analíticas**: Visualización de ventas, productos destacados y reportes financieros.
- **Autenticación Segura**: Implementada con NextAuth v5 (Auth.js) y roles diferenciados (ADMIN, OWNER, SELLER).

## 🛠️ Stack Tecnológico

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos**: [MySQL](https://www.mysql.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Autenticación**: [Auth.js v5](https://authjs.dev/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **Iconos**: [Lucide React](https://lucide.dev/)
- **Validación**: [Zod](https://zod.dev/) + React Hook Form

## ⚙️ Configuración del Proyecto

### Requisitos Previos

- Node.js 18+
- MySQL Server corriendo localmente o en la nube.
- PNPM (recomendado) o NPM.

### Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/PerezSebastian/Stockeado-app.git
   cd Stockeado-app
   ```

2. Instalar dependencias:
   ```bash
   pnpm install
   ```

3. Configurar variables de entorno:
   Copia el archivo `.env.example` (si existe) o crea uno nuevo con:
   ```env
   DATABASE_URL="mysql://usuario:password@localhost:3306/stock_app_prueba"
   AUTH_SECRET="tu_secreto_aqui"
   ```

4. Generar el cliente de Prisma y ejecutar migraciones:
   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

5. Iniciar el servidor de desarrollo:
   ```bash
   pnpm dev
   ```

## 📂 Estructura de Carpetas

```text
src/
├── actions/      # Server Actions para mutaciones de datos
├── app/          # App Router (Next.js 16)
│   ├── [slug]/   # Landing pages dinámicas de negocios
│   ├── auth/     # Rutas de autenticación
│   └── dashboard/# Panel de administración
├── components/   # Componentes de UI (estructurados por dominio)
├── lib/          # Utilidades compartidas y cliente de BD
├── types/        # Definiciones de tipos TypeScript
└── proxy.ts      # Middleware de red y seguridad (convención Next 16)
```

## 📜 Comandos Disponibles

- `pnpm dev`: Inicia el servidor en modo desarrollo con Turbopack.
- `pnpm build`: Crea la versión de producción optimizada.
- `pnpm start`: Inicia el servidor de producción.
- `pnpm lint`: Ejecuta el análisis estático de código.
- `npx prisma studio`: Abre la interfaz visual para la base de datos.
