"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ScanBarcode, Loader2, CameraOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const HTML5_QRCODE_SCRIPT_URL = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";

type Html5QrcodeInstance = {
    start: (
        cameraConfig: { facingMode: "environment" } | { deviceId: { exact: string } },
        configuration: {
            fps: number;
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => { width: number; height: number };
            aspectRatio?: number;
            formatsToSupport?: number[];
        },
        onScanSuccess: (decodedText: string) => void,
        onScanFailure?: () => void,
    ) => Promise<void>;
    stop: () => Promise<void>;
    clear: () => void;
};

declare global {
    interface Window {
        Html5Qrcode?: new (elementId: string, options?: { verbose?: boolean; formatsToSupport?: number[] }) => Html5QrcodeInstance;
        Html5QrcodeSupportedFormats?: Record<string, number>;
        __html5QrcodeLoader?: Promise<void>;
    }
}

interface BarcodeScannerButtonProps {
    onDetected: (code: string) => void;
    buttonLabel?: string;
    dialogTitle?: string;
    dialogDescription?: string;
    disabled?: boolean;
    mobileOnly?: boolean;
    className?: string;
}

function loadHtml5QrcodeScript() {
    if (typeof window === "undefined") return Promise.reject(new Error("Scanner disponible solo en el navegador"));
    if (window.Html5Qrcode) return Promise.resolve();
    if (window.__html5QrcodeLoader) return window.__html5QrcodeLoader;

    window.__html5QrcodeLoader = new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>("script[data-html5-qrcode]");

        if (existingScript) {
            existingScript.addEventListener("load", () => resolve(), { once: true });
            existingScript.addEventListener("error", () => reject(new Error("No se pudo cargar html5-qrcode")), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = HTML5_QRCODE_SCRIPT_URL;
        script.async = true;
        script.dataset.html5Qrcode = "true";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("No se pudo cargar html5-qrcode"));
        document.head.appendChild(script);
    });

    return window.__html5QrcodeLoader;
}

function getBarcodeFormats() {
    const formats = window.Html5QrcodeSupportedFormats;
    if (!formats) return undefined;

    return [
        formats.EAN_13,
        formats.EAN_8,
        formats.UPC_A,
        formats.UPC_E,
        formats.CODE_128,
        formats.CODE_39,
        formats.ITF,
        formats.CODABAR,
        formats.QR_CODE,
    ].filter((format): format is number => typeof format === "number");
}

export function BarcodeScannerButton({
    onDetected,
    buttonLabel = "Código de barras",
    dialogTitle = "Escanear código de barras",
    dialogDescription = "Apuntá la cámara al código y mantenelo dentro de la guía.",
    disabled,
    mobileOnly = true,
    className,
}: BarcodeScannerButtonProps) {
    const generatedId = useId().replace(/:/g, "");
    const readerId = `barcode-scanner-${generatedId}`;
    const scannerRef = useRef<Html5QrcodeInstance | null>(null);
    const detectedRef = useRef(false);
    const [open, setOpen] = useState(false);
    const [starting, setStarting] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const stopScanner = useCallback(async () => {
        const scanner = scannerRef.current;
        scannerRef.current = null;

        if (!scanner) return;

        try {
            await scanner.stop();
        } catch {
            // Si la cámara no llegó a iniciar, stop puede fallar. No bloqueamos el cierre.
        }

        try {
            scanner.clear();
        } catch {
            // clear también puede fallar si el scanner quedó a medio inicializar.
        }
    }, []);

    const startScanner = useCallback(async () => {
        detectedRef.current = false;
        setStarting(true);
        setCameraError(null);

        try {
            await loadHtml5QrcodeScript();

            if (!window.Html5Qrcode) {
                throw new Error("html5-qrcode no quedó disponible en el navegador");
            }

            const scanner = new window.Html5Qrcode(readerId, {
                verbose: false,
                formatsToSupport: getBarcodeFormats(),
            });
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    aspectRatio: 1.777778,
                    formatsToSupport: getBarcodeFormats(),
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const width = Math.min(Math.floor(viewfinderWidth * 0.86), 340);
                        const height = Math.min(Math.floor(viewfinderHeight * 0.32), 150);

                        return {
                            width: Math.max(width, 220),
                            height: Math.max(height, 96),
                        };
                    },
                },
                async (decodedText) => {
                    const code = decodedText.trim();
                    if (!code || detectedRef.current) return;

                    detectedRef.current = true;
                    await stopScanner();
                    setOpen(false);
                    onDetected(code);
                    toast.success(`Código leído: ${code}`);
                },
            );
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "No se pudo iniciar la cámara";

            setCameraError(message);
            toast.error("No se pudo abrir la cámara");
        } finally {
            setStarting(false);
        }
    }, [onDetected, readerId, stopScanner]);

    useEffect(() => {
        if (!open) {
            void stopScanner();
            return;
        }

        void startScanner();

        return () => {
            void stopScanner();
        };
    }, [open, startScanner, stopScanner]);

    return (
        <>
            <Button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(true)}
                className={cn(
                    "shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95",
                    mobileOnly && "md:hidden",
                    className,
                )}
            >
                <ScanBarcode className="mr-2 h-4 w-4" />
                {buttonLabel}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-[calc(100%-1rem)] gap-4 p-4 sm:max-w-md sm:p-6">
                    <DialogHeader>
                        <DialogTitle>{dialogTitle}</DialogTitle>
                        <DialogDescription>{dialogDescription}</DialogDescription>
                    </DialogHeader>

                    <div className="relative overflow-hidden rounded-xl border border-border bg-black">
                        <div id={readerId} className="min-h-[320px] w-full [&_video]:!w-full [&_video]:!rounded-xl" />

                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="relative h-28 w-[82%] max-w-xs rounded-xl border-2 border-primary/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]">
                                <div className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-warning" />
                                <div className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-warning" />
                                <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-warning" />
                                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-warning" />
                                <div className="absolute left-4 right-4 top-1/2 h-0.5 -translate-y-1/2 bg-primary shadow-[0_0_16px_hsl(var(--primary))]" />
                            </div>
                        </div>

                        {starting && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p className="text-sm font-medium">Abriendo cámara...</p>
                            </div>
                        )}

                        {cameraError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center text-white">
                                <CameraOff className="h-10 w-10 text-warning" />
                                <div className="space-y-1">
                                    <p className="font-semibold">No pudimos abrir la cámara</p>
                                    <p className="text-xs text-white/75">{cameraError}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="text-center text-xs text-muted-foreground">
                        Tip: usá buena luz y mantené el código horizontal dentro del marco.
                    </p>
                </DialogContent>
            </Dialog>
        </>
    );
}
