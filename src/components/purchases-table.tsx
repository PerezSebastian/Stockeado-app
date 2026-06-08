"use client";

import { Fragment, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Truck, ChevronDown, PackageCheck } from "lucide-react";
import type { SerializedPurchase } from "@/types/purchases";

export function PurchasesTable({ purchases }: { purchases: SerializedPurchase[] }) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    if (!purchases || purchases.length === 0) {
        return (
            <div className="rounded-md border border-border bg-background shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-surface-subtle/50">
                            <TableHead className="text-center w-[50px]"></TableHead>
                            <TableHead className="text-center w-[120px]">Remito</TableHead>
                            <TableHead className="text-center">Fecha y Hora</TableHead>
                            <TableHead className="text-center">Proveedor</TableHead>
                            <TableHead className="text-center">Artículos</TableHead>
                            <TableHead className="text-right">Total Invertido</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                No se encontraron compras registradas.
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="rounded-md border border-border bg-background shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-surface-subtle/50">
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead className="text-center w-[120px]">Remito</TableHead>
                        <TableHead className="text-center">Fecha y Hora</TableHead>
                        <TableHead className="text-center">Proveedor</TableHead>
                        <TableHead className="text-center">Artículos</TableHead>
                        <TableHead className="text-right">Total Invertido</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {purchases.map((purchase) => {
                        const isExpanded = expandedIds.has(purchase.id);
                        const itemCount = purchase.items.reduce((acc, item) => acc + item.quantity, 0);

                        return (
                            <Fragment key={purchase.id}>
                                {/* Fila principal */}
                                <TableRow
                                    className="cursor-pointer hover:bg-surface-subtle/50 transition-colors"
                                    onClick={() => toggleExpand(purchase.id)}
                                >
                                    <TableCell className="text-center w-[50px] px-3">
                                        <ChevronDown
                                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                                                }`}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center font-mono font-bold text-muted-foreground">
                                        #{purchase.id.slice(-6).toUpperCase()}
                                    </TableCell>
                                    <TableCell className="text-center text-muted-foreground text-sm">
                                        {format(new Date(purchase.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center font-medium text-foreground">
                                            <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                                            {purchase.supplierName || <span className="text-muted-foreground italic">No especificado</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-surface-subtle text-foreground hover:bg-surface-subtle">
                                            {itemCount} un.
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-success text-lg">
                                        ${purchase.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>

                                {/* Fila expandible con detalle */}
                                {isExpanded && (
                                    <TableRow className="bg-surface-subtle/80">
                                        <TableCell colSpan={6} className="p-0">
                                            <div className="px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {/* Sub-tabla de productos ingresados */}
                                                <div className="rounded-md border border-border bg-background overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-surface-subtle/60">
                                                                <TableHead className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producto Ingresado</TableHead>
                                                                <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Cantidad</TableHead>
                                                                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">Costo Un.</TableHead>
                                                                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">Costo Total</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {purchase.items.map((item) => (
                                                                <TableRow key={item.id} className="hover:bg-surface-subtle/50">
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <PackageCheck className="h-4 w-4 text-success" />
                                                                            <span className="font-semibold text-foreground">{item.product.name}</span>
                                                                            {item.product.sku && (
                                                                                <span className="ml-1 text-xs text-muted-foreground uppercase tracking-wider">
                                                                                    {item.product.sku}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-center font-medium text-success bg-success/15/30">
                                                                        +{item.quantity}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-muted-foreground">
                                                                        ${item.unitCost.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-semibold text-foreground">
                                                                        ${(item.quantity * item.unitCost).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {/* Fila summary inferior */}
                                                            <TableRow className="border-t-2 border-border bg-surface-subtle/60">
                                                                <TableCell colSpan={3} className="text-right font-semibold text-muted-foreground uppercase text-xs tracking-wider">
                                                                    Total del remito
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold text-success text-lg">
                                                                    ${purchase.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>

                                                {/* Notas del comprobante */}
                                                {purchase.notes && (
                                                    <div className="bg-warning/15 border border-warning/20 rounded-md px-4 py-2.5">
                                                        <span className="text-xs font-semibold text-warning uppercase tracking-wider">Notas de ingreso: </span>
                                                        <span className="text-sm text-warning">{purchase.notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

