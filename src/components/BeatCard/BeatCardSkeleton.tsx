// src/components/BeatCard/BeatCardSkeleton.tsx
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function BeatCardSkeleton() {
    return (
        <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
            <div className="bg-card-bg text-white rounded-xl shadow-md p-3 sm:p-4 flex gap-3 sm:gap-4 w-full max-w-4xl mx-auto overflow-hidden">
                {/* LEFT: Cover — identical to real BeatCard */}
                <div className="aspect-square w-20 h-20 md:w-36 md:h-36 rounded-lg overflow-hidden">
                    <Skeleton className="w-full h-full" />
                </div>

                {/* RIGHT */}
                <div className="flex flex-col justify-between flex-1 min-w-0">
                    {/* Title & Key/BPM (mobile = full width title, no extra gap) */}
                    <div className="min-w-0">
                        {/* Title: 16 (mobile, 100% width) / 20 (desktop, 60% width) */}
                        <div className="sm:hidden">
                            <Skeleton height={16} /> {/* no width => 100% */}
                        </div>
                        <div className="hidden sm:block">
                            <Skeleton height={20} width="60%" />
                        </div>

                        {/* Key + BPM: 12 (mobile) / 14 (desktop) */}
                        {/* Remove spacing on mobile; keep a tiny bump on desktop only */}
                        <div className="sm:mt-1">
                            <div className="sm:hidden">
                                <Skeleton height={12} width={100} />
                            </div>
                            <div className="hidden sm:block">
                                <Skeleton height={14} width={120} />
                            </div>
                        </div>
                    </div>

                    {/* Play + Waveform — single row */}
                    <div className="min-w-0 flex items-center gap-3 sm:gap-4 sm:mt-1">
                        {/* Circle (must use width/height props for circle) */}
                        <div className="sm:hidden">
                            <Skeleton circle width={44} height={44} />
                        </div>
                        <div className="hidden sm:block">
                            <Skeleton circle width={48} height={48} />
                        </div>

                        {/* Waveform — responsive heights via two variants */}
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="sm:hidden">
                                <Skeleton height={38} borderRadius={8} />
                            </div>
                            <div className="hidden sm:block">
                                <Skeleton height={46} borderRadius={8} />
                            </div>
                        </div>
                    </div>

                    {/* Cart + Share — exact pill widths/heights */}
                    <div className="flex items-center gap-3 mt-2">
                        {/* Add to Cart: w-[6rem] mobile / w-[8rem] desktop, ~28–32px tall */}
                        <div className="sm:hidden">
                            <Skeleton height={28} width={96} borderRadius={9999} />
                        </div>
                        <div className="hidden sm:block">
                            <Skeleton height={32} width={128} borderRadius={9999} />
                        </div>

                        {/* Share: pill; ~28–32px tall, width from icon+text padding */}
                        <div className="sm:hidden">
                            <Skeleton height={28} width={80} borderRadius={9999} />
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
