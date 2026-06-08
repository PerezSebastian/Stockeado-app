"use client";

import { Eye, BookOpen } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageCarousel } from "@/components/ui/image-carousel";

interface AttributeOption {
    id: string;
    value: string;
}

interface Attribute {
    id: string;
    name: string;
    type: "TEXT" | "NUMBER" | "BOOLEAN" | "CHOICE" | "IMAGE";
    isList: boolean;
    options: AttributeOption[];
}

interface CurrentValue {
    attributeId: string;
    value: string | null;
    optionId: string | null;
}

interface ViewCatalogProductSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productName: string;
    attributes: Attribute[];
    currentValues: CurrentValue[];
}

export function ViewCatalogProductSheet({
    open,
    onOpenChange,
    productName,
    attributes,
    currentValues,
}: ViewCatalogProductSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg md:max-w-xl h-full flex flex-col p-0 gap-0 border-l border-border/80 bg-background/95 backdrop-blur-md shadow-2xl">
                {/* Header Traslúcido Fijo */}
                <div className="p-6 border-b border-border/50 bg-background/40 backdrop-blur-md">
                    <SheetHeader>
                        <SheetTitle className="text-xl font-bold flex items-center gap-2.5 text-foreground">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <Eye className="h-5 w-5" />
                            </div>
                            Detalle de Atributos
                        </SheetTitle>
                        <SheetDescription className="text-sm mt-2 text-muted-foreground leading-relaxed">
                            Visualizando los valores cargados para{" "}
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                {productName}
                            </span>.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {/* Contenido Scrollable de Vista */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {attributes.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-4">
                            <div className="p-4 rounded-full bg-surface-subtle/50 text-muted-foreground/45 border border-border/40">
                                <BookOpen className="h-8 w-8" />
                            </div>
                            <p className="font-semibold text-foreground">No hay atributos configurados</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {attributes.map((attr) => {
                                const isList = attr.isList;
                                // Obtener los valores guardados para este atributo
                                const attrValues = currentValues.filter((cv) => cv.attributeId === attr.id);

                                return (
                                    <div
                                        key={attr.id}
                                        className="group relative rounded-2xl border border-border/60 bg-surface-subtle/10 p-5 transition-all duration-200 hover:border-border/100 hover:bg-surface-subtle/20 space-y-3"
                                    >
                                        {/* Label del atributo */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Label className="font-bold text-foreground text-sm cursor-default select-none">
                                                    {attr.name}
                                                </Label>
                                                {isList && (
                                                    <span className="text-[9px] font-extrabold bg-primary/15 text-primary px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                        Lista
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[9px] text-muted-foreground font-mono bg-border/40 px-2 py-0.5 rounded uppercase tracking-wider">
                                                {attr.type}
                                            </span>
                                        </div>

                                        {/* RENDERIZADO EN MODO SOLO VISTA */}
                                        <div className="mt-1">
                                            {/* 1. Atributos Simples (isList: false) */}
                                            {!isList && (
                                                <>
                                                    {attr.type === "TEXT" && (
                                                        <div className="bg-background/40 border border-border/50 rounded-xl p-3 px-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap shadow-inner min-h-[45px]">
                                                            {attrValues[0]?.value ? (
                                                                attrValues[0].value
                                                            ) : (
                                                                <span className="text-muted-foreground/50 italic text-xs">Sin especificar</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {attr.type === "NUMBER" && (
                                                        <div className="bg-background/40 border border-border/50 rounded-xl p-3 px-4 text-sm font-semibold text-foreground shadow-inner">
                                                            {attrValues[0]?.value !== null && attrValues[0]?.value !== undefined ? (
                                                                attrValues[0].value
                                                            ) : (
                                                                <span className="text-muted-foreground/50 italic text-xs font-normal">Sin especificar</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {attr.type === "BOOLEAN" && (
                                                        <div className="flex items-center gap-3 bg-background/40 border border-border/50 rounded-xl p-3 px-4 shadow-sm select-none">
                                                            <div className={`h-2.5 w-2.5 rounded-full shadow-sm ${
                                                                attrValues[0]?.value === "true"
                                                                    ? "bg-success animate-pulse"
                                                                    : "bg-muted-foreground/30"
                                                            }`} />
                                                            <span className="text-sm font-semibold text-foreground">
                                                                {attrValues[0]?.value === "true" ? "Sí / Habilitado" : "No / Deshabilitado"}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {attr.type === "CHOICE" && (
                                                        <div className="bg-background/40 border border-border/50 rounded-xl p-3 px-4 text-sm font-semibold text-foreground shadow-inner">
                                                            {(() => {
                                                                const selectedOptId = attrValues[0]?.optionId;
                                                                const option = attr.options.find(o => o.id === selectedOptId);
                                                                return option ? (
                                                                    option.value
                                                                ) : (
                                                                    <span className="text-muted-foreground/50 italic text-xs font-normal">Sin seleccionar</span>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {attr.type === "IMAGE" && (
                                                        <ImageCarousel
                                                            images={attrValues[0]?.value ? [attrValues[0].value] : []}
                                                            aspectRatio="aspect-square"
                                                            className="max-w-[280px]"
                                                        />
                                                    )}
                                                </>
                                            )}

                                            {/* 2. Atributos de Lista (isList: true) */}
                                            {isList && (
                                                <>
                                                    {attr.type === "CHOICE" && (
                                                        <div className="flex flex-wrap gap-2 p-1.5 bg-background/30 rounded-xl border border-border/50 min-h-[45px] items-center">
                                                            {(() => {
                                                                const selectedOptionIds = attrValues.map(v => v.optionId).filter(Boolean);
                                                                const selectedOptions = attr.options.filter(o => selectedOptionIds.includes(o.id));
                                                                
                                                                return selectedOptions.length > 0 ? (
                                                                    selectedOptions.map(opt => (
                                                                        <span
                                                                            key={opt.id}
                                                                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                                                                        >
                                                                            {opt.value}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-muted-foreground/50 italic text-xs pl-2.5">Sin seleccionar</span>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {attr.type !== "CHOICE" && attr.type !== "IMAGE" && (
                                                        <div className="space-y-2">
                                                            {attrValues.length > 0 ? (
                                                                attrValues.map((valObj, idx) => {
                                                                    const val = valObj.value;
                                                                    return (
                                                                        <div
                                                                            key={idx}
                                                                            className="flex items-center gap-3 bg-background/40 border border-border/50 rounded-xl p-3 px-4 text-sm text-foreground shadow-inner"
                                                                        >
                                                                            <span className="text-[10px] font-bold text-muted-foreground/60 font-mono">
                                                                                {(idx + 1).toString().padStart(2, "0")}
                                                                            </span>
                                                                            {attr.type === "BOOLEAN" ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className={`h-2 w-2 rounded-full ${
                                                                                        val === "true" ? "bg-success" : "bg-muted-foreground/30"
                                                                                    }`} />
                                                                                    <span className="font-semibold text-xs">
                                                                                        {val === "true" ? "Sí / Activo" : "No / Inactivo"}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="font-medium">{val}</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className="bg-background/20 border border-dashed border-border/60 rounded-xl p-4 text-center text-xs text-muted-foreground/50 italic">
                                                                    Lista vacía
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {attr.type === "IMAGE" && (
                                                        <ImageCarousel
                                                            images={attrValues.map(v => v.value).filter(Boolean) as string[]}
                                                            aspectRatio="aspect-video"
                                                            className="w-full"
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Fijo Traslúcido con Botón de Cerrar */}
                <div className="p-4 px-6 border-t border-border/50 bg-background/40 backdrop-blur-md flex justify-end">
                    <Button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer font-bold rounded-xl px-6 h-11 bg-primary text-primary-foreground hover:bg-primary/95 transition-all active:scale-95 shadow-lg shadow-primary/20"
                    >
                        Cerrar Vista
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
