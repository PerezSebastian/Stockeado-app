"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { Button } from "./button";
import { getCloudinaryUrl } from "@/lib/cloudinary-client";

interface ImageUploaderProps {
    value?: string;
    onChange: (base64: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function ImageUploader({
    value,
    onChange,
    disabled = false,
    placeholder = "Arrastrá una imagen o hacé clic para seleccionar",
}: ImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        // Validar tipo de archivo
        if (!file.type.startsWith("image/")) {
            alert("Por favor, seleccioná un archivo de imagen válido.");
            return;
        }

        // Validar tamaño máximo (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert("La imagen es demasiado pesada. El límite es de 10 MB.");
            return;
        }

        setLoading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            onChange(base64);
            setLoading(false);
        };
        reader.onerror = () => {
            alert("Ocurrió un error al leer el archivo de imagen.");
            setLoading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (disabled) return;

        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleRemove = () => {
        onChange("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const triggerSelect = () => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="w-full">
            {value ? (
                // Vista con Previsualización
                <div className="relative group rounded-xl border border-border/80 overflow-hidden bg-background/50 flex items-center justify-center max-h-[160px] md:max-h-[200px] shadow-sm select-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={getCloudinaryUrl(value, { width: 300, height: 300, crop: "fill" })}
                        alt="Previsualización"
                        className="max-h-[160px] md:max-h-[200px] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={handleRemove}
                            disabled={disabled}
                            className="h-9 w-9 rounded-xl shadow-lg cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                // Vista de Carga / Zona Drop
                <div
                    onClick={triggerSelect}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none text-center ${
                        isDragOver
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-muted-foreground/60 hover:bg-surface-subtle/30 text-muted-foreground"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        disabled={disabled}
                        className="hidden"
                    />

                    {loading ? (
                        <div className="py-2 flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs font-semibold text-foreground">Procesando imagen...</span>
                        </div>
                    ) : (
                        <>
                            <div className="p-2 rounded-lg bg-surface-subtle border border-border group-hover:scale-110 transition-transform">
                                <UploadCloud className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-foreground">{placeholder}</p>
                                <p className="text-[10px] text-muted-foreground/80">Formatos soportados: PNG, JPG, WEBP (máx. 10MB)</p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
