import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { apiUrl } from '@/api/api';
import { validatedFetch, PayPalCaptureOrderResponseSchema } from '@/api/apiValidation';
import { useCart } from '@/context/CartContext';
import { isValidOrderId, isValidUUIDv4 } from '@/validation/validation';
import { sanitizeErrorMessage } from '@/security/errorSanitization';

type PaymentStatus = 'verifying' | 'success' | 'failed';
type SuccessLocationState = { emailSent?: boolean };

/** Same CTA chrome as NotFoundPage “Back to Store”. */
const storeCtaClassName =
    'inline-flex items-center gap-2 px-6 py-3 rounded-full bg-button-yellow text-black font-semibold hover:bg-button-yellow-hover active:scale-[1.02] transition no-ring';

/** Matches NavBar / LicensePage support mailto. */
const SUPPORT_EMAIL = 'support@prodmuz.com';

function supportMailto(orderId: string): string {
    const subject = encodeURIComponent(`Download email missing - order ${orderId}`);
    const body = encodeURIComponent(
        `Hi,\n\nMy payment succeeded but I did not receive the download email.\n\nOrder ID: ${orderId}\n\nThanks.`
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

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
    const location = useLocation();
    const { clearCart } = useCart();
    const clearCartRef = useRef(clearCart);
    clearCartRef.current = clearCart;

    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('verifying');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [emailSent, setEmailSent] = useState(() => {
        // DEV: /store/checkout/success?order_id=<any-uuid>&emailSent=false
        if (import.meta.env.DEV) {
            const q = searchParams.get('emailSent');
            if (q === '0' || q === 'false') return false;
            if (q === '1' || q === 'true') return true;
        }
        return (location.state as SuccessLocationState | null)?.emailSent ?? true;
    });
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

                setEmailSent(result.emailSent);
                setPaymentStatus('success');

                if (searchParams.get('order_id') !== result.orderId) {
                    navigate(
                        `/store/checkout/success?order_id=${encodeURIComponent(result.orderId)}`,
                        { replace: true, state: { emailSent: result.emailSent } }
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

    const orderId = searchParams.get('order_id');

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
                    <p className="text-zinc-300 mb-6">
                        {errorMessage ||
                            'Your payment was not completed successfully. Please contact support if you were charged.'}
                    </p>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <Link to="/store/cart" className={storeCtaClassName}>
                        Try Again
                    </Link>
                    <Link to="/store" className={storeCtaClassName}>
                        ← Back to Store
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-10 md:pt-14 max-w-3xl mx-auto text-center px-4 pb-4">
            <div className="bg-green-500/20 border border-green-500 rounded-2xl p-4 md:p-6 mb-3">
                <div className="text-5xl md:text-7xl mb-3 md:mb-4">✓</div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-400 mb-2 whitespace-nowrap">
                    Payment Successful!
                </h1>
                <p className="hidden md:block text-zinc-300 mb-3 text-xl">
                    Thank you for your purchase!
                </p>

                {emailSent ? (
                    <div className="rounded-xl px-1 py-2 md:p-4 max-w-2xl mx-auto text-left">
                        <h2 className="text-lg md:text-2xl font-semibold text-white mb-2 text-center">
                            Check Your Email
                        </h2>
                        <p className="text-zinc-300 mb-3 text-sm md:text-lg leading-relaxed text-center">
                            We've sent your download links to the email you provided during checkout.
                        </p>
                        <ul className="mx-auto w-fit max-w-full space-y-1.5 md:space-y-2 text-sm md:text-base text-zinc-400 pl-1">
                            <li className="flex gap-2">
                                <span className="shrink-0 w-3 text-center" aria-hidden>
                                    •
                                </span>
                                <span>Download links are valid for 30 days</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="shrink-0 w-3 text-center" aria-hidden>
                                    •
                                </span>
                                <span>Each link can be used up to 5 times</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="shrink-0 w-3 text-center" aria-hidden>
                                    •
                                </span>
                                <span>Check your spam folder if you don't see it</span>
                            </li>
                        </ul>
                        <p className="text-sm md:text-base mt-3 md:mt-4 mb-0 text-center">
                            <span className="font-bold text-white">Didn't receive the email?</span>{' '}
                            <span className="text-zinc-400">
                                Contact support and we'll resend your download links.
                            </span>
                        </p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-amber-400/70 bg-amber-500/15 p-4 max-w-2xl mx-auto text-left">
                        <h2 className="flex items-center justify-center gap-2 text-lg md:text-2xl font-semibold text-amber-200 mb-2">
                            <CircleAlert className="size-5 md:size-6 shrink-0 text-amber-300" aria-hidden />
                            Email not sent
                        </h2>
                        <p className="text-zinc-200 text-sm md:text-base leading-relaxed mb-1.5">
                            Your payment went through, but we couldn't send the download email.
                        </p>
                        <p className="text-zinc-200 text-sm md:text-base leading-relaxed mb-3">
                            <span className="font-semibold text-white">Contact support</span> with your{' '}
                            <span className="font-semibold text-white">order ID</span> and we'll resend
                            the links.
                        </p>
                        {orderId && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <p className="min-w-0 flex-1 text-xs sm:text-sm text-zinc-400 font-mono break-all">
                                    <span className="text-zinc-500 not-italic font-sans">Order ID:</span>{' '}
                                    {orderId}
                                </p>
                                <a
                                    href={supportMailto(orderId)}
                                    className="shrink-0 inline-flex justify-center items-center px-3 py-1.5 rounded-full border border-amber-300/80 bg-amber-400/20 text-amber-100 text-sm font-semibold hover:bg-amber-400/30 transition no-ring"
                                >
                                    Email support
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Link to="/store" className={storeCtaClassName}>
                ← Back to Store
            </Link>
        </div>
    );
}
