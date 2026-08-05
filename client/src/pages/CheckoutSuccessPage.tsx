import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '@/api/api';
import { validatedFetch, PayPalCaptureOrderResponseSchema } from '@/api/apiValidation';
import { useCart } from '@/context/CartContext';
import { isValidOrderId, isValidUUIDv4 } from '@/validation/validation';
import { sanitizeErrorMessage } from '@/security/errorSanitization';

type PaymentStatus = 'verifying' | 'success' | 'failed';

function getPaypalOrderIdFromParams(searchParams: URLSearchParams): string | null {
    const token = searchParams.get('token');
    if (token && isValidOrderId(token)) {
        return token;
    }

    const orderIdParam = searchParams.get('order_id');
    if (orderIdParam && isValidOrderId(orderIdParam) && !isValidUUIDv4(orderIdParam)) {
        return orderIdParam;
    }

    return null;
}

export default function CheckoutSuccessPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { clearCart } = useCart();
    const clearCartRef = useRef(clearCart);
    clearCartRef.current = clearCart;

    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('verifying');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const verificationRef = useRef(false);
    const cartClearedRef = useRef(false);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, []);

    useEffect(() => {
        if (verificationRef.current) {
            return;
        }

        const dbOrderIdParam: string | null = searchParams.get('order_id');

        // In-page PayPal Buttons: capture already ran; CartPage navigated with our DB UUID
        if (dbOrderIdParam && isValidUUIDv4(dbOrderIdParam)) {
            verificationRef.current = true;
            if (!cartClearedRef.current) {
                cartClearedRef.current = true;
                clearCartRef.current();
            }
            setPaymentStatus('success');
            return;
        }

        const paypalOrderId: string | null = getPaypalOrderIdFromParams(searchParams);
        if (!paypalOrderId) {
            verificationRef.current = true;
            setPaymentStatus('failed');
            setErrorMessage(
                'Payment information not found. Please contact support if you were charged.'
            );
            return;
        }

        verificationRef.current = true;
        let cancelled = false;

        async function captureRedirectPayment() {
            try {
                const result = await validatedFetch(
                    apiUrl('/api/checkout/paypal/capture-order'),
                    PayPalCaptureOrderResponseSchema,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: paypalOrderId }),
                    }
                );

                if (cancelled) return;

                if (!cartClearedRef.current) {
                    cartClearedRef.current = true;
                    clearCartRef.current();
                }

                setPaymentStatus('success');

                if (searchParams.get('order_id') !== result.orderId) {
                    navigate(
                        `/store/checkout/success?order_id=${encodeURIComponent(result.orderId)}`,
                        { replace: true }
                    );
                }
            } catch (error: unknown) {
                if (cancelled) return;
                if (import.meta.env.DEV) {
                    console.error('Error capturing PayPal order on success page:', error);
                }
                setPaymentStatus('failed');
                setErrorMessage(sanitizeErrorMessage(error, 'PayPal capture order'));
            }
        }

        captureRedirectPayment();

        return () => {
            cancelled = true;
        };
    }, [searchParams, navigate]);

    if (paymentStatus === 'verifying') {
        return (
            <div className="pt-12 max-w-3xl mx-auto text-center px-4">
                <div className="bg-zinc-500/20 border border-zinc-500 rounded-2xl p-6 sm:p-8 mb-6">
                    <div className="text-6xl mb-4">⏳</div>
                    <h1 className="text-3xl font-bold text-zinc-300 mb-4">Verifying Payment...</h1>
                    <p className="text-zinc-400">Please wait while we confirm your payment.</p>
                </div>
            </div>
        );
    }

    if (paymentStatus === 'failed') {
        return (
            <div className="pt-12 max-w-3xl mx-auto text-center px-4">
                <div className="bg-red-500/20 border border-red-500 rounded-2xl p-6 sm:p-8 mb-6">
                    <div className="text-6xl mb-4">✗</div>
                    <h1 className="text-3xl font-bold text-red-400 mb-4">Payment Not Completed</h1>
                    <p className="text-zinc-300 mb-4">
                        {errorMessage || 'Your payment was not completed successfully.'}
                    </p>
                    <p className="text-zinc-400 text-sm mb-6">
                        If you were charged, please contact support with your order ID.
                    </p>
                </div>

                <div className="space-y-4">
                    <Link
                        to="/store/cart"
                        className="inline-block bg-button-yellow hover:bg-button-yellow-hover text-black font-semibold py-3 px-8 rounded-full transition active:scale-[1.02]"
                    >
                        Try Again
                    </Link>
                    <div>
                        <Link
                            to="/store"
                            className="text-zinc-400 hover:text-white underline text-sm"
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-12 md:pt-14 max-w-3xl mx-auto text-center">
            <div className="bg-green-500/20 border border-green-500 rounded-2xl p-4 md:p-8 mb-4">
                <div className="text-6xl md:text-7xl mb-4 md:mb-5">
                    ✓
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-green-400 mb-2 md:mb-3">
                    Payment Successful!
                </h1>
                <p className="text-zinc-300 mb-2 md:mb-3 text-lg md:text-xl">
                    Thank you for your purchase!
                </p>
                <div className="rounded-xl p-2 md:p-6 mb-0 max-w-2xl mx-auto">
                    <h2 className="text-xl md:text-2xl font-semibold text-white mb-2 md:mb-3 text-center">
                        📧 Check Your Email
                    </h2>
                    <p className="text-zinc-300 mb-3 md:mb-4 text-base md:text-lg leading-relaxed">
                        We've sent your download links to the email you provided during checkout.
                    </p>
                    <ul className="space-y-1.5 md:space-y-2 text-sm md:text-base text-zinc-400">
                        <li className="flex items-center gap-2">
                            <span className="text-green-400 shrink-0">•</span>
                            <span>Download links valid for 30 days</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-green-400 shrink-0">•</span>
                            <span>Each link can be used up to 5 times</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-green-400 shrink-0">•</span>
                            <span>Check spam folder if you don't see it</span>
                        </li>
                    </ul>
                </div>
                <p className="text-zinc-400 text-sm md:text-base  mb-0">
                    Didn't receive the email? Contact support and we'll resend your download links.
                </p>
            </div>

            <div className="mb-4">
                <Link
                    to="/store"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full
                    bg-button-yellow text-black font-semibold hover:bg-button-yellow-hover
                    active:scale-[1.02] transition no-ring"
                >
                    ← Continue Shopping
                </Link>
            </div>
        </div>
    );
}
