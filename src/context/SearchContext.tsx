import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Beat } from '../types/Beat';

interface SearchContextProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    beats: Beat[];
    setBeats: (list: Beat[]) => void;
}

const SearchContext = createContext<SearchContextProps | undefined>(undefined);

export const SearchProvider = ({ children }: { children: ReactNode }) => {
    const [searchQuery, setSearchQuery] = useState('');
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
