import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
        console.log('CheckoutSuccessPage: Component mounted/updated');
        console.log('CheckoutSuccessPage: searchParams:', Object.fromEntries(searchParams.entries()));
    window.scrollTo({ top: 0 });
    
    // Verify payment intent status if we have a payment_intent in URL
    // Stripe redirects with: ?payment_intent=pi_xxx&payment_intent_client_secret=pi_xxx_secret_xxx
    // We also pass it manually for non-redirect payments
    const paymentIntentId = searchParams.get('payment_intent');
    
    console.log('CheckoutSuccessPage: payment_intent from URL:', paymentIntentId);
    
    if (paymentIntentId) {
      verifyPaymentStatus(paymentIntentId);
    } else {
      // If no payment intent in URL, something went wrong
      console.error('No payment intent ID found in URL');
      setPaymentStatus('failed');
      setErrorMessage('Payment information not found. Please contact support if you were charged.');
    }
  }, [searchParams]);

  const verifyPaymentStatus = async (paymentIntentId: string, retryCount = 0) => {
    console.log(`Verifying payment intent: ${paymentIntentId} (attempt ${retryCount + 1})`);
    
    try {
      // Verify payment status with backend
            const response = await fetch(`/api/checkout/payment-intent/${paymentIntentId}`);
      
      console.log('Verification response status:', response.status);
      
      if (!response.ok) {
        // If 404 or other error, try to parse error message
        let errorMessage = `Failed to verify payment (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = `Failed to verify payment: ${response.statusText || response.status}`;
        }
        
        // If it's a 404 and we haven't retried, the payment might still be processing
        if (response.status === 404 && retryCount < 2) {
          setTimeout(() => {
            verifyPaymentStatus(paymentIntentId, retryCount + 1);
          }, 1000);
          return;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
            console.log('CheckoutSuccessPage: Payment verification response:', data);
      
      if (data.status === 'succeeded') {
                console.log('CheckoutSuccessPage: Payment succeeded! Setting status to success');
        setPaymentStatus('success');
      } else if (data.status === 'canceled' || data.status === 'requires_payment_method') {
        setPaymentStatus('failed');
        setErrorMessage('Payment was not completed successfully.');
      } else if (data.status === 'processing') {
        // Payment is still processing - wait a bit and retry (max 3 retries)
        if (retryCount < 3) {
          setTimeout(() => {
            verifyPaymentStatus(paymentIntentId, retryCount + 1);
          }, 2000);
        } else {
          // After max retries, show as processing
          setPaymentStatus('failed');
          setErrorMessage('Payment is still processing. Please check back in a few minutes or contact support.');
        }
      } else {
        // Other intermediate states
        setPaymentStatus('failed');
        setErrorMessage(`Payment status: ${data.status}. Please contact support if you were charged.`);
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      
      // If we've retried a few times and still failing, show error
      if (retryCount >= 2) {
        setPaymentStatus('failed');
        setErrorMessage(`Unable to verify payment status. Please contact support with payment ID: ${paymentIntentId}`);
      } else {
        // Retry once more
        setTimeout(() => {
          verifyPaymentStatus(paymentIntentId, retryCount + 1);
        }, 1000);
      }
    }
  };

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
            If you were charged, please contact support with your payment intent ID.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            to="/store/cart"
            className="inline-block bg-[#0b84ff] hover:bg-[#0a74d1] text-white font-semibold py-3 px-8 rounded-full transition active:scale-[1.02]"
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
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-3xl font-bold text-green-400 mb-4">Payment Successful!</h1>
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
                    bg-[#f3c000] text-black font-semibold hover:bg-[#e4b300]
                    active:scale-[1.02] transition no-ring"
        >
                    ← Continue Shopping
          </Link>
      </div>
    </div>
  );
}
