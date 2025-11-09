import React from 'react';
import SearchCluster from '@/components/SearchBar/SearchCluster';

type PageHeaderProps = {
    title: string;
    subtitle: string | React.ReactNode;
};

/**
 * PageHeader component that provides consistent header and search bar layout
 * across store and shared beat pages.
 * 
 * Includes:
 * - Mobile sticky search bar
 * - Page title and subtitle
 * - Consistent spacing and styling
 */
export default function PageHeader({ title, subtitle }: PageHeaderProps) {
    return (
        <>
            {/* Mobile: tight sticky search under the fixed NavBar */}
            <div
                className="fixed inset-x-0 z-40 md:hidden bg-[#111111] px-4 top-1 pt-3"
                style={{ top: "calc(64px + env(safe-area-inset-top))" }}
            >
                <SearchCluster className="pb-0.5"/>

                {/* push the fade OUTSIDE the bar so it shows */}
                <div
                    className="pointer-events-none absolute left-0 right-0 pt-1
                                h-4 bg-gradient-to-b from-[#111111]/60 via-[#111111]/25 to-transparent"
                    aria-hidden
                />
            </div>

            <div className="mt-[48px] md:mt-0">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-0.5 sm:mb-1">
                    {title}
                </h1>
                <p className="text-base sm:text-lg text-zinc-400">
                    {subtitle}
                </p>
            </div>
        </>
    );
}

