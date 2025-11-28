import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function CheckoutFormSkeleton() {
    return (
        <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
            <div className="space-y-4">
                {/* Email field */}
                <div className="h-[68px]">
                    {/* Label */}
                    <div className="mb-2 h-[20px]">
                        <Skeleton height={16} width={140} />
                    </div>
                    {/* Input */}
                    <div className="h-[40px]">
                        <Skeleton height={40} borderRadius={8} />
                    </div>
                </div>

                {/* Payment element divider */}
                <div className="border-t border-zinc-700 pt-4">
                    {/* Payment methods - all 4 appear at once */}
                    <div className="space-y-2">
                        {/* Card option */}
                        <Skeleton height={48} borderRadius={8} />
                        {/* Cash App Pay option */}
                        <Skeleton height={48} borderRadius={8} />
                        {/* Amazon Pay option */}
                        <Skeleton height={48} borderRadius={8} />
                        {/* Klarna option */}
                        <Skeleton height={48} borderRadius={8} />
                    </div>
                </div>

                {/* Pay button */}
                <div className="h-[48px]">
                    <Skeleton height={48} borderRadius={9999} />
                </div>
            </div>
        </SkeletonTheme>
    );
}

