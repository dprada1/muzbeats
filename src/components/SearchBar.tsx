import React, { useState, useRef } from "react";
import { FiSearch, FiX } from "react-icons/fi";

const SearchBar: React.FC = () => {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClear = () => {
        setQuery("");
        inputRef.current?.focus();
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (query.trim() !== "") {
            console.log("Searching for:", query);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={`flex items-center transition-all duration-200 ${
                isFocused ? "outline-1 outline-[#3ea6ff]" : "outline-1 outline-[#333]"
            } rounded-full`}
            style={{ height: "40px", backgroundColor: "#121212" }}
        >
            {/* Input with magnifying glass */}
            <div className="flex items-center px-3 flex-grow">
                <FiSearch className="text-[#808080] text-lg mr-2" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search beats..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="bg-transparent focus:outline-none text-sm text-white placeholder-[#808080] w-full"
                />
                {query && (
                    <button type="button" onClick={handleClear} className="ml-2">
                        <FiX className="text-[#808080] hover:text-white text-lg" />
                    </button>
                )}
            </div>

            {/* Submit button */}
            <button
                type="submit"
                className="flex items-center justify-center bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-7 h-full rounded-r-full"
            >
                <FiSearch className="text-lg" />
            </button>
        </form>
    );
};

export default SearchBar;
