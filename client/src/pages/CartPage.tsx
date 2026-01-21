import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import { useSearch } from '@/context/SearchContext';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import ConfirmDialog from '@/components/ui/Dialog/ConfirmDialog';
import LazyBeatCardCart from '@/components/beatcards/cart/LazyBeatCardCart';
import PayPalCheckoutButton from '@/components/checkout/PayPalCheckoutButton';
import { apiUrl } from '@/api/api';
import { validatedFetch, PayPalConfigSchema, type PayPalConfig } from '@/api/apiValidation';

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

    // Request cancellation for rate limiting
    const requestCancellerRef = useRef<{ controller: AbortController | null }>({ controller: null });

    // Fetch PayPal config from backend (only once on mount)
    useEffect(() => {
        const url = apiUrl('/api/checkout/config');
        
        if (import.meta.env.DEV) {
            console.log('Fetching PayPal config from:', url);
        }
        
        // Create abort controller for this specific request
        const abortController = new AbortController();
        let isCancelled = false;
        
        // Store this controller for potential cancellation
        requestCancellerRef.current.controller = abortController;
        
        // Fetch PayPal config (no deduplication needed for one-time fetch)
        validatedFetch(url, PayPalConfigSchema, {
            signal: abortController.signal,
        })
            .then((config: PayPalConfig) => {
                // Check if request was aborted or cancelled
                if (abortController.signal.aborted || isCancelled) {
                    if (import.meta.env.DEV) {
                        console.log('PayPal config request was cancelled, ignoring response');
                    }
                    return;
                }
                
                // Check if PayPal is enabled and has a client ID
                if (!config.paypal.enabled || !config.paypal.clientId) {
                    if (import.meta.env.DEV) {
                        console.warn('PayPal is not configured on the server. Check PAYPAL_CLIENT_ID environment variable.');
                    }
                    setError('Payment options are not available. Please contact support.');
                    setPaypalClientId(null);
                    return;
                }
                
                if (import.meta.env.DEV) {
                    console.log('PayPal config loaded successfully');
                }
                
                setPaypalClientId(config.paypal.clientId);
                setError(null); // Clear error on success
            })
            .catch((err) => {
                // Ignore aborted requests (only log in dev, don't set error)
                if (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('cancelled') || isCancelled) {
                    if (import.meta.env.DEV) {
                        console.log('PayPal config request was cancelled (component unmounted)');
                    }
                    return;
                }
                
                if (import.meta.env.DEV) {
                    console.error('Error fetching PayPal config:', {
                        error: err.message,
                        name: err.name,
                        url: url,
                    });
                }
                
                // Set professional error message for server connectivity issues
                setError(err.message || 'Unable to connect to the server. Payment options are temporarily unavailable. Please check your connection and try again.');
            });
        
        // Cleanup: cancel request only when component unmounts
        return () => {
            isCancelled = true;
            abortController.abort();
            // Clear the stored controller if it's this one
            if (requestCancellerRef.current.controller === abortController) {
                requestCancellerRef.current.controller = null;
            }
        };
    }, []);

    const [showConfirm, setShowConfirm] = useState(false);

    const count = cartItems.length;
    const isEmpty = count === 0;
    const total = cartItems.reduce((acc, b) => acc + (b.price ?? 0), 0).toFixed(2);

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
                    {isEmpty
                        ? 'Your cart is empty.'
                        : `${count} ${count === 1 ? 'item' : 'items'} in your cart.`}
                </p>
            </div>

            {isEmpty && (
                <Link
                    to="/store"
                    className="inline-flex items-center gap-2 mt-4 px-5 py-3 rounded-full
                        bg-button-yellow text-black font-semibold hover:bg-button-yellow-hover
                        active:scale-[1.02] transition no-ring"
                >
                    ← Continue Shopping
                </Link>
            )}

            {!isEmpty && (
                <div className="grid lg:grid-cols-[1fr_320px] gap-3 sm:gap-4 pb-[80px] sm:pb-0">
                    {/* list */}
                    <div className="min-w-0 flex flex-col gap-4 sm:gap-6">
                        {cartItems.map((beat) => (
                            <LazyBeatCardCart key={beat.id} beat={beat} />
                        ))}
                    </div>

                    {/* sidebar summary (desktop/tablet) */}
                    <div className="hidden lg:block">
                        <div className="bg-card-secondary rounded-2xl p-6 sticky top-4">
                            <h2 className="text-xl font-semibold mb-4">Cart Summary</h2>
                            
                            {/* Total */}
                            <div className="flex items-center justify-between py-3 border-b border-zinc-700/50 mb-5">
                                <span className="text-zinc-400">Total</span>
                                <span className="text-2xl font-bold text-white">${total}</span>
                            </div>

                            {/* PayPal Checkout */}
                            {error ? (
                                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                                    <p className="text-red-400 text-sm font-medium">{error}</p>
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
                    </div>
                </div>
            )}

            {/* sticky checkout bar for mobile */}
            {!isEmpty && (
                <div className="lg:hidden fixed left-0 right-0 bottom-[80px] sm:bottom-[88px] z-40 px-4 pb-4 pointer-events-none">
                    <div className="pointer-events-auto backdrop-blur-xl bg-overlay-bg/95 border border-white/10 rounded-2xl p-4 shadow-2xl">
                        {/* Total */}
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-800">
                            <span className="text-sm text-zinc-400">Total</span>
                            <span className="text-xl font-bold text-white">${total}</span>
                        </div>
                        
                        {/* PayPal Checkout Mobile */}
                        {error ? (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-3">
                                <p className="text-red-400 text-xs font-medium">{error}</p>
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
