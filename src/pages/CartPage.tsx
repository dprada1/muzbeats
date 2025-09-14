import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useSearch } from '@/context/SearchContext';
import ConfirmDialog from '@/components/ui/Dialog/ConfirmDialog';
import BeatCardCart from '@/components/beatcards/cart/BeatCardCart';
import BeatCardCartSkeleton from '@/components/beatcards/cart/BeatCardCartSkeleton';
import { SkeletonTheme } from 'react-loading-skeleton';

export default function CartPage() {
    const { cartItems, clearCart } = useCart();
    const { setBeats } = useSearch();

    useEffect(() => {
        setBeats(cartItems);
        return () => setBeats([]);
    }, [cartItems, setBeats]);

    useEffect(() => window.scrollTo({ top: 0 }), []);

    const [showSkeletons, setShowSkeletons] = useState(true);
    useEffect(() => {
        const t = setTimeout(() => setShowSkeletons(false), 2000);
        return () => clearTimeout(t);
    }, []);

    const [showConfirm, setShowConfirm] = useState(false);
    const total = cartItems.reduce((acc, b) => acc + (b.price ?? 0), 0).toFixed(2);

    const skeletonCount = cartItems.length > 0 ? cartItems.length : 3;

    return (
        <div className="pt-12 max-w-3xl mx-auto">
            {/* header */}
            <div className="space-y-1 sm:space-y-1.5 mb-4">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Your Cart</h1>
                {cartItems.length === 0 ? (
                    <p className="text-zinc-400 text-lg">Your cart is empty.</p>
                ) : (
                    <p className="text-base sm:text-lg text-zinc-400">
                        {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart.
                    </p>
                )}
            </div>

            {cartItems.length === 0 && (
                <Link
                    to="/store"
                    className="inline-flex items-center gap-2 mt-4 px-5 py-3 rounded-full
                    bg-[#f3c000] text-black font-semibold hover:bg-[#e4b300]
                    active:scale-[1.02] transition no-ring"
                >
                    ← Continue Shopping
                </Link>
            )}

            {cartItems.length > 0 && (
                <div className="grid lg:grid-cols-[1fr_280px] gap-3 sm:gap-4 pb-[80px] sm:pb-0">
                    {/* list */}
                    <div className="min-w-0 flex flex-col gap-4 sm:gap-6">
                        <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
                        {showSkeletons
                            ? Array.from({ length: skeletonCount }).map((_, i) => (
                                <BeatCardCartSkeleton key={i} />
                                ))
                            : cartItems.map((beat) => (
                                <BeatCardCart key={beat.id} beat={beat} />
                                ))}
                        </SkeletonTheme>
                    </div>

                    {/* sidebar summary (desktop/tablet) */}
                    <div className="hidden lg:block">
                        <div className="bg-[#1e1e1e] rounded-2xl p-5">
                            <h2 className="text-xl font-semibold mb-3">Cart Summary</h2>
                            <div className="flex items-center justify-between text-lg mb-4">
                                <span className="text-white font-bold">Total: ${total}</span>
                            </div>
                            <button
                                className="block w-full bg-[#0b84ff] hover:bg-[#0a74d1] transition rounded-full px-5 py-3 font-semibold no-ring cursor-pointer"
                            >
                                Proceed to Checkout
                            </button>
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="mt-3 block w-full text-center text-red-400 hover:text-red-300 text-sm underline no-ring cursor-pointer"
                            >
                                Clear Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* sticky checkout bar for mobile */}
            {cartItems.length > 0 && (
                <div className="lg:hidden fixed left-0 right-0 bottom-[80px] sm:bottom-[88px] z-40 px-4 pb-4 pointer-events-none">
                    <div className="pointer-events-auto backdrop-blur-md bg-[#111]/80 border border-white/10 rounded-2xl p-4 shadow-xl flex items-center justify-between">
                        <div className="text-base font-semibold">
                            Total: <span className="text-zinc-400 font-normal">${total}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="text-sm text-red-400 underline hover:text-red-300 no-ring"
                            >
                                Clear
                            </button>
                            <button className="px-4 py-2 rounded-full bg-[#0b84ff] hover:bg-[#0a74d1] font-semibold no-ring">
                                Checkout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* confirm dialog */}
            {showConfirm && (
                <ConfirmDialog
                    title="Clear cart"
                    message="Are you sure you want to remove all items? This cannot be undone."
                    confirmLabel="Clear"
                    cancelLabel="Keep"
                    onConfirm={() => {
                        clearCart();
                        setShowConfirm(false);
                    }}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </div>
    );
}
