import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function BeatCardCartSkeleton() {
    return (
        <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
            <div className="bg-card-bg text-white rounded-xl shadow-md p-3 sm:p-4 w-full flex items-center gap-3 sm:gap-4 overflow-hidden h-[88px] sm:h-[116px]">
                {/* LEFT: Cover */}
                <div className="rounded-lg overflow-hidden w-16 h-16 sm:w-20 sm:h-20">
                    <Skeleton className="w-full h-full" />
                </div>

                {/* Right column */}
                <div className="min-w-0 flex-1 h-[64px] sm:h-auto">
                    {/* Title */}
                    <div className="h-[20px] sm:hidden">
                        <Skeleton height={14} /> {/* full width on mobile */}
                    </div>
                    <div className="hidden sm:block">
                        <Skeleton height={18} width="65%" />
                    </div>

                    {/* Meta + price (left) and Remove (right) */}
                    <div className="sm:mt-1 flex items-center justify-between gap-2">
                        {/* Key • BPM • Price */}
                        <div className="flex-1">
                            <Skeleton height={12} width={96} /> {/* 12, 14 */}
                            <Skeleton height={14} width={48} /> {/* 14, 18 */}
                        </div>

                        {/* Remove button */}
                        <div className="shrink-0">
                            <div className="hidden sm:block">
                                <Skeleton height={40} width={96.05} borderRadius={9999} />
                            </div>
                            <div className="sm:hidden">
                                <Skeleton height={36} width={89.53} borderRadius={9999} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SkeletonTheme>
    );
}
