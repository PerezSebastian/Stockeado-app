"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";
import { Button } from "./button";
import { getCloudinaryUrl } from "@/lib/cloudinary-client";

interface ImageCarouselProps {
    images: string[];
    aspectRatio?: string;
    className?: string;
}

export function ImageCarousel({
    images = [],
    aspectRatio = "aspect-video",
    className = "",
}: ImageCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    // Compute active index dynamically to handle prop updates cleanly without using useEffect to sync state
    const activeIndex = currentIndex < images.length ? currentIndex : 0;

    const nextSlide = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => {
            const nextIdx = prev + 1;
            return nextIdx >= images.length ? 0 : nextIdx;
        });
    }, [images.length]);

    const prevSlide = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => {
            const prevIdx = prev - 1;
            return prevIdx < 0 ? images.length - 1 : prevIdx;
        });
    }, [images.length]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const diffX = touchStartX.current - touchEndX.current;
        const minSwipeDistance = 50;

        if (diffX > minSwipeDistance) {
            nextSlide();
        } else if (diffX < -minSwipeDistance) {
            prevSlide();
        }

        touchStartX.current = null;
        touchEndX.current = null;
    };

    // Close lightbox on Escape or arrow keys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightboxOpen(false);
            if (e.key === "ArrowRight" && lightboxOpen) nextSlide();
            if (e.key === "ArrowLeft" && lightboxOpen) prevSlide();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [lightboxOpen, nextSlide, prevSlide]);

    if (!images || images.length === 0) {
        return (
            <div className={`w-full ${aspectRatio} bg-surface-subtle border border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground gap-2 ${className}`}>
                <p className="text-xs">Sin imágenes cargadas</p>
            </div>
        );
    }

    const currentImage = images[activeIndex];

    return (
        <div className={`relative w-full overflow-hidden rounded-xl border border-border bg-black/5 select-none ${className}`}>
            {/* Slide Container */}
            <div
                className={`relative w-full ${aspectRatio} flex items-center justify-center overflow-hidden cursor-zoom-in`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => setLightboxOpen(true)}
            >
                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={getCloudinaryUrl(currentImage, { width: 800, height: 800, crop: "limit" })}
                    alt={`Imagen ${activeIndex + 1}`}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                />

                {/* Glassmorphic Badge / Counter */}
                {images.length > 1 && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-semibold text-white bg-black/60 backdrop-blur-md border border-white/10 rounded-full shadow-md z-10">
                        {activeIndex + 1} / {images.length}
                    </div>
                )}

                {/* Zoom Icon indicator */}
                <div className="absolute bottom-3 right-3 p-1.5 rounded-lg text-white bg-black/55 backdrop-blur-sm border border-white/5 opacity-0 hover:opacity-100 md:group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <Maximize2 className="h-3.5 w-3.5" />
                </div>

                {/* Left/Right Navigation controls */}
                {images.length > 1 && (
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={prevSlide}
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 backdrop-blur-sm shadow-md transition-all z-10"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={nextSlide}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 backdrop-blur-sm shadow-md transition-all z-10"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </>
                )}

                {/* Dots indicator */}
                {images.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/30 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/5">
                        {images.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentIndex(idx);
                                }}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    idx === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Immersive Lightbox Modal */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center select-none"
                    onClick={() => setLightboxOpen(false)}
                >
                    {/* Top actions */}
                    <div className="absolute top-4 inset-x-4 flex items-center justify-between z-[110]">
                        <span className="text-xs font-semibold text-white/85">
                            {images.length > 1 && `Imagen ${activeIndex + 1} de ${images.length}`}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setLightboxOpen(false)}
                            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-lg cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Left/Right Fullscreen Controls */}
                    {images.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={prevSlide}
                                className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md shadow-xl transition-all z-[110] active:scale-95"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <button
                                type="button"
                                onClick={nextSlide}
                                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md shadow-xl transition-all z-[110] active:scale-95"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>
                        </>
                    )}

                    {/* Fullscreen Image Container */}
                    <div
                        className="relative max-w-[90vw] max-h-[80vh] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={getCloudinaryUrl(currentImage, { width: 1200, height: 1200, crop: "limit" })}
                            alt={`Imagen ampliada ${activeIndex + 1}`}
                            className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl transition-all duration-300"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
