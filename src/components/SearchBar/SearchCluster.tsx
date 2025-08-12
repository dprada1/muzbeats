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
            className={`sticky md:static z-40 bg-transparent w-full ${className ?? ""}`}
            style={{ top: "calc(64px + env(safe-area-inset-top))" }}
        >
            <div className="flex items-center gap-2 w-full">
                <InfoTooltip
                    placement="down"   // panel below the icon; arrow points up
                    align="left"       // body shifts left; arrow stays anchored on the icon
                    message={(
                        <ul className="list-disc pl-4 space-y-2">
                        <li><strong>Key:</strong> (e.g., C#m)</li>
                        <li><strong>BPM:</strong> single (120) or range (140-160)</li>
                        <li><strong>Keywords:</strong> anywhere in track's title</li>
                        </ul>
                    )}
                    trigger={<IoInformationCircleOutline className="text-xl leading-none" />}
                />
                <div className="flex-1">
                    <SearchBar />
                </div>
            </div>
        </div>
    );
};

export default SearchCluster;
