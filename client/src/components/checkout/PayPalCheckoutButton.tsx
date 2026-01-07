import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { apiUrl } from '@/utils/api';
import type { Beat } from '@/types/Beat';
import { validatedFetch, PayPalCreateOrderResponseSchema, PayPalCaptureOrderResponseSchema } from '@/utils/apiValidation';

interface PayPalCheckoutButtonProps {
    cartItems: Beat[];
    onSuccess: (orderId: string) => void;
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
                    } catch (error: any) {
                        console.error('Error creating PayPal order:', error);
                        onError(error.message || 'Failed to create order');
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

                        // Call success handler with our database order ID
                        onSuccess(result.orderId);
                    } catch (error: any) {
                        console.error('Error capturing PayPal order:', error);
                        onError(error.message || 'Failed to complete payment');
                    }
                }}
                onError={(err) => {
                    console.error('PayPal Buttons error:', err);
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

