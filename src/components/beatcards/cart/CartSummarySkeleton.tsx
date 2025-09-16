import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function CartSummarySkeleton() {
    return (
        <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
            <div className="bg-card-bg rounded-2xl p-5 h-[204px]">
                <div className="mb-3 h-[28px]">
                    <Skeleton height={20} width={140} /> {/* “Cart Summary” */}
                </div>
                <div className="flex items-center justify-between mb-4 h-[28px]">
                    <Skeleton height={20} width={128} />  {/* “Total:” */}
                </div>
                <div className="mb-3">
                    <Skeleton height={48} borderRadius={9999} /> {/* Proceed to Checkout */}
                </div>
                <div className="mt-3 h-[20px] flex items-center justify-center">
                    <Skeleton height={16} width={88} /> {/* Clear Cart */}
                </div>
            </div>
        </SkeletonTheme>
    );
}
