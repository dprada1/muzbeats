import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { useCart } from '@/context/CartContext';
import type { Beat } from '@/types/Beat';
import CheckoutFormSkeleton from '@/components/checkout/CheckoutFormSkeleton';

/**
 * Back to Cart button component
 * @param variant - 'button' for prominent yellow button, 'link' for subtle text link
 */
function BackToCartButton({ variant = 'link' }: { variant?: 'button' | 'link' }) {
    const navigate = useNavigate();
    
    const handleClick = () => navigate('/store/cart');
    
    if (variant === 'button') {
        return (
            <button
                onClick={handleClick}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full
                bg-[#f3c000] text-black font-semibold hover:bg-[#e4b300]
                active:scale-[1.02] cursor-pointer transition no-ring"
            >
                ← Back to Cart
            </button>
        );
    }
    
    return (
        <button
            onClick={handleClick}
            className="mt-6 text-zinc-400 hover:text-white underline text-sm hover:cursor-pointer no-ring"
        >
            ← Back to Cart
        </button>
    );
}

// Initialize Stripe with publishable key
// In production, you'd get this from environment variables
const stripePromise = loadStripe(
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here'
);

interface CheckoutFormProps {
    total: number;
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
}

function CheckoutForm({ total, onSuccess, onError }: CheckoutFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [email, setEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/store/checkout/success`,
                    receipt_email: email,
                    payment_method_data: {
                        billing_details: {
                            email: email,
                            phone: '', // Empty string since we don't collect phone
                        },
                    },
                },
                redirect: 'if_required', // Only redirect if required (3D Secure, etc.)
            });

            if (error) {
                onError(error.message || 'Payment failed');
                setIsProcessing(false);
                return;
            }

            // Check payment intent status
            if (!paymentIntent) {
                onError('Payment confirmation incomplete');
                setIsProcessing(false);
                return;
            }

            console.log('Payment Intent Status:', paymentIntent.status);
            console.log('Payment Intent ID:', paymentIntent.id);

            // Handle different payment statuses
            switch (paymentIntent.status) {
                case 'succeeded':
                    console.log('Payment succeeded! Processing payment...');
                    // Automatically trigger order creation and email in development
                    // In production, this is handled by the webhook
                    try {
                        const processResponse = await fetch('http://localhost:3000/api/checkout/process-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                paymentIntentId: paymentIntent.id,
                            }),
                        });

                        if (processResponse.ok) {
                            const processData = await processResponse.json();
                            console.log('Payment processed successfully:', processData);
                        } else {
                            const errorData = await processResponse.json();
                            console.warn('Failed to process payment (order/email):', errorData.error);
                            // Don't fail the payment - it succeeded, just order processing failed
                            // This can be retried or handled by webhook in production
                        }
                    } catch (processError) {
                        console.error('Error processing payment:', processError);
                        // Don't fail the payment - it succeeded, just order processing failed
                    }
                    // Pass payment intent ID to success page for verification
                    onSuccess(paymentIntent.id);
                    break;
                case 'processing':
                    // Payment is processing, wait for webhook or check later
                    onError('Payment is processing. Please wait for confirmation.');
                    setIsProcessing(false);
                    break;
                case 'requires_payment_method':
                case 'requires_confirmation':
                case 'requires_action':
                case 'requires_capture':
                    // These statuses mean payment is not complete
                    onError('Payment requires additional action. Please try again.');
                    setIsProcessing(false);
                    break;
                case 'canceled':
                    onError('Payment was canceled');
                    setIsProcessing(false);
                    break;
                default:
                    // Unknown status - treat as error
                    onError(`Payment status: ${paymentIntent.status}. Please contact support.`);
                    setIsProcessing(false);
            }
        } catch (err: any) {
            onError(err.message || 'An error occurred');
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email <span className="text-red-400">*</span> <span className="text-zinc-500">(for receipt)</span>
                </label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-[#1e1e1e] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#0b84ff]"
                    placeholder="your@email.com"
                />
            </div>

            <div className="border-t border-zinc-700 pt-4">
                <PaymentElement
                    options={{
                        // Hide email and phone fields - we collect email separately for receipts
                        fields: {
                            billingDetails: {
                                email: 'never',
                                phone: 'never',
                            },
                        },
                    }}
                />
            </div>

            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full bg-[#f3c000] hover:bg-[#e4b300] disabled:bg-zinc-600 disabled:cursor-not-allowed cursor-pointer text-black font-semibold py-3 px-6 rounded-full transition active:scale-[1.02]"
            >
                {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
            </button>
        </form>
    );
}


export default function CheckoutPage() {
    const navigate = useNavigate();
    const { cartItems, clearCart } = useCart();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const total = cartItems.reduce((acc, beat) => acc + (beat.price ?? 0), 0);

    // Scroll to top when error occurs
    useEffect(() => {
        if (error) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [error]);

    useEffect(() => {
        if (cartItems.length === 0) {
            navigate('/store/cart');
            return;
        }

        // Create payment intent when component mounts
        const createPaymentIntent = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('http://localhost:3000/api/checkout/create-payment-intent', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        items: cartItems.map((beat: Beat) => ({
                            beatId: beat.id,
                            quantity: 1,
                        })),
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create payment intent');
                }

                const data = await response.json();
                setClientSecret(data.clientSecret);
            } catch (err: any) {
                setError(err.message || 'Failed to initialize payment');
            } finally {
                setIsLoading(false);
            }
        };

        createPaymentIntent();
    }, [cartItems, navigate]);

    const handlePaymentSuccess = (paymentIntentId: string) => {
        console.log('handlePaymentSuccess called with paymentIntentId:', paymentIntentId);
        // Navigate FIRST, then clear cart
        // This prevents the useEffect from redirecting us back to cart when cart becomes empty
        const successUrl = `/store/checkout/success?payment_intent=${paymentIntentId}`;
        console.log('Navigating to:', successUrl);
        navigate(successUrl, { replace: true });
        // Clear cart after a brief delay to ensure navigation completes
        setTimeout(() => {
            clearCart();
        }, 50);
    };

    if (error) {
        return (
            <div className="pt-12 max-w-3xl mx-auto">
                {/* header */}
                <div className="space-y-1 sm:space-y-1.5 mb-4">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Checkout</h1>
                    <p className="text-base sm:text-lg text-zinc-400">Error</p>
                </div>
                <div className="bg-red-500/20 border border-red-500 rounded-2xl p-8">
                    <p className="text-zinc-300 mb-4">{error}</p>
                    <BackToCartButton variant="button" />
                </div>
            </div>
        );
    }

    return (
        <div className="pt-12 max-w-3xl mx-auto">
            {/* header */}
            <div className="space-y-1 sm:space-y-1.5 mb-4">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Checkout</h1>
                <p className="text-base sm:text-lg text-zinc-400">
                    {isLoading || !clientSecret
                        ? 'Initializing payment…'
                        : `${cartItems.length} ${cartItems.length === 1 ? 'item' : 'items'} • Total: $${total.toFixed(2)}`}
                </p>
            </div>

            <div className="bg-[#1e1e1e] rounded-2xl p-6 sm:p-8">
                {(isLoading || !clientSecret) ? (
                    <CheckoutFormSkeleton />
                ) : (
                    <Elements
                        stripe={stripePromise}
                        options={{
                            clientSecret,
                            loader: 'never', // Prevent Stripe's default loading state
                            appearance: {
                                theme: 'night',
                                variables: {
                                    colorPrimary: '#f3c000',
                                    colorBackground: '#1e1e1e',
                                    colorText: '#ffffff',
                                    colorDanger: '#ef4444',
                                    fontFamily: 'system-ui, sans-serif',
                                    spacingUnit: '4px',
                                    borderRadius: '8px',
                                },
                            },
                        }}
                    >
                        <CheckoutForm
                            total={total}
                            onSuccess={handlePaymentSuccess}
                            onError={setError}
                        />
                    </Elements>
                )}
            </div>

            <BackToCartButton variant="link" />
        </div>
    );
}
