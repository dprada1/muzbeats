import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useSearch } from '@/context/SearchContext';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import ConfirmDialog from '@/components/ui/Dialog/ConfirmDialog';
import LazyBeatCardCart from '@/components/beatcards/cart/LazyBeatCardCart';
import BeatCardCartSkeleton from '@/components/beatcards/cart/BeatCardCartSkeleton';
import { SkeletonTheme } from 'react-loading-skeleton';
import CartSummarySkeleton from '@/components/beatcards/cart/CartSummarySkeleton';
import CartSummaryStickySkeleton from '@/components/beatcards/cart/CartSummaryStickySkeleton';
import PayPalCheckoutButton from '@/components/checkout/PayPalCheckoutButton';
import { apiUrl } from '@/utils/api';

export default function CartPage() {
    const { cartItems, clearCart } = useCart();
    const { setBeats } = useSearch();
    const navigate = useNavigate();
    const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setBeats(cartItems);
        return () => setBeats([]);
    }, [cartItems, setBeats]);

    useEffect(() => window.scrollTo({ top: 0 }), []);

    // Fetch PayPal config from backend
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await fetch(apiUrl('/api/checkout/config'));
                if (!response.ok) throw new Error('Failed to fetch config');
                const config = await response.json();
                setPaypalClientId(config.paypal?.clientId || null);
            } catch (err) {
                console.error('Error fetching PayPal config:', err);
                setError('Failed to load payment options');
            }
        };
        fetchConfig();
    }, []);

    const [showSkeletons, setShowSkeletons] = useState(true);
    useEffect(() => {
        setShowSkeletons(false);
    }, []);

    const [showConfirm, setShowConfirm] = useState(false);

    const count = cartItems.length;
    const isEmpty = count === 0;
    const total = cartItems.reduce((acc, b) => acc + (b.price ?? 0), 0).toFixed(2);
    const skeletonCount = Math.max(count, 3);

    const handlePaymentSuccess = (orderId: string) => {
        navigate(`/store/checkout/success?order_id=${orderId}`, { replace: true });
        setTimeout(() => clearCart(), 50);
    };

    return (
        <div className="pt-12 max-w-3xl mx-auto">
            {/* header */}
            <div className="space-y-1 sm:space-y-1.5 mb-4">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Your Cart</h1>
                <p className="text-base sm:text-lg text-zinc-400">
                    {showSkeletons
                    ? 'Loading…'
                    : isEmpty
                    ? 'Your cart is empty.'
                    : `${count} ${count === 1 ? 'item' : 'items'} in your cart.`}
                </p>
            </div>

            {!showSkeletons && isEmpty && (
                <Link
                    to="/store"
                    className="inline-flex items-center gap-2 mt-4 px-5 py-3 rounded-full
                    bg-[#f3c000] text-black font-semibold hover:bg-[#e4b300]
                    active:scale-[1.02] transition no-ring"
                >
                    ← Continue Shopping
                </Link>
            )}

            {(showSkeletons || !isEmpty) && (
                <div className="grid lg:grid-cols-[1fr_320px] gap-3 sm:gap-4 pb-[80px] sm:pb-0">
                    {/* list */}
                    <div className="min-w-0 flex flex-col gap-4 sm:gap-6">
                        <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
                        {showSkeletons
                            ? Array.from({ length: skeletonCount }).map((_, i) => (
                                    <BeatCardCartSkeleton key={i} />
                                ))
                            : cartItems.map((beat) => (
                                    <LazyBeatCardCart key={beat.id} beat={beat} />
                                ))}
                        </SkeletonTheme>
                    </div>

                    {/* sidebar summary (desktop/tablet) */}
                    <div className="hidden lg:block">
                        {showSkeletons
                            ? <CartSummarySkeleton />
                            : (!isEmpty &&
                                <div className="bg-[#1e1e1e] rounded-2xl p-6 sticky top-4">
                                    <h2 className="text-xl font-semibold mb-4">Cart Summary</h2>
                                    
                                    {/* Total */}
                                    <div className="flex items-center justify-between py-3 border-b border-zinc-700/50 mb-5">
                                        <span className="text-zinc-400">Total</span>
                                        <span className="text-2xl font-bold text-white">${total}</span>
                                    </div>

                                    {/* PayPal Checkout */}
                                    {error ? (
                                        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4">
                                            <p className="text-red-400 text-sm">{error}</p>
                                        </div>
                                    ) : paypalClientId ? (
                                        <div className="mb-5">
                                            <PayPalScriptProvider 
                                                options={{ 
                                                    clientId: paypalClientId, 
                                                    currency: 'USD',
                                                    disableFunding: 'card', // Hide card button for cleaner UI
                                                }}
                                            >
                                                <PayPalCheckoutButton
                                                    cartItems={cartItems}
                                                    onSuccess={handlePaymentSuccess}
                                                    onError={setError}
                                                />
                                            </PayPalScriptProvider>
                                        </div>
                                    ) : (
                                        <div className="text-zinc-400 text-sm py-4 text-center">Loading payment options...</div>
                                    )}

                                    {/* License Agreement */}
                                    <div className="text-[11px] text-zinc-500 leading-relaxed mb-3 pb-3 border-b border-zinc-800">
                                        By purchasing, you agree to a{' '}
                                        <span className="text-zinc-400 font-medium">non‑exclusive</span> license.{' '}
                                        <a
                                            href="/store/license"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-zinc-400 underline hover:text-white transition"
                                        >
                                            View details
                                        </a>
                                    </div>

                                    {/* Clear Cart */}
                                    <button
                                        onClick={() => setShowConfirm(true)}
                                        className="w-full text-center text-red-400/80 hover:text-red-400 text-sm transition no-ring cursor-pointer"
                                    >
                                        Clear Cart
                                    </button>
                                </div>
                            )
                        }
                    </div>
                </div>
            )}

            {/* sticky checkout bar for mobile */}
            {showSkeletons
                ? <CartSummaryStickySkeleton />
                :   (!isEmpty && (
                        <div className="lg:hidden fixed left-0 right-0 bottom-[80px] sm:bottom-[88px] z-40 px-4 pb-4 pointer-events-none">
                            <div className="pointer-events-auto backdrop-blur-xl bg-[#0d0d0d]/95 border border-white/10 rounded-2xl p-4 shadow-2xl">
                                {/* Total */}
                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-800">
                                    <span className="text-sm text-zinc-400">Total</span>
                                    <span className="text-xl font-bold text-white">${total}</span>
                                </div>
                                
                                {/* PayPal Checkout Mobile */}
                                {error ? (
                                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-3">
                                        <p className="text-red-400 text-xs">{error}</p>
                                    </div>
                                ) : paypalClientId ? (
                                    <div className="mb-3">
                                        <PayPalScriptProvider 
                                            options={{ 
                                                clientId: paypalClientId, 
                                                currency: 'USD',
                                                disableFunding: 'card',
                                            }}
                                        >
                                            <PayPalCheckoutButton
                                                cartItems={cartItems}
                                                onSuccess={handlePaymentSuccess}
                                                onError={setError}
                                            />
                                        </PayPalScriptProvider>
                                    </div>
                                ) : (
                                    <div className="text-zinc-400 text-xs py-3 text-center">Loading...</div>
                                )}

                                {/* Footer Links */}
                                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-zinc-800">
                                    <button
                                        onClick={() => setShowConfirm(true)}
                                        className="text-red-400/80 hover:text-red-400 transition no-ring"
                                    >
                                        Clear Cart
                                    </button>
                                    <a 
                                        href="/store/license" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-zinc-500 hover:text-zinc-400 transition"
                                    >
                                        License Details
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))
            }

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
