import React, { useRef, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { useSearch } from "@/context/SearchContext";
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Position the top bar under the navbar
NProgress.configure({ showSpinner: false });
if (typeof window !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = '#nprogress .bar { top: 64px !important; background: red; }';
    document.head.appendChild(style);
}

const SearchBar: React.FC = () => {
    const { searchQuery, setSearchQuery } = useSearch();
    const [input, setInput] = useState(searchQuery);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClear = () => {
        setInput("");
        setSearchQuery("");
        inputRef.current?.focus();
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        NProgress.start();
        window.scrollTo({ top: 0, behavior: 'auto' });
        setSearchQuery(input.trim());
        setTimeout(() => NProgress.done(), 300);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={`
                flex items-center w-full max-w-xl transition-all duration-200
                ${isFocused ? "outline-1 outline-[#3ea6ff]" : "outline-1 outline-[#333]"}
                rounded-full bg-[#121212]
            `}
            style={{ height: "40px" }}
        >
            <div className="flex items-center px-3 flex-grow">
                <FiSearch className="text-[#808080] text-lg mr-2" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search beats..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="bg-transparent focus:outline-none text-sm text-white placeholder-[#808080] w-full"
                />
                {input && (
                    <button type="button" onClick={handleClear} className="ml-2">
                        <FiX className="text-[#808080] hover:text-white text-lg" />
                    </button>
                )}
            </div>

            <button
                type="submit"
                className="flex items-center justify-center bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-7 h-full rounded-r-full cursor-pointer"
            >
                <FiSearch className="text-lg" />
            </button>
        </form>
    );
};

export default SearchBar;
