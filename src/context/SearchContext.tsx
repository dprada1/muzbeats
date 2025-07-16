import { createContext, useContext, useState, type ReactNode } from 'react';

interface SearchContextProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const SearchContext = createContext<SearchContextProps | undefined>(undefined);

export const SearchProvider = ({ children }: { children: ReactNode }) => {
    const [searchQuery, setSearchQuery] = useState('');
    return (
        <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
            {children}
        </SearchContext.Provider>
    );
};

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) throw new Error('useSearch must be used within SearchProvider');
    return context;
};
