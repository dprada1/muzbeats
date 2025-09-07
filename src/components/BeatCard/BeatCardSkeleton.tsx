import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function BeatCardSkeleton() {
    return (
        <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
            <div className="bg-card-bg text-white rounded-xl shadow-md p-3 sm:p-4 flex gap-3 sm:gap-4 w-full max-w-4xl mx-auto overflow-hidden">
                {/* LEFT: Cover — same as real card */}
                <div className="aspect-square w-20 h-20 md:w-36 md:h-36 rounded-lg object-cover">
                    <Skeleton className="w-full h-full" />
                </div>

                {/* RIGHT */}
                <div className="flex flex-col justify-between flex-1 min-w-0">
                    {/* Title + Key/BPM — EXACT 38px on mobile */}
                    <div className="min-w-0 h-[38px] sm:h-auto flex flex-col justify-between">
                        {/* Title: 16 (mobile, full width) / 20 (desktop, 60% width) */}
                        <div className="sm:hidden">
                            <Skeleton height={16} />
                        </div>
                        <div className="hidden sm:block">
                            <Skeleton height={18} width="60%" />
                        </div>

                        {/* Key + BPM: 12 (mobile) / 14 (desktop) */}
                        <div>
                            <div className="sm:hidden">
                                <Skeleton height={12} width={100} />
                            </div>
                            <div className="hidden sm:block">
                                <Skeleton height={14} width={120} />
                            </div>
                        </div>
                    </div>

                    {/* Play + Waveform — EXACT 48px on mobile */}
                    <div className="min-w-0 flex items-center gap-3 sm:gap-4 mt-2 h-[48px] sm:h-auto">
                        {/* Circle (explicit sizes so circle renders correctly) */}
                        <div className="sm:hidden">
                            <Skeleton circle width={44} height={44} />
                        </div>
                        <div className="hidden sm:block">
                            <Skeleton circle width={48} height={48} />
                        </div>

                        {/* Waveform: 38px mobile / 46px desktop to match live */}
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="sm:hidden">
                                <Skeleton height={38} borderRadius={8} />
                            </div>
                            <div className="hidden sm:block">
                                <Skeleton height={46} borderRadius={8} />
                            </div>
                        </div>
                    </div>

                    {/* Cart + Share — EXACT 30px on mobile + mt-2 */}
                    <div className="flex items-center gap-3 mt-2 h-[30px] sm:h-auto">
                        {/* Add to Cart: w-[6rem] mobile / w-[8rem] desktop */}
                        <div className="sm:hidden">
                            <Skeleton height={30} width={96} borderRadius={9999} />
                        </div>
                        <div className="hidden sm:block">
                            <Skeleton height={32} width={128} borderRadius={9999} />
                        </div>

                        {/* Share: pill */}
                        <div className="sm:hidden">
                            <Skeleton height={30} width={80} borderRadius={9999} />
                        </div>
                        <div className="hidden sm:block">
                            <Skeleton height={32} width={92} borderRadius={9999} />
                        </div>
                    </div>
                </div>
            </div>
        </SkeletonTheme>
    );
}
