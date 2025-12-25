import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { apiUrl } from '@/utils/api';
import type { Beat } from '@/types/Beat';

interface PayPalCheckoutButtonProps {
    cartItems: Beat[];
    email: string;
    onSuccess: (orderId: string) => void;
    onError: (error: string) => void;
}

export default function PayPalCheckoutButton({
    cartItems,
    email,
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
            <PayPalButtons
                style={{
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'rect',
                    label: 'paypal',
                }}
                createOrder={async () => {
                    try {
                        // Create PayPal order on our backend
                        const response = await fetch(apiUrl('/api/checkout/paypal/create-order'), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                items: cartItems.map((beat: Beat) => ({
                                    beatId: beat.id,
                                    quantity: 1,
                                })),
                                customerEmail: email,
                            }),
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to create order');
                        }

                        const data = await response.json();
                        return data.orderId;
                    } catch (error: any) {
                        console.error('Error creating PayPal order:', error);
                        onError(error.message || 'Failed to create order');
                        throw error;
                    }
                }}
                onApprove={async (data) => {
                    try {
                        console.log('PayPal order approved:', data.orderID);

                        // Capture the order on our backend
                        const response = await fetch(apiUrl('/api/checkout/paypal/capture-order'), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                orderId: data.orderID,
                            }),
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to capture payment');
                        }

                        const result = await response.json();
                        console.log('Payment captured successfully:', result);

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
                    console.log('PayPal payment cancelled by user');
                    onError('Payment was cancelled');
                }}
            />
        </>
    );
}

