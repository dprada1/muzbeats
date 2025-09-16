import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function CartSummarySkeleton() {
  return (
    <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
      <div className="bg-[#1e1e1e] rounded-2xl p-5">
        <div className="mb-3">
          <Skeleton height={20} width={140} /> {/* “Cart Summary” */}
        </div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton height={18} width={64} />  {/* “Total:” */}
          <Skeleton height={18} width={80} />  {/* amount */}
        </div>
        <div className="mb-3">
          <Skeleton height={44} borderRadius={9999} /> {/* Proceed to Checkout */}
        </div>
        <Skeleton height={16} width={88} /> {/* Clear Cart */}
      </div>
    </SkeletonTheme>
  );
}
