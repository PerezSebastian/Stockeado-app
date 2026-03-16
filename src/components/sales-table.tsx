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
import { CreditCard, Banknote, Landmark, Smartphone, ChevronDown } from "lucide-react";
import type { SerializedSale } from "@/types/sales";

const PaymentIcon = ({ method }: { method: string }) => {
    switch (method) {
        case "Efectivo":
            return <Banknote className="h-4 w-4 mr-2 text-emerald-600" />;
        case "Débito":
        case "Crédito":
            return <CreditCard className="h-4 w-4 mr-2 text-blue-600" />;
        case "Transferencia":
            return <Landmark className="h-4 w-4 mr-2 text-purple-600" />;
        default:
            return <Smartphone className="h-4 w-4 mr-2 text-zinc-500" />;
    }
};

export function SalesTable({ sales }: { sales: SerializedSale[] }) {
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

    if (!sales || sales.length === 0) {
        return (
            <div className="w-full">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/50">
                            <TableHead className="text-center w-[50px]"></TableHead>
                            <TableHead className="text-center w-[120px]">Ticket</TableHead>
                            <TableHead className="text-center">Fecha y Hora</TableHead>
                            <TableHead className="text-center">Método de Pago</TableHead>
                            <TableHead className="text-center">Artículos</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                                No se encontraron ventas.
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="w-full">
            <Table>
                <TableHeader>
                    <TableRow className="bg-zinc-50/50">
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead className="text-center w-[120px]">Ticket</TableHead>
                        <TableHead className="text-center">Fecha y Hora</TableHead>
                        <TableHead className="text-center">Método de Pago</TableHead>
                        <TableHead className="text-center">Artículos</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sales.map((sale) => {
                        const isExpanded = expandedIds.has(sale.id);
                        const itemCount = sale.items.reduce((acc, item) => acc + item.quantity, 0);

                        return (
                            <Fragment key={sale.id}>
                                {/* Fila principal */}
                                <TableRow
                                    className="cursor-pointer hover:bg-zinc-50/50 transition-colors"
                                    onClick={() => toggleExpand(sale.id)}
                                >
                                    <TableCell className="text-center w-[50px] px-3">
                                        <ChevronDown
                                            className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                                                }`}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center font-mono font-bold text-zinc-600">
                                        #{sale.id.slice(-6).toUpperCase()}
                                    </TableCell>
                                    <TableCell className="text-center text-zinc-500 text-sm">
                                        {format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center font-medium text-zinc-700">
                                            <PaymentIcon method={sale.paymentMethod} />
                                            {sale.paymentMethod}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                                            {itemCount} un.
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-zinc-900 text-lg">
                                        ${sale.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>

                                {/* Fila expandible con detalle */}
                                {isExpanded && (
                                    <TableRow className="bg-zinc-50/80">
                                        <TableCell colSpan={6} className="p-0">
                                            <div className="px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {/* Sub-tabla de productos */}
                                                <div className="rounded-md border border-zinc-200 bg-white overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-zinc-100/60">
                                                                <TableHead className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Producto</TableHead>
                                                                <TableHead className="text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider w-[100px]">Cantidad</TableHead>
                                                                <TableHead className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider w-[130px]">Precio Un.</TableHead>
                                                                <TableHead className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider w-[130px]">Subtotal</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {sale.items.map((item) => (
                                                                <TableRow key={item.id} className="hover:bg-zinc-50/50">
                                                                    <TableCell>
                                                                        <span className="font-semibold text-zinc-900">{item.product.name}</span>
                                                                        {item.product.sku && (
                                                                            <span className="ml-2 text-xs text-zinc-400 uppercase tracking-wider">
                                                                                {item.product.sku}
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-center font-medium text-zinc-700">
                                                                        {item.quantity}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-zinc-600">
                                                                        ${item.unitPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-semibold text-zinc-900">
                                                                        ${(item.quantity * item.unitPrice).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {/* Fila del total */}
                                                            <TableRow className="border-t-2 border-zinc-200 bg-zinc-50/60">
                                                                <TableCell colSpan={3} className="text-right font-semibold text-zinc-500 uppercase text-xs tracking-wider">
                                                                    Total cobrado
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold text-emerald-600 text-lg">
                                                                    ${sale.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>

                                                {/* Notas si existen */}
                                                {sale.notes && (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5">
                                                        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Notas: </span>
                                                        <span className="text-sm text-amber-800">{sale.notes}</span>
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
