"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Sliders, X, Settings2, Info, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createCatalogAttribute, deleteCatalogAttribute, updateCatalogAttribute } from "@/actions/catalog";
import { ConfirmDialog } from "@/components/confirm-dialog";

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

interface CatalogAttributesTabProps {
    initialAttributes: Attribute[];
}

export function CatalogAttributesTab({ initialAttributes }: CatalogAttributesTabProps) {
    const [attributes, setAttributes] = useState<Attribute[]>(initialAttributes);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Estado del Formulario
    const [name, setName] = useState("");
    const [type, setType] = useState<"TEXT" | "NUMBER" | "BOOLEAN" | "CHOICE" | "IMAGE">("TEXT");
    const [isList, setIsList] = useState(false);
    
    // Opciones del dropdown de CHOICE (en proceso de creación)
    const [optionInput, setOptionInput] = useState("");
    const [optionsList, setOptionsList] = useState<string[]>([]);

    // Estado del Formulario de Edición
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState<"TEXT" | "NUMBER" | "BOOLEAN" | "CHOICE" | "IMAGE">("TEXT");
    const [editIsList, setEditIsList] = useState(false);
    const [editOptionInput, setEditOptionInput] = useState("");
    const [editOptionsList, setEditOptionsList] = useState<string[]>([]);

    const handleStartEdit = (attr: Attribute) => {
        setEditingAttribute(attr);
        setEditName(attr.name);
        setEditType(attr.type);
        setEditIsList(attr.isList);
        setEditOptionsList(attr.options.map(o => o.value));
        setEditOptionInput("");
        setEditDialogOpen(true);
    };

    const handleAddEditOption = () => {
        const trimmed = editOptionInput.trim();
        if (!trimmed) return;

        if (editOptionsList.includes(trimmed)) {
            toast.warning(`La opción "${trimmed}" ya fue agregada.`);
            return;
        }

        setEditOptionsList((prev) => [...prev, trimmed]);
        setEditOptionInput("");
    };

    const handleRemoveEditOption = (index: number) => {
        setEditOptionsList((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleUpdateAttribute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAttribute) return;

        const trimmedName = editName.trim();
        if (!trimmedName) {
            toast.error("El nombre del atributo es requerido.");
            return;
        }

        if (editType === "CHOICE" && editOptionsList.length === 0) {
            toast.error("Un atributo de tipo lista de opciones debe tener al menos una opción configurada.");
            return;
        }

        setLoading(true);
        try {
            const res = await updateCatalogAttribute(editingAttribute.id, {
                name: trimmedName,
                type: editType,
                isList: editIsList,
                options: editType === "CHOICE" ? editOptionsList : undefined,
            });

            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Atributo actualizado con éxito");
                
                // Actualizar estado local
                setAttributes((prev) =>
                    prev.map((attr) =>
                        attr.id === editingAttribute.id
                            ? {
                                  ...attr,
                                  name: trimmedName,
                                  type: editType,
                                  isList: editIsList,
                                  options: editOptionsList.map((val, idx) => ({ id: `${idx}`, value: val })),
                              }
                            : attr
                    ).sort((a, b) => a.name.localeCompare(b.name))
                );

                setEditDialogOpen(false);
                setEditingAttribute(null);
            }
        } catch {
            toast.error("Error al actualizar el atributo");
        } finally {
            setLoading(false);
        }
    };

    const handleAddOption = () => {
        const trimmed = optionInput.trim();
        if (!trimmed) return;

        if (optionsList.includes(trimmed)) {
            toast.warning(`La opción "${trimmed}" ya fue agregada.`);
            return;
        }

        setOptionsList((prev) => [...prev, trimmed]);
        setOptionInput("");
    };

    const handleKeyDownOption = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddOption();
        }
    };

    const handleRemoveOption = (index: number) => {
        setOptionsList((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleCreateAttribute = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error("El nombre del atributo es requerido.");
            return;
        }

        if (type === "CHOICE" && optionsList.length === 0) {
            toast.error("Un atributo de tipo lista de opciones debe tener al menos una opción configurada.");
            return;
        }

        setLoading(true);
        try {
            const res = await createCatalogAttribute({
                name: trimmedName,
                type,
                isList,
                options: type === "CHOICE" ? optionsList : undefined,
            });

            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Atributo creado con éxito");
                
                // Mapear el nuevo atributo y agregarlo al estado local
                const newAttr: Attribute = {
                    id: res.attribute!.id,
                    name: res.attribute!.name,
                    type: res.attribute!.type as any,
                    isList: res.attribute!.isList,
                    options: optionsList.map((val, idx) => ({ id: `${idx}`, value: val })),
                };

                setAttributes((prev) => [...prev, newAttr].sort((a, b) => a.name.localeCompare(b.name)));
                
                // Resetear estados
                setName("");
                setType("TEXT");
                setIsList(false);
                setOptionsList([]);
                setDialogOpen(false);
            }
        } catch {
            toast.error("Error al crear el atributo");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAttribute = async (id: string) => {
        try {
            const res = await deleteCatalogAttribute(id);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(res.success || "Atributo eliminado");
                setAttributes((prev) => prev.filter((attr) => attr.id !== id));
            }
        } catch {
            toast.error("Error al eliminar el atributo");
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold">
                    <Info className="h-4 w-4 text-primary" />
                    <span>Los atributos te permiten enriquecer los productos del catálogo con información detallada.</span>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer font-semibold gap-1.5 transition-transform active:scale-95">
                            <Plus className="h-4 w-4" />
                            Nuevo Atributo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-primary" />
                                Crear Atributo de Catálogo
                            </DialogTitle>
                            <DialogDescription>
                                Definí un atributo y su comportamiento. Luego podrás asignarle valores en tus productos.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateAttribute} className="space-y-5 py-3">
                            <div className="space-y-2">
                                <Label htmlFor="attr-name" className="font-bold text-foreground">
                                    Nombre del Atributo
                                </Label>
                                <Input
                                    id="attr-name"
                                    placeholder="Ej: Talle, sinTACC, Material, Beneficios"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={100}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="attr-type" className="font-bold text-foreground">
                                        Tipo de Dato
                                    </Label>
                                    <Select
                                        value={type}
                                        onValueChange={(val: any) => {
                                            setType(val);
                                            // Limpiar lista de opciones si no es CHOICE
                                            if (val !== "CHOICE") setOptionsList([]);
                                        }}
                                    >
                                        <SelectTrigger id="attr-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TEXT">Texto libre (TEXT)</SelectItem>
                                            <SelectItem value="NUMBER">Numérico (NUMBER)</SelectItem>
                                            <SelectItem value="BOOLEAN">Verdadero/Falso (BOOLEAN)</SelectItem>
                                            <SelectItem value="CHOICE">Lista de opciones (CHOICE)</SelectItem>
                                            <SelectItem value="IMAGE">Imagen (IMAGE)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 flex flex-col justify-end pb-1.5">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="attr-islist"
                                            checked={isList}
                                            onCheckedChange={setIsList}
                                            className="cursor-pointer"
                                        />
                                        <Label htmlFor="attr-islist" className="font-bold text-foreground cursor-pointer">
                                            ¿Es una lista?
                                        </Label>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground mt-1 block">
                                        Permite cargar múltiples valores para este atributo por producto.
                                    </span>
                                </div>
                            </div>

                            {/* CONFIGURACIÓN DE OPCIONES SI ES TIPO CHOICE */}
                            {type === "CHOICE" && (
                                <div className="space-y-3 p-4 rounded-xl bg-surface-subtle border border-border">
                                    <Label className="font-bold text-foreground text-xs uppercase tracking-wider block">
                                        Configuración de Opciones Válidas
                                    </Label>
                                    
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Ej: XL, Algodón, Sin TACC..."
                                            value={optionInput}
                                            onChange={(e) => setOptionInput(e.target.value)}
                                            onKeyDown={handleKeyDownOption}
                                            className="flex-1 bg-background"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleAddOption}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-bold"
                                        >
                                            Agregar
                                        </Button>
                                    </div>

                                    {/* Lista de tags/badges agregados */}
                                    <div className="flex flex-wrap gap-1.5 pt-2 max-h-[120px] overflow-y-auto">
                                        {optionsList.map((opt, idx) => (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="bg-background border border-border py-1 px-2.5 rounded-lg flex items-center gap-1.5 text-xs text-foreground font-semibold"
                                            >
                                                {opt}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveOption(idx)}
                                                    className="text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                        {optionsList.length === 0 && (
                                            <span className="text-xs text-muted-foreground italic">
                                                Cargá las opciones posibles para el menú desplegable.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                    className="cursor-pointer font-semibold"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-semibold"
                                >
                                    {loading ? "Creando..." : "Crear Atributo"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Listado de Atributos */}
            <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-surface-subtle/50 border-b border-border">
                            <TableHead className="px-4 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Atributo
                            </TableHead>
                            <TableHead className="px-4 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Tipo de Dato
                            </TableHead>
                            <TableHead className="px-4 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Comportamiento
                            </TableHead>
                            <TableHead className="px-4 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Opciones / Configuración
                            </TableHead>
                            <TableHead className="px-4 py-4 w-[60px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attributes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Sliders className="h-10 w-10 opacity-20" />
                                        <p className="font-medium">No hay atributos personalizados configurados.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            attributes.map((attr) => (
                                <TableRow key={attr.id} className="hover:bg-surface-subtle/50 transition-colors">
                                    {/* Nombre */}
                                    <TableCell className="px-4 py-3 font-bold text-sm text-foreground">
                                        {attr.name}
                                    </TableCell>

                                    {/* Tipo */}
                                    <TableCell className="px-4 py-3 text-center">
                                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                            {attr.type}
                                        </Badge>
                                    </TableCell>

                                    {/* Comportamiento */}
                                    <TableCell className="px-4 py-3 text-center">
                                        {attr.isList ? (
                                            <Badge className="bg-success/10 text-success hover:bg-success/10 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                Colección / Lista
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-muted text-muted-foreground hover:bg-muted border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                Valor único
                                            </Badge>
                                        )}
                                    </TableCell>

                                    {/* Opciones */}
                                    <TableCell className="px-4 py-3">
                                        {attr.type === "CHOICE" ? (
                                            <div className="flex flex-wrap gap-1 max-w-[400px]">
                                                {attr.options.map((opt) => (
                                                    <span
                                                        key={opt.id}
                                                        className="text-[10px] bg-surface-subtle text-foreground border border-border px-1.5 py-0.5 rounded font-semibold"
                                                    >
                                                        {opt.value}
                                                    </span>
                                                ))}
                                                {attr.options.length === 0 && (
                                                    <span className="text-xs text-muted-foreground italic">Sin opciones</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">
                                                Carga dinámica por producto
                                            </span>
                                        )}
                                    </TableCell>

                                    {/* Acciones de Atributo */}
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            {/* Editar */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleStartEdit(attr)}
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-surface-subtle cursor-pointer rounded-lg"
                                                title="Editar Atributo"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>

                                            {/* Eliminar */}
                                            <ConfirmDialog
                                                title="¿Eliminar atributo?"
                                                description={`Esta acción borrará el atributo "${attr.name}" y todos sus valores guardados en los productos del catálogo de forma permanente.`}
                                                confirmLabel="Eliminar permanentemente"
                                                variant="destructive"
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-danger-soft-foreground hover:bg-danger-soft/10 cursor-pointer rounded-lg"
                                                        title="Eliminar Atributo"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                }
                                                onConfirm={() => handleDeleteAttribute(attr.id)}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog de Edición Controlado */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-primary" />
                            Editar Atributo de Catálogo
                        </DialogTitle>
                        <DialogDescription>
                            Modificá la configuración del atributo. ¡Cuidado! Si cambiás el tipo de dato o el comportamiento de lista, se borrarán los valores asignados a los productos.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateAttribute} className="space-y-5 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="edit-attr-name" className="font-bold text-foreground">
                                Nombre del Atributo
                            </Label>
                            <Input
                                id="edit-attr-name"
                                placeholder="Ej: Talle, sinTACC..."
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                maxLength={100}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-attr-type" className="font-bold text-foreground">
                                    Tipo de Dato
                                </Label>
                                <Select
                                    value={editType}
                                    onValueChange={(val: any) => {
                                        setEditType(val);
                                        if (val !== "CHOICE") setEditOptionsList([]);
                                    }}
                                >
                                    <SelectTrigger id="edit-attr-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TEXT">Texto libre (TEXT)</SelectItem>
                                        <SelectItem value="NUMBER">Numérico (NUMBER)</SelectItem>
                                        <SelectItem value="BOOLEAN">Verdadero/Falso (BOOLEAN)</SelectItem>
                                        <SelectItem value="CHOICE">Lista de opciones (CHOICE)</SelectItem>
                                        <SelectItem value="IMAGE">Imagen (IMAGE)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 flex flex-col justify-end pb-1.5">
                                <div className="flex items-center gap-3">
                                    <Switch
                                        id="edit-attr-islist"
                                        checked={editIsList}
                                        onCheckedChange={setEditIsList}
                                        className="cursor-pointer"
                                    />
                                    <Label htmlFor="edit-attr-islist" className="font-bold text-foreground cursor-pointer">
                                        ¿Es una lista?
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {editType === "CHOICE" && (
                            <div className="space-y-3 p-4 rounded-xl bg-surface-subtle border border-border">
                                <Label className="font-bold text-foreground text-xs uppercase tracking-wider block">
                                    Configuración de Opciones Válidas
                                </Label>
                                
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ej: XL, Algodón..."
                                        value={editOptionInput}
                                        onChange={(e) => setEditOptionInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddEditOption();
                                            }
                                        }}
                                        className="flex-1 bg-background"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleAddEditOption}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-bold"
                                    >
                                        Agregar
                                    </Button>
                                </div>

                                <div className="flex flex-wrap gap-1.5 pt-2 max-h-[120px] overflow-y-auto">
                                    {editOptionsList.map((opt, idx) => (
                                        <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="bg-background border border-border py-1 px-2.5 rounded-lg flex items-center gap-1.5 text-xs text-foreground font-semibold"
                                        >
                                            {opt}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEditOption(idx)}
                                                className="text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                    {editOptionsList.length === 0 && (
                                        <span className="text-xs text-muted-foreground italic">
                                            Cargá las opciones posibles para el menú desplegable.
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setEditDialogOpen(false);
                                    setEditingAttribute(null);
                                }}
                                className="cursor-pointer font-semibold"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer font-semibold"
                            >
                                {loading ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
