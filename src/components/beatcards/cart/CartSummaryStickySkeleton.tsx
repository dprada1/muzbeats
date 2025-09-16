import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function CartSummaryStickySkeleton() {
    return (
        <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
            <div className="lg:hidden fixed left-0 right-0 bottom-[80px] sm:bottom-[88px] z-40 px-4 pb-4 pointer-events-none">
                <div className="pointer-events-auto backdrop-blur-md bg-[#111]/80 border border-white/10 rounded-2xl p-4 shadow-xl flex items-center justify-between h-[74px]">
                    <Skeleton height={18} width={96} /> {/* “Total: …” */}
                    <div className="flex items-center justify-center gap-3 h-[40px]">
                        <Skeleton height={20} width={33.87} />  {/* Clear */}
                        <Skeleton height={40} width={104.56} borderRadius={9999} /> {/* Checkout */}
                    </div>
                </div>
            </div>
        </SkeletonTheme>
    );
}
