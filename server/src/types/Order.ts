export type OrderStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Order {
    id: string;
    customer_email: string;
    total_amount: number; // stored as DECIMAL(10,2) in DB
    status: OrderStatus;
    stripe_payment_intent_id: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface OrderItem {
    id: string;
    order_id: string;
    beat_id: string;
    price_at_purchase: number; // DECIMAL(10,2)
    quantity: number;
    created_at: Date;
}

export interface DownloadToken {
    id: string;
    order_id: string;
    beat_id: string;
    download_token: string;
    expires_at: Date;
    download_count: number;
    max_downloads: number;
    created_at: Date;
}
