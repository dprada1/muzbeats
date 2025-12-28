-- Add paypal_order_id column to orders table
-- This stores PayPal order IDs for PayPal payments
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON orders(paypal_order_id);

-- Add comment
COMMENT ON COLUMN orders.paypal_order_id IS 'PayPal order ID for PayPal payments';

