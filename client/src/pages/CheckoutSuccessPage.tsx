import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { isValidOrderId } from '@/validation/validation';

export default function CheckoutSuccessPage() {
    const [searchParams] = useSearchParams();
    const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'failed'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        window.scrollTo({ top: 0 });
        
        // Check for PayPal order_id parameter
        const orderId = searchParams.get('order_id');
        
        if (!orderId) {
            // If no payment info in URL, something went wrong
            console.error('No payment ID found in URL');
            setPaymentStatus('failed');
            setErrorMessage('Payment information not found. Please contact support if you were charged.');
            return;
        }

        // Validate orderId format before proceeding
        if (!isValidOrderId(orderId)) {
            console.error('Invalid order ID format:', orderId);
            setPaymentStatus('failed');
            setErrorMessage('Invalid payment information. Please contact support if you were charged.');
            return;
        }

        // PayPal payment - order is already created, just show success
        setPaymentStatus('success');
    }, [searchParams]);

    if (paymentStatus === 'loading') {
        return (
            <div className="pt-12 max-w-2xl mx-auto text-center">
                <div className="bg-zinc-500/20 border border-zinc-500 rounded-2xl p-8 mb-6">
                    <div className="text-6xl mb-4">⏳</div>
                    <h1 className="text-3xl font-bold text-zinc-300 mb-4">Verifying Payment...</h1>
                    <p className="text-zinc-400">Please wait while we confirm your payment.</p>
                </div>
            </div>
        );
    }

    if (paymentStatus === 'failed') {
        return (
            <div className="pt-12 max-w-2xl mx-auto text-center">
                <div className="bg-red-500/20 border border-red-500 rounded-2xl p-8 mb-6">
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
                        className="inline-block bg-button-blue hover:bg-button-blue-hover text-white font-semibold py-3 px-8 rounded-full transition active:scale-[1.02]"
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
        <div className="pt-12 max-w-2xl mx-auto text-center">
            <div className="bg-green-500/20 border border-green-500 rounded-2xl p-8 mb-4">
                <div className="text-6xl mb-4">
                    ✓
                </div>
                <h1 className="text-3xl font-bold text-green-400 mb-4">
                    Payment Successful!
                </h1>
                <p className="text-zinc-300 mb-2 text-lg">
                    Thank you for your purchase!
                </p>
                <div className="rounded-xl p-6 mb-0 text-left">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="text-2xl">📧</div>
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                Check Your Email
                            </h2>
                            <p className="text-zinc-300 mb-3">
                                We've sent your download links to the email address you provided during checkout.
                            </p>
                            <div className="space-y-2 text-sm text-zinc-400 mb-0">
                                <p className="flex items-center gap-2">
                                    <span className="text-green-400">•</span>
                                    Download links are valid for 30 days
                                </p>
                                <p className="flex items-center gap-2">
                                    <span className="text-green-400">•</span>
                                    Each link can be used up to 5 times
                                </p>
                                <p className="flex items-center gap-2 mb-0">
                                    <span className="text-green-400">•</span>
                                    Check your spam folder if you don't see the email
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <p className="text-zinc-400 text-sm mt-2 mb-0">
                    Didn't receive the email? Please contact support and we'll resend your download links.
                </p>
            </div>

            <div className="space-y-4">
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
