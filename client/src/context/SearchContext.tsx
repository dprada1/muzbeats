import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Beat } from '@/types/Beat';
import { useSearchParams } from 'react-router-dom';
import { validateSearchQuery } from '@/utils/validation';

interface SearchContextProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    beats: Beat[];
    setBeats: (list: Beat[]) => void;
}

const SearchContext = createContext<SearchContextProps | undefined>(undefined);

export const SearchProvider = ({ children }: { children: ReactNode }) => {
    let searchParams: URLSearchParams;
    let hasSearchParams = true;

    try {
        [searchParams] = useSearchParams();
    } catch {
        hasSearchParams = false;
        searchParams = new URLSearchParams();
    }

    // Validate search query from URL on initial load
    const initialQuery = searchParams.get('q') || '';
    const initialValidation = validateSearchQuery(initialQuery);
    const [searchQuery, _setSearchQuery] = useState(initialValidation.query);

    // When URL changes, sync into state (with validation)
    useEffect(() => {
        if (!hasSearchParams) return;
        const urlQuery = searchParams.get('q') || '';
        const validation = validateSearchQuery(urlQuery);
        _setSearchQuery(validation.query);
    }, [searchParams, hasSearchParams]);

    // State-only setter; URL updates come from navigate() in the UI
    const setSearchQuery = (query: string) => {
        _setSearchQuery(query);
    };

    const [beats, setBeats] = useState<Beat[]>([]);

    return (
        <SearchContext.Provider value={{ searchQuery, setSearchQuery, beats, setBeats }}>
            {children}
        </SearchContext.Provider>
    );
};

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) throw new Error('useSearch must be used within SearchProvider');
    return context;
};
