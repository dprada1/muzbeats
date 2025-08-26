import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FaTrash, FaPlay, FaPause } from 'react-icons/fa6';
import { useCart } from '@/context/CartContext';
import { usePlayer } from '@/context/PlayerContext';
import { useSearch } from '@/context/SearchContext';
import ConfirmDialog from '@/components/ui/Dialog/ConfirmDialog';

export default function CartPage() {
    const { cartItems, removeFromCart, clearCart } = useCart();

    const { play, pause, isPlaying, currentBeat } = usePlayer();
    const { setBeats } = useSearch();

    useEffect(() => {
        setBeats(cartItems);
        return () => setBeats([]);
    }, [cartItems, setBeats]);

    useEffect(() => window.scrollTo({ top: 0 }), []);

    const [showConfirm, setShowConfirm] = useState(false);
    const total = cartItems.reduce((acc, b) => acc + (b.price ?? 0), 0).toFixed(2);

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
                    className="inline-flex items-center gap-2 mt-4 px-5 py-3 rounded-full bg-[#f3c000] text-black font-semibold hover:bg-[#e4b300] transition no-ring"
                >
                    ← Continue Shopping
                </Link>
            )}

            {cartItems.length > 0 && (
                <div className="grid lg:grid-cols-[1fr_280px] gap-3 sm:gap-4 pb-[80px] sm:pb-0">
                    {/* list */}
                    <div className="flex flex-col gap-4 sm:gap-6">
                        {cartItems.map((beat) => {
                            const active = currentBeat?.id === beat.id && isPlaying;
                            return (
                                <div
                                    key={beat.id}
                                    className="w-full max-w-full overflow-hidden rounded-2xl bg-[#1e1e1e] p-3 sm:p-4"
                                >
                                    {/* LEFT: cover | RIGHT: title + meta/price + remove */}
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        {/* cover + overlay play */}
                                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                                            <img
                                                src={beat.cover}
                                                alt={beat.title}
                                                className="w-full h-full rounded-xl object-cover"
                                            />
                                            <button
                                                aria-label={active ? 'Pause preview' : 'Play preview'}
                                                onClick={active ? pause : () => play(beat)}
                                                className="absolute inset-0 grid place-items-center rounded-xl bg-black/0 hover:bg-black/20 focus:bg-black/20 transition cursor-pointer"
                                            >
                                                <span className="grid place-items-center rounded-full p-2 bg-black/60 opacity-70 hover:opacity-100 focus:opacity-100 transition">
                                                    {active ? (
                                                        <FaPause className="text-white text-sm" />
                                                    ) : (
                                                        <FaPlay className="text-white text-sm" />
                                                    )}
                                                </span>
                                            </button>
                                        </div>

                                        {/* RIGHT column */}
                                        <div className="min-w-0 flex-1 grid grid-cols-[1fr_auto] grid-rows-[auto_auto] items-center gap-x-2">
                                            {/* title (row 1, col 1) */}
                                            <h3 className="col-start-1 row-start-1 min-w-0 text-sm sm:text-lg font-semibold truncate">
                                                {beat.title}
                                            </h3>

                                            {/* meta + price (row 2, col 1) */}
                                            <div className="col-start-1 row-start-2 min-w-0 leading-tight">
                                                <p className="text-xs sm:text-sm text-zinc-400 truncate">
                                                {beat.key} · {beat.bpm} BPM
                                                </p>
                                                <p className="text-sm sm:text-lg font-semibold mt-[2px]">
                                                ${beat.price?.toFixed(2)}
                                                </p>
                                            </div>

                                            {/* Remove button spans both rows; perfectly centered */}
                                            <button
                                                onClick={() => removeFromCart(beat.id)}
                                                className="col-start-2 row-span-2 self-center translate-y-[1px]
                                                        cursor-pointer inline-flex items-center gap-1 active:scale-[1.02]
                                                        px-2.5 py-2 rounded-full bg-[#2a2a2a] text-red-400
                                                        hover:bg-[#353535] hover:text-red-300 transition no-ring"
                                                aria-label="Remove from cart"
                                            >
                                                <FaTrash className="text-sm" />
                                                <span className="text-sm sm:text-base">Remove</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
