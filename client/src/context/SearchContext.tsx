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
    let hasSearchParams = true;

    try {
        [searchParams] = useSearchParams();
    } catch {
        hasSearchParams = false;
        searchParams = new URLSearchParams();
    }

    const [searchQuery, _setSearchQuery] = useState(() => searchParams.get('q') || '');

    // When URL changes, sync into state
    useEffect(() => {
        if (!hasSearchParams) return;
        _setSearchQuery(searchParams.get('q') || '');
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
