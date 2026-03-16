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
            <div className="rounded-md border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/50">
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
                            <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                                No se encontraron compras registradas.
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="rounded-md border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-zinc-50/50">
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
                                    className="cursor-pointer hover:bg-zinc-50/50 transition-colors"
                                    onClick={() => toggleExpand(purchase.id)}
                                >
                                    <TableCell className="text-center w-[50px] px-3">
                                        <ChevronDown
                                            className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                                                }`}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center font-mono font-bold text-zinc-600">
                                        #{purchase.id.slice(-6).toUpperCase()}
                                    </TableCell>
                                    <TableCell className="text-center text-zinc-500 text-sm">
                                        {format(new Date(purchase.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center font-medium text-zinc-700">
                                            <Truck className="h-4 w-4 mr-2 text-zinc-400" />
                                            {purchase.supplierName || <span className="text-zinc-400 italic">No especificado</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                                            {itemCount} un.
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-emerald-600 text-lg">
                                        ${purchase.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>

                                {/* Fila expandible con detalle */}
                                {isExpanded && (
                                    <TableRow className="bg-zinc-50/80">
                                        <TableCell colSpan={6} className="p-0">
                                            <div className="px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {/* Sub-tabla de productos ingresados */}
                                                <div className="rounded-md border border-zinc-200 bg-white overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-zinc-100/60">
                                                                <TableHead className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Producto Ingresado</TableHead>
                                                                <TableHead className="text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider w-[100px]">Cantidad</TableHead>
                                                                <TableHead className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider w-[130px]">Costo Un.</TableHead>
                                                                <TableHead className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider w-[130px]">Costo Total</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {purchase.items.map((item) => (
                                                                <TableRow key={item.id} className="hover:bg-zinc-50/50">
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <PackageCheck className="h-4 w-4 text-emerald-500" />
                                                                            <span className="font-semibold text-zinc-900">{item.product.name}</span>
                                                                            {item.product.sku && (
                                                                                <span className="ml-1 text-xs text-zinc-400 uppercase tracking-wider">
                                                                                    {item.product.sku}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-center font-medium text-emerald-700 bg-emerald-50/30">
                                                                        +{item.quantity}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-zinc-600">
                                                                        ${item.unitCost.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-semibold text-zinc-900">
                                                                        ${(item.quantity * item.unitCost).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {/* Fila summary inferior */}
                                                            <TableRow className="border-t-2 border-zinc-200 bg-zinc-50/60">
                                                                <TableCell colSpan={3} className="text-right font-semibold text-zinc-500 uppercase text-xs tracking-wider">
                                                                    Total del remito
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold text-emerald-600 text-lg">
                                                                    ${purchase.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>

                                                {/* Notas del comprobante */}
                                                {purchase.notes && (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5">
                                                        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Notas de ingreso: </span>
                                                        <span className="text-sm text-amber-800">{purchase.notes}</span>
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
