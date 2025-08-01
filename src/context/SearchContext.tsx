import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Beat } from '@/types/Beat';
import { useSearchParams } from 'react-router-dom';

interface SearchContextProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    beats: Beat[];
    setBeats: (list: Beat[]) => void;
}

const SearchContext = createContext<SearchContextProps | undefined>(undefined);

export const SearchProvider = ({ children }: { children: ReactNode }) => {
    let searchParams: URLSearchParams;
    let setSearchParams: (init: Record<string, string>) => void;
    let hasSearchParams = true;

    try {
        [searchParams, setSearchParams] = useSearchParams();
    } catch {
        hasSearchParams = false;
        searchParams = new URLSearchParams();
        setSearchParams = () => {};
    }

    const [searchQuery, _setSearchQuery] = useState(() => searchParams.get('q') || '');

    // When URL changes, sync into state
    useEffect(() => {
        if (!hasSearchParams) return;
        _setSearchQuery(searchParams.get('q') || '');
    }, [searchParams, hasSearchParams]);

    // Wrap setter to push into URL
    const setSearchQuery = (query: string) => {
        _setSearchQuery(query);
        if (!hasSearchParams) return;
        if (query) setSearchParams({ q: query });
        else setSearchParams({});
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
