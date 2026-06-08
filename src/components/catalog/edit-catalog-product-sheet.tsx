"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash, BookOpen, Check } from "lucide-react";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateCatalogProductValues } from "@/actions/catalog";
import { ImageUploader } from "@/components/ui/image-uploader";
import { uploadImageAction } from "@/actions/image";

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

interface EditCatalogProductSheetProps {
    productCatalogId: string;
    productName: string;
    attributes: Attribute[];
    currentValues: CurrentValue[];
    onSaveSuccess?: () => void;
}

export function EditCatalogProductSheet({
    productCatalogId,
    productName,
    attributes,
    currentValues,
    onSaveSuccess,
}: EditCatalogProductSheetProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Estado dinámico del formulario
    // key: attributeId, value: el valor correspondiente (string, boolean, string[] para listas)
    const [formState, setFormState] = useState<Record<string, any>>({});

    // Inicializar el estado al abrir o cambiar los valores
    useEffect(() => {
        if (!open) return;

        const initialState: Record<string, any> = {};

        attributes.forEach((attr) => {
            const attrValues = currentValues.filter((cv) => cv.attributeId === attr.id);

            if (!attr.isList) {
                // Atributos Simples (Single value)
                const val = attrValues[0];
                if (!val) {
                    initialState[attr.id] = attr.type === "BOOLEAN" ? false : "";
                } else {
                    if (attr.type === "CHOICE") {
                        initialState[attr.id] = val.optionId || "";
                    } else if (attr.type === "BOOLEAN") {
                        initialState[attr.id] = val.value === "true";
                    } else {
                        initialState[attr.id] = val.value || "";
                    }
                }
            } else {
                // Atributos de Lista (Multivalor)
                if (attr.type === "CHOICE") {
                    // Para CHOICE de lista, guardamos un array de optionIds
                    initialState[attr.id] = attrValues.map(v => v.optionId).filter(Boolean) as string[];
                } else if (attr.type === "BOOLEAN") {
                    initialState[attr.id] = attrValues.map(v => v.value === "true");
                } else if (attr.type === "NUMBER") {
                    initialState[attr.id] = attrValues.map(v => v.value ? Number(v.value) : "");
                } else {
                    initialState[attr.id] = attrValues.map(v => v.value || "");
                }
            }
        });

        setFormState(initialState);
    }, [open, attributes, currentValues]);

    const handleSingleChange = (attributeId: string, value: any) => {
        setFormState((prev) => ({
            ...prev,
            [attributeId]: value,
        }));
    };

    // Funciones para manejar listas dinámicas (TEXT, NUMBER, BOOLEAN)
    const handleListElementChange = (attributeId: string, index: number, value: any) => {
        setFormState((prev) => {
            const list = [...(prev[attributeId] || [])];
            list[index] = value;
            return { ...prev, [attributeId]: list };
        });
    };

    const addListElement = (attributeId: string, type: string) => {
        setFormState((prev) => {
            const list = [...(prev[attributeId] || [])];
            let defaultValue = "";
            if (type === "BOOLEAN") defaultValue = "false";
            list.push(defaultValue);
            return { ...prev, [attributeId]: list };
        });
    };

    const removeListElement = (attributeId: string, index: number) => {
        setFormState((prev) => {
            const list = [...(prev[attributeId] || [])];
            list.splice(index, 1);
            return { ...prev, [attributeId]: list };
        });
    };

    // Funciones para manejar lista de CHOICE (Multiselect con checkboxes)
    const handleChoiceCheckboxChange = (attributeId: string, optionId: string, checked: boolean) => {
        setFormState((prev) => {
            const selected: string[] = [...(prev[attributeId] || [])];
            if (checked) {
                if (!selected.includes(optionId)) {
                    selected.push(optionId);
                }
            } else {
                const idx = selected.indexOf(optionId);
                if (idx > -1) {
                    selected.splice(idx, 1);
                }
            }
            return { ...prev, [attributeId]: selected };
        });
    };

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            // Clonamos el estado para no alterar el formulario visual mientras se sube
            const updatedFormState = { ...formState };

            // Escanear y subir imágenes en base64 a Cloudinary
            for (const [attributeId, value] of Object.entries(updatedFormState)) {
                const attr = attributes.find(a => a.id === attributeId);
                if (!attr || attr.type !== "IMAGE") continue;

                if (!attr.isList) {
                    // Imagen única
                    if (typeof value === "string" && value.startsWith("data:image/")) {
                        const uploadRes = await uploadImageAction(value);
                        if (uploadRes.error) {
                            toast.error(`Error al subir imagen para "${attr.name}": ${uploadRes.error}`);
                            setLoading(false);
                            return;
                        }
                        if (uploadRes.url) {
                            updatedFormState[attributeId] = uploadRes.url;
                        }
                    }
                } else {
                    // Lista de imágenes
                    if (Array.isArray(value)) {
                        const uploadedList = [];
                        for (const item of value) {
                            if (typeof item === "string" && item.startsWith("data:image/")) {
                                const uploadRes = await uploadImageAction(item);
                                if (uploadRes.error) {
                                    toast.error(`Error al subir imagen en lista para "${attr.name}": ${uploadRes.error}`);
                                    setLoading(false);
                                    return;
                                }
                                if (uploadRes.url) {
                                    uploadedList.push(uploadRes.url);
                                }
                            } else if (item) {
                                // Mantener la URL ya subida
                                uploadedList.push(item);
                            }
                        }
                        updatedFormState[attributeId] = uploadedList;
                    }
                }
            }

            const res = await updateCatalogProductValues(productCatalogId, updatedFormState);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(res.success || "Atributos guardados");
                setOpen(false);
                onSaveSuccess?.();
            }
        } catch (error) {
            console.error("ON_SUBMIT_ERROR:", error);
            toast.error("Error al guardar los atributos");
        } finally {
            setLoading(false);
        }
    }    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 cursor-pointer font-semibold gap-1.5 transition-transform active:scale-95 hover:bg-surface-subtle">
                    <BookOpen className="h-3.5 w-3.5" />
                    Atributos
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-lg md:max-w-xl h-full flex flex-col p-0 gap-0 border-l border-border/80 bg-background/95 backdrop-blur-md shadow-2xl">
                <form onSubmit={onSubmit} className="flex flex-col h-full">
                    {/* Header Traslúcido Fijo */}
                    <div className="p-6 border-b border-border/50 bg-background/40 backdrop-blur-md">
                        <SheetHeader>
                            <SheetTitle className="text-xl font-bold flex items-center gap-2.5 text-foreground">
                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                Atributos de Catálogo
                            </SheetTitle>
                            <SheetDescription className="text-sm mt-2 text-muted-foreground leading-relaxed">
                                Configurá los atributos específicos para{" "}
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                    {productName}
                                </span>.
                            </SheetDescription>
                        </SheetHeader>
                    </div>

                    {/* Contenido Con Scroll y Diseños de Tarjetas Premium */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {attributes.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-4">
                                <div className="p-4 rounded-full bg-surface-subtle/50 text-muted-foreground/45 border border-border/40">
                                    <BookOpen className="h-8 w-8" />
                                </div>
                                <div className="max-w-[280px] space-y-1">
                                    <p className="font-semibold text-foreground">No hay atributos</p>
                                    <p className="text-xs text-muted-foreground/80 leading-normal">
                                        Creá atributos primero desde la pestaña &quot;Configuración de Atributos&quot;.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {attributes.map((attr) => {
                                    const isList = attr.isList;
                                    const value = formState[attr.id];

                                    return (
                                        <div
                                            key={attr.id}
                                            className="group relative rounded-2xl border border-border/60 bg-surface-subtle/10 p-5 transition-all duration-200 hover:border-border/100 hover:bg-surface-subtle/20 space-y-4"
                                        >
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

                                            {/* RENDERIZADO PARA ATRIBUTOS SIMPLES (isList: false) */}
                                            {!isList && (
                                                <div className="mt-1">
                                                    {attr.type === "TEXT" && (
                                                        <textarea
                                                            value={value || ""}
                                                            onChange={(e) => handleSingleChange(attr.id, e.target.value)}
                                                            placeholder="Escribí acá..."
                                                            className="flex min-h-[90px] w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-background/80 focus:bg-background resize-none shadow-inner"
                                                        />
                                                    )}

                                                    {attr.type === "NUMBER" && (
                                                        <Input
                                                            type="number"
                                                            value={value ?? ""}
                                                            onChange={(e) => handleSingleChange(attr.id, e.target.value)}
                                                            placeholder="0"
                                                            className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm transition-all hover:bg-background/80 focus:bg-background shadow-inner"
                                                        />
                                                    )}

                                                    {attr.type === "BOOLEAN" && (
                                                        <label
                                                            className="flex items-center justify-between bg-background/40 hover:bg-background/80 border border-border/60 hover:border-border rounded-xl p-3 px-4 transition-all cursor-pointer select-none shadow-sm active:scale-[0.99]"
                                                        >
                                                            <span className="text-sm font-semibold text-muted-foreground">
                                                                {value ? "Sí / Habilitado" : "No / Deshabilitado"}
                                                            </span>
                                                            <Switch
                                                                checked={!!value}
                                                                onCheckedChange={(checked) => handleSingleChange(attr.id, checked)}
                                                            />
                                                        </label>
                                                    )}

                                                    {attr.type === "CHOICE" && (
                                                        <Select
                                                            value={value || "unselected"}
                                                            onValueChange={(val) => handleSingleChange(attr.id, val === "unselected" ? "" : val)}
                                                        >
                                                            <SelectTrigger className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 transition-all hover:bg-background/80 text-sm shadow-inner">
                                                                <SelectValue placeholder="Seleccioná una opción..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border border-border bg-popover">
                                                                <SelectItem value="unselected" className="text-muted-foreground">
                                                                    Seleccione una opción...
                                                                </SelectItem>
                                                                {attr.options.map((opt) => (
                                                                    <SelectItem key={opt.id} value={opt.id} className="cursor-pointer rounded-lg">
                                                                        {opt.value}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}

                                                    {attr.type === "IMAGE" && (
                                                        <ImageUploader
                                                            value={value || ""}
                                                            onChange={(base64OrUrl) => handleSingleChange(attr.id, base64OrUrl)}
                                                            disabled={loading}
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {/* RENDERIZADO PARA ATRIBUTOS DE LISTA (isList: true) */}
                                            {isList && (
                                                <div className="space-y-3 mt-1">
                                                    {attr.type === "CHOICE" && (
                                                        <div className="grid grid-cols-2 gap-3 p-4 bg-background/45 rounded-xl border border-border/60">
                                                            {attr.options.map((opt) => {
                                                                const isChecked = Array.isArray(value) && value.includes(opt.id);
                                                                return (
                                                                    <label
                                                                        key={opt.id}
                                                                        htmlFor={`${attr.id}-${opt.id}`}
                                                                        className={`flex items-center space-x-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                                                            isChecked
                                                                                ? "border-primary bg-primary/10 text-primary-foreground font-semibold"
                                                                                : "border-border/60 bg-transparent hover:bg-surface-subtle/30 text-muted-foreground"
                                                                        }`}
                                                                    >
                                                                        <Checkbox
                                                                            id={`${attr.id}-${opt.id}`}
                                                                            checked={isChecked}
                                                                            onCheckedChange={(checked) =>
                                                                                handleChoiceCheckboxChange(attr.id, opt.id, !!checked)
                                                                            }
                                                                            className="cursor-pointer border-muted-foreground/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                                        />
                                                                        <span className="text-xs">
                                                                            {opt.value}
                                                                        </span>
                                                                    </label>
                                                                );
                                                            })}
                                                            {attr.options.length === 0 && (
                                                                <span className="col-span-2 text-xs text-muted-foreground text-center py-2">
                                                                    No hay opciones configuradas.
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {attr.type !== "CHOICE" && (
                                                        <div className="space-y-2.5">
                                                            {Array.isArray(value) && value.map((item, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 group/item">
                                                                    {attr.type === "TEXT" && (
                                                                        <Input
                                                                            value={item || ""}
                                                                            onChange={(e) => handleListElementChange(attr.id, idx, e.target.value)}
                                                                            placeholder={`Elemento ${idx + 1}`}
                                                                            className="flex-1 rounded-xl border border-border bg-background/50 px-4 py-2 text-sm transition-all hover:bg-background/80 focus:bg-background shadow-inner"
                                                                        />
                                                                    )}
                                                                    {attr.type === "NUMBER" && (
                                                                        <Input
                                                                            type="number"
                                                                            value={item ?? ""}
                                                                            onChange={(e) => handleListElementChange(attr.id, idx, e.target.value)}
                                                                            placeholder={`Valor ${idx + 1}`}
                                                                            className="flex-1 rounded-xl border border-border bg-background/50 px-4 py-2 text-sm transition-all hover:bg-background/80 focus:bg-background shadow-inner"
                                                                        />
                                                                    )}
                                                                    {attr.type === "BOOLEAN" && (
                                                                        <label
                                                                            className="flex items-center justify-between bg-background/40 hover:bg-background/80 border border-border/60 hover:border-border rounded-xl p-2 px-3.5 transition-all cursor-pointer select-none flex-1 shadow-sm active:scale-[0.995]"
                                                                        >
                                                                            <span className="text-xs font-semibold text-muted-foreground">
                                                                                {(item === "true" || item === true) ? "Sí / Activo" : "No / Inactivo"}
                                                                            </span>
                                                                            <Switch
                                                                                checked={item === "true" || item === true}
                                                                                onCheckedChange={(checked) => handleListElementChange(attr.id, idx, checked)}
                                                                            />
                                                                        </label>
                                                                    )}
                                                                    {attr.type === "IMAGE" && (
                                                                        <div className="flex-1">
                                                                            <ImageUploader
                                                                                value={item || ""}
                                                                                onChange={(base64OrUrl) => handleListElementChange(attr.id, idx, base64OrUrl)}
                                                                                disabled={loading}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => removeListElement(attr.id, idx)}
                                                                        className="h-9 w-9 text-danger-soft-foreground hover:bg-danger-soft/10 hover:text-danger rounded-xl cursor-pointer transition-colors duration-150"
                                                                    >
                                                                        <Trash className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => addListElement(attr.id, attr.type)}
                                                                className="w-full text-xs font-bold cursor-pointer border-dashed border-primary/40 text-primary hover:bg-primary/5 py-2.5 rounded-xl gap-1.5 transition-all hover:border-primary active:scale-[0.98]"
                                                            >
                                                                <Plus className="h-3.5 w-3.5" />
                                                                Añadir elemento
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer Traslúcido Fijo */}
                    {attributes.length > 0 && (
                        <div className="p-4 px-6 border-t border-border/50 bg-background/40 backdrop-blur-md flex justify-end gap-3.5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                className="cursor-pointer font-bold rounded-xl px-5 h-11 hover:bg-surface-subtle transition-all active:scale-95"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer font-bold rounded-xl px-5 h-11 shadow-lg shadow-primary/20 transition-all active:scale-95"
                            >
                                {loading ? "Guardando..." : "Guardar Atributos"}
                            </Button>
                        </div>
                    )}
                </form>
            </SheetContent>
        </Sheet>
    );
}
