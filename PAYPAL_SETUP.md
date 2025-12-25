# PayPal Integration Setup Guide

## Overview

MuzBeats now supports **both Stripe and PayPal** for payments! PayPal is particularly useful for international sellers (like Uruguay) who can't verify US Stripe accounts.

---

## How It Works

1. **Payment Provider Selection**: If both Stripe and PayPal are configured, customers can choose their preferred payment method
2. **Default Provider**: If only one is configured, that one is used automatically
3. **Stripe Preserved**: All existing Stripe code remains intact - nothing was deleted!

---

## Environment Variables Needed

### Backend (`server/.env`)

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_MODE=sandbox  # or "live" for production

# Existing Stripe Configuration (kept for compatibility)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Frontend (`client/.env`)

```env
# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id_here

# Existing Stripe Configuration (kept for compatibility)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Getting PayPal Credentials

### Step 1: Go to PayPal Developer Dashboard

1. Visit: https://developer.paypal.com/dashboard/
2. Log in with your PayPal Uruguay account

### Step 2: Create an App

1. Click "Apps & Credentials"
2. Make sure you're in **"Sandbox"** mode (for testing)
3. Click **"Create App"**
4. Name it "MuzBeats" or similar
5. Click "Create App"

### Step 3: Get Your Credentials

You'll see two keys:
- **Client ID** - This is your `PAYPAL_CLIENT_ID` (use in both backend and frontend)
- **Secret** - This is your `PAYPAL_CLIENT_SECRET` (backend only, keep secret!)

### Step 4: Add to Environment Variables

**Backend** (`server/.env`):
```env
PAYPAL_CLIENT_ID=AYour...ClientID...Here
PAYPAL_CLIENT_SECRET=EYour...Secret...Here
PAYPAL_MODE=sandbox
```

**Frontend** (`client/.env`):
```env
VITE_PAYPAL_CLIENT_ID=AYour...ClientID...Here
```

---

## Database Migration

Run this migration to add PayPal support to the orders table:

```bash
cd server
psql $DATABASE_URL -f src/db/migrations/001_add_paypal_order_id.sql
```

Or manually run:
```sql
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON orders(paypal_order_id);
```

---

## Testing Locally

### 1. Set Environment Variables

Add PayPal credentials to both `server/.env` and `client/.env` (see above).

### 2. Restart Servers

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### 3. Test Purchase Flow

1. Go to http://localhost:5173/store
2. Add beats to cart
3. Go to checkout
4. You should see **both** "PayPal" and "Credit Card" payment options
5. Select "PayPal"
6. Enter your email
7. Click the yellow PayPal button
8. You'll be redirected to PayPal sandbox
9. Use PayPal sandbox test credentials to complete payment
10. You'll be redirected back and should receive download email

### PayPal Sandbox Test Accounts

PayPal automatically creates test accounts. To find them:
1. Go to https://developer.paypal.com/dashboard/
2. Click "Sandbox" → "Accounts"
3. Use the "Personal" account to test as a buyer

---

## Deploying to Production

### Railway Environment Variables

Add these to your Railway services:

**Backend Service:**
- `PAYPAL_CLIENT_ID` = (from PayPal live app)
- `PAYPAL_CLIENT_SECRET` = (from PayPal live app)
- `PAYPAL_MODE` = `live`

**Frontend Service:**
- `VITE_PAYPAL_CLIENT_ID` = (from PayPal live app)

### Switching to Live Mode

1. Go to PayPal Developer Dashboard
2. Switch from "Sandbox" to "Live"
3. Create a new app (or use existing)
4. Get new Live credentials
5. Update Railway environment variables
6. Redeploy both services

---

## Payment Flow Comparison

### Stripe Flow
1. Customer enters card details
2. Stripe processes payment
3. Webhook or API confirms payment
4. Order created in database
5. Download email sent

### PayPal Flow
1. Customer clicks PayPal button
2. Redirected to PayPal to login
3. Approves payment on PayPal
4. Redirected back to site
5. Backend captures payment
6. Order created in database
7. Download email sent

---

## Troubleshooting

### "PayPal Not Configured" Error
- Check that `VITE_PAYPAL_CLIENT_ID` is set in `client/.env`
- Restart the frontend dev server after adding env vars

### "Failed to create PayPal order" Error
- Check that `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set in `server/.env`
- Check that `PAYPAL_MODE` is set to `sandbox` for testing
- Restart the backend dev server

### PayPal Button Not Showing
- Check browser console for errors
- Make sure PayPal client ID starts with correct prefix
- Try clearing browser cache and hard refresh

### Database Error: "column paypal_order_id does not exist"
- Run the migration: `psql $DATABASE_URL -f server/src/db/migrations/001_add_paypal_order_id.sql`

---

## Code Structure

### Backend
- `server/src/config/paypal.ts` - PayPal SDK configuration
- `server/src/services/paypalService.ts` - PayPal order creation/capture logic
- `server/src/controllers/paypalController.ts` - API endpoints for PayPal
- `server/src/routes/checkoutRoutes.ts` - Routes (both Stripe + PayPal)
- `server/src/services/orderService.ts` - Database order creation (both providers)

### Frontend
- `client/src/pages/CheckoutPage.tsx` - Main checkout with provider selection
- `client/src/components/checkout/PayPalCheckoutButton.tsx` - PayPal button component

---

## Notes

- ✅ **Stripe code is preserved** - Nothing was deleted, both providers work side-by-side
- ✅ **Backward compatible** - If only Stripe is configured, it works as before
- ✅ **PayPal works in Uruguay** - No SSN required, just Uruguayan ID + bank account
- ✅ **Lower fees with business account** - ~5-6% for PayPal vs ~10% for Gumroad

---

## Next Steps

1. Get PayPal sandbox credentials
2. Add to environment variables
3. Run database migration
4. Test locally
5. If works, get PayPal live credentials
6. Deploy to production
7. Start making sales! 💰

