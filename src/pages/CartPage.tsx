import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FaTrash } from 'react-icons/fa6';
import { FaPlay, FaPause } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { usePlayer } from '../context/PlayerContext';
import { useSearch } from '../context/SearchContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function CartPage() {
    /* cart + navigation -------------------------------------------------- */
    const { items, remove, clear } = useCart();
    const navigate = useNavigate();

    /* player & queue sync ------------------------------------------------ */
    const { play, pause, isPlaying, currentBeat } = usePlayer();
    const { setBeats } = useSearch(); // filtered-beats array for PlayerBar

    useEffect(() => {
        setBeats(items);          // while on /cart: queue = cart items
        return () => setBeats([]); // clear on unmount
    }, [items, setBeats]);

    /* scroll to top on mount -------------------------------------------- */
    useEffect(() => window.scrollTo({ top: 0 }), []);

    /* clear-cart confirm modal ------------------------------------------ */
    const [showConfirm, setShowConfirm] = useState(false);

    /* total -------------------------------------------------------------- */
    const total = items.reduce((acc, b) => acc + (b.price ?? 0), 0).toFixed(2);

    return (
        <div className="mx-auto max-w-6xl pt-20 px-4 text-white pb-[64px]">
            {/* header */}
            <h1 className="text-4xl font-bold mb-2">Your Cart</h1>
            {items.length === 0 ? (
                <>
                    <p className="text-zinc-400 text-lg">Your cart is empty.</p>
                    <p className="mt-2">
                        <Link to="/store" className="text-brand-yellow underline">
                            Browse beats →
                        </Link>
                    </p>
                </>
            ) : (
                <p className="text-zinc-400 text-lg mb-8">
                    {items.length} {items.length === 1 ? 'item' : 'items'} in your cart.
                </p>
            )}

            {/* grid */}
            <div className="grid lg:grid-cols-[1fr_280px] gap-8">
                {/* beat list */}
                <div className="flex flex-col gap-6">
                    {items.map(beat => (
                        <div
                            key={beat.id}
                            className="flex items-center gap-4 p-4 bg-[#1e1e1e] rounded-2xl"
                        >
                            {/* thumbnail + overlay */}
                            <div className="relative w-20 h-20 shrink-0">
                                <img
                                    src={beat.cover}
                                    alt={beat.title}
                                    className="w-full h-full rounded object-cover"
                                />

                                <button
                                    onClick={() => {
                                        if (currentBeat?.id === beat.id) {
                                            isPlaying ? pause() : play(beat);
                                        } else {
                                            play(beat);
                                        }
                                    }}
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition no-ring"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black">
                                        {currentBeat?.id === beat.id && isPlaying ? (
                                            <FaPause size={14} />
                                        ) : (
                                            <FaPlay size={14} />
                                        )}
                                    </div>
                                </button>
                            </div>

                            {/* metadata */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">{beat.title}</h3>
                                <p className="text-sm text-zinc-400 truncate">
                                    {beat.key} • {beat.bpm} BPM
                                </p>
                                <p className="mt-1 font-medium">${beat.price?.toFixed(2)}</p>
                            </div>

                            {/* remove btn */}
                            <button
                                onClick={() => remove(beat.id)}
                                className="flex items-center gap-1 px-3 py-1 border-1 border-red-500 text-red-500 rounded-full no-ring hover:bg-red-500 hover:text-black transition"
                            >
                                <FaTrash /> Remove
                            </button>
                        </div>
                    ))}

                    {/* continue shopping */}
                    {items.length > 0 && (
                        <button
                            onClick={() => navigate('/store')}
                            className="self-start mt-2 bg-brand-yellow text-black font-medium px-6 py-2 rounded-full hover:bg-brand-yellow/90 transition no-ring"
                        >
                            ← Continue Shopping
                        </button>
                    )}
                </div>

                {/* summary */}
                {items.length > 0 && (
                    <div className="bg-[#1e1e1e] rounded-2xl p-6 h-max">
                        <h2 className="text-2xl font-semibold mb-4">Cart Summary</h2>
                        <p className="text-lg mb-6">
                            Total: <span className="font-bold">${total}</span>
                        </p>

                        <button
                            onClick={() => alert('Checkout flow coming soon!')}
                            className="block w-full bg-[#0084ff] text-white font-bold text-center py-3 rounded-full hover:bg-[#0a74d1] transition no-ring"
                        >
                            Proceed to Checkout
                        </button>

                        <button
                            onClick={() => setShowConfirm(true)}
                            className="mt-3 block w-full text-red-500 text-sm underline hover:text-red-300 no-ring"
                        >
                            Clear Cart
                        </button>
                    </div>
                )}
            </div>

            {/* confirm clear cart */}
            <ConfirmDialog
                isOpen={showConfirm}
                title="Clear cart"
                message="Are you sure you want to remove all items? This cannot be undone."
                confirmLabel="Clear"
                cancelLabel="Keep"
                onConfirm={() => {
                    clear();
                    setShowConfirm(false);
                }}
                onCancel={() => setShowConfirm(false)}
            />
        </div>
    );
}
