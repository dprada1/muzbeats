import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function CartSummaryStickySkeleton() {
  return (
    <SkeletonTheme baseColor="#111" highlightColor="#1a1a1a">
      <div className="lg:hidden fixed left-0 right-0 bottom-[80px] sm:bottom-[88px] z-40 px-4 pb-4 pointer-events-none">
        <div className="pointer-events-auto backdrop-blur-md bg-[#111]/80 border border-white/10 rounded-2xl p-4 shadow-xl flex items-center justify-between">
          <Skeleton height={18} width={120} /> {/* “Total: …” */}
          <div className="flex items-center gap-3">
            <Skeleton height={28} width={56} borderRadius={9999} />  {/* Clear */}
            <Skeleton height={36} width={120} borderRadius={9999} /> {/* Checkout */}
          </div>
        </div>
      </div>
    </SkeletonTheme>
  );
}
