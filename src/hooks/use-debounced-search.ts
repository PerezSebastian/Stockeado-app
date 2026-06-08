"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

interface UseUrlSearchOptions {
    paramName?: string;
    delay?: number;
    pathname?: string;
    resetPage?: boolean;
}

export function useUrlSearch(options: UseUrlSearchOptions = {}) {
    const {
        paramName = "q",
        delay = 300,
        pathname: customPathname,
        resetPage = true,
    } = options;

    const router = useRouter();
    const searchParams = useSearchParams();
    const currentPathname = usePathname();
    const pathname = customPathname || currentPathname;
    const [isPending, startTransition] = useTransition();

    const initialValue = searchParams.get(paramName)?.toString() || "";
    const [searchTerm, setSearchTerm] = useState(initialValue);
    
    // Guard to prevent Next.js navigation from overwriting user's typing
    const lastPushedValue = useRef(initialValue);

    // Keep input in sync with URL changes (e.g., back navigation, clearing elsewhere)
    useEffect(() => {
        const urlValue = searchParams.get(paramName)?.toString() || "";
        if (urlValue !== lastPushedValue.current) {
            lastPushedValue.current = urlValue;
            setSearchTerm(urlValue);
        }
    }, [searchParams, paramName]);

    const applySearch = (value: string) => {
        lastPushedValue.current = value;
        const params = new URLSearchParams(searchParams.toString());
        
        if (value) {
            params.set(paramName, value);
        } else {
            params.delete(paramName);
        }
        
        if (resetPage) {
            params.delete("page");
        }

        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        });
    };

    const debouncedApplySearch = useDebouncedCallback((value: string) => {
        applySearch(value);
    }, delay);

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        debouncedApplySearch(value);
    };

    const clearSearch = () => {
        setSearchTerm("");
        debouncedApplySearch.cancel();
        applySearch("");
    };

    return {
        searchTerm,
        setSearchTerm: handleSearch,
        clearSearch,
        applySearchImmediate: applySearch,
        isPending,
    };
}
