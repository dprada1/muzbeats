import React from "react";
import SearchBar from "./SearchBar";
import { InfoTooltip } from "@/components/ui/Tooltip/InfoToolTip";
import { IoInformationCircleOutline } from "react-icons/io5";

type Props = {
    className?: string;
};

const SearchCluster: React.FC<Props> = ({ className }) => {
    return (
        <div
            className={`sticky md:static z-40 bg-[#0f0f0f] md:bg-transparent py-1 md:py-0 w-full ${className ?? ""}`}
            style={{ top: "calc(64px + env(safe-area-inset-top))" }}
        >
            <div className="flex items-center gap-2 w-full">
                <InfoTooltip
                    trigger={<IoInformationCircleOutline className="h-5 w-5 text-gray-300" />}
                    message={
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Key:</strong> (e.g. C#m)</li>
                            <li><strong>BPM:</strong> single (120) or range (140-160)</li>
                            <li><strong>Keywords:</strong> anywhere in track's title</li>
                        </ul>
                    }
                />
                <div className="flex-1">
                    <SearchBar />
                </div>
            </div>
        </div>
    );
};

export default SearchCluster;
