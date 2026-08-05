import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { apiUrl } from '@/api/api';
import type { Beat } from '@/types/Beat';
import { validatedFetch, PayPalCreateOrderResponseSchema, PayPalCaptureOrderResponseSchema } from '@/api/apiValidation';
import { sanitizeErrorMessage } from '@/security/errorSanitization';

interface PayPalCheckoutButtonProps {
    cartItems: Beat[];
    onSuccess: (orderId: string, emailSent: boolean) => void;
    onError: (error: string) => void;
}

export default function PayPalCheckoutButton({
    cartItems,
    onSuccess,
    onError,
}: PayPalCheckoutButtonProps) {
    const [{ isPending }] = usePayPalScriptReducer();

    return (
        <>
            {isPending && (
                <div className="text-zinc-400 text-sm py-4">
                    Loading PayPal...
                </div>
            )}
            <div className="paypal-buttons-container">
                <PayPalButtons
                    style={{
                        layout: 'vertical',
                        color: 'gold',
                        shape: 'pill',
                        label: 'paypal',
                        height: 48,
                        tagline: false, // Remove "Safer way to pay" tagline
                    }}
                    createOrder={async () => {
                        try {
                            // Create PayPal order on our backend
                            const data = await validatedFetch(
                                apiUrl('/api/checkout/paypal/create-order'),
                                PayPalCreateOrderResponseSchema,
                                {
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
                                }
                            );
                            return data.orderId;
                        } catch (error: unknown) {
                            if (import.meta.env.DEV) {
                                console.error('Error creating PayPal order:', error);
                            }
                            // Sanitize error message before showing to user
                            const userMessage = sanitizeErrorMessage(error, 'PayPal create order');
                            onError(userMessage);
                            throw error;
                        }
                    }}
                    onApprove={async (data) => {
                        try {
                            // Capture the order on our backend
                            const result = await validatedFetch(
                                apiUrl('/api/checkout/paypal/capture-order'),
                                PayPalCaptureOrderResponseSchema,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        orderId: data.orderID,
                                    }),
                                }
                            );

                            onSuccess(result.orderId, result.emailSent);
                        } catch (error: unknown) {
                            if (import.meta.env.DEV) {
                                console.error('Error capturing PayPal order:', error);
                            }
                            // Sanitize error message before showing to user
                            const userMessage = sanitizeErrorMessage(error, 'PayPal capture order');
                            onError(userMessage);
                        }
                    }}
                    onError={(err) => {
                        if (import.meta.env.DEV) {
                            console.error('PayPal Buttons error:', err);
                        }
                        onError('PayPal payment failed. Please try again.');
                    }}
                    onCancel={() => {
                        onError('Payment was cancelled');
                    }}
                />
            </div>
            <style>{`
                /* Reduce excessive spacing in PayPal container */
                .paypal-buttons-container {
                    margin-bottom: -1rem;
                }
                
                /* Reduce spacing between PayPal buttons */
                .paypal-buttons-container iframe {
                    margin-bottom: 0 !important;
                }
            `}</style>
        </>
    );
}

