import { useState, useRef, useEffect } from 'react';
import { useSearch } from '@/context/SearchContext';
import { useNavigate, createSearchParams } from 'react-router-dom';
import NProgress from 'nprogress';

/**
 * Drives the search flow:
 *  - local `input` state  
 *  - URL via navigate(...)  
 *  - context.searchQuery updated by the SearchContext effect on URL change
 */
export function useSearchBar() {
    const { searchQuery } = useSearch();
    const [input, setInput] = useState(searchQuery);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // if /store?q=something changes (back/forward, deep link), mirror it into the text box
        setInput(searchQuery);
    }, [searchQuery]);

    const handleClear = () => {
        // navigate to /store without ?q
        navigate('/store');
        // put the cursor back into the field
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

        NProgress.done();
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
