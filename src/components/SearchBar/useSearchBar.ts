// src/components/SearchBar/useSearchBar.ts
import { useState, useRef, useEffect } from 'react';
import { useSearch } from '@/context/SearchContext';
import { useNavigate, createSearchParams } from 'react-router-dom';
import NProgress from 'nprogress';

/**
 * Drives the search flow:
 *  • local `input` state  
 *  • URL via navigate(...)  
 *  • context.searchQuery updated by the SearchContext effect on URL change
 */
export function useSearchBar() {
    const { searchQuery } = useSearch();
    const [input, setInput] = useState(searchQuery);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Mirror the URL‐derived context into our local input
    useEffect(() => {
        setInput(searchQuery);
    }, [searchQuery]);

    const handleClear = () => {
        navigate('/store');
        inputRef.current?.focus();
    };

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        NProgress.start();
        window.scrollTo({ top: 0, behavior: 'auto' });

        const q = input.trim();
        if (q) {
            navigate({
                pathname: '/store',
                search: createSearchParams({ q }).toString(),
            });
        } else {
            navigate('/store');
        }

        // finish the bar after a short delay
        setTimeout(() => NProgress.done(), 300);
    };

    const onFocus = () => setIsFocused(true);
    const onBlur  = () => setIsFocused(false);

    return {
        input,
        setInput,
        inputRef,
        isFocused,
        onFocus,
        onBlur,
        handleClear,
        onSubmit,
    };
}
