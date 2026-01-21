import React from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { useSearchBar } from "./useSearchBar";
import { MAX_SEARCH_QUERY_LENGTH } from "@/validation/validation";

const SearchBar: React.FC = () => {
    const {
        input,
        setInput,
        inputRef,
        isFocused,
        onFocus,
        onBlur,
        handleClear,
        onSubmit,
    } = useSearchBar();

    const onClearClick = () => {
        // visually clear immediately, then let the hook navigate/reset URL
        setInput("");
        handleClear();
    };

    return (
        <form
            onSubmit={onSubmit}
            className={`
                flex items-center w-full max-w-xl transition-all duration-200
                ${isFocused ? "outline-1 outline-focus" : "outline-1 outline-outline"}
                rounded-full bg-surface
            `}
            style={{ height: "40px" }}
        >
            <div
                className="relative flex items-center px-3 grow h-full rounded-l-full cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                <FiSearch className="text-text-muted text-lg mr-2" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search beats..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    maxLength={MAX_SEARCH_QUERY_LENGTH}
                    className="bg-transparent focus:outline-none text-sm text-white placeholder-text-muted w-full pr-12"
                    inputMode="search"
                />
                {input && (
                    <button
                        type="button"
                        onClick={onClearClick}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center active:scale-[0.97] z-10"
                        style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                        <FiX className="text-text-muted hover:text-white cursor-pointer text-xl" />
                    </button>
                )}
            </div>

            <button
                type="submit"
                className="flex items-center justify-center bg-waveform-bg hover:bg-hover-dark text-white px-7 h-full rounded-r-full cursor-pointer"
            >
                <FiSearch className="text-lg" />
            </button>
        </form>
    );
};

export default SearchBar;
