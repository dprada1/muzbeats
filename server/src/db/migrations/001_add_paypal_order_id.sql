-- Add paypal_order_id column to orders table
-- This allows storing both Stripe and PayPal payment IDs
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON orders(paypal_order_id);

-- Add comment
COMMENT ON COLUMN orders.paypal_order_id IS 'PayPal order ID for PayPal payments (mutually exclusive with stripe_payment_intent_id)';

