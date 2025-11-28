# Stripe Payment Integration - Step-by-Step Guide

This guide walks you through setting up Stripe payment integration for MuzBeats.

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database set up and running
- Stripe account (free to create)

---

## 🚀 Step-by-Step Instructions

### Step 1: Install Stripe SDK (Server)

```bash
cd server
npm install stripe
```

**What this does:** Installs the Stripe Node.js SDK for server-side payment processing.

---

### Step 2: Get Your Stripe API Keys

1. **Create/Login to Stripe Account:**
   - Go to https://dashboard.stripe.com/register
   - Sign up or log in (it's free!)

2. **Get Your Test Keys:**
   - Once logged in, go to **Developers → API keys**
   - You'll see two keys:
     - **Publishable key** (starts with `pk_test_`)
     - **Secret key** (starts with `sk_test_`)
   - **Important:** Use test keys during development!

3. **Copy Both Keys:**
   - Keep them handy for the next step

---

### Step 3: Add Stripe Keys to Environment Variables

**Edit `server/.env` file:**

Add these lines (replace with your actual keys):

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**Example:**
```env
STRIPE_SECRET_KEY=sk_test_51AbC123...
STRIPE_PUBLISHABLE_KEY=pk_test_51XyZ789...
```

**Important:**
- Never commit `.env` to git (already gitignored ✅)
- Use test keys (`sk_test_` and `pk_test_`) during development
- Switch to live keys (`sk_live_` and `pk_live_`) only in production

---

### Step 4: Install Stripe.js (Client)

```bash
# From project root, go to client directory
cd ../client
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**What this does:** Installs Stripe.js libraries for React frontend integration.

---

### Step 5: Add Stripe Publishable Key to Client Environment

**Create `client/.env` file** (if it doesn't exist):

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**Note:** 
- Vite requires `VITE_` prefix for environment variables
- Use the same publishable key from Step 3

---

### Step 6: Restart Your Development Servers

**Terminal 1 - Backend:**
```bash
cd server
# Stop current server (Ctrl+C)
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
# Stop current server (Ctrl+C)
npm run dev
```

**Why restart?** Environment variables are loaded when the server starts.

---

## 🧪 Testing the Integration

### Test 1: Verify Backend Endpoint

**Create a test payment intent:**

```bash
curl -X POST http://localhost:3000/api/checkout/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"beatId": "your-beat-id-here", "quantity": 1}
    ]
  }'
```

**Expected response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 500,
  "currency": "usd"
}
```

**If you get an error:**
- Check Stripe keys are correct in `server/.env`
- Check server is running on port 3000
- Check database has beats (use a real beat ID)

---

### Test 2: Test Frontend Checkout Flow

1. **Start both servers** (if not already running)

2. **Navigate to the store:**
   - Go to http://localhost:5173/store

3. **Add items to cart:**
   - Click on any beat
   - Click "Add to Cart"

4. **Go to checkout:**
   - Click cart icon in navbar
   - Click "Proceed to Checkout" or "Checkout" button

5. **Test payment:**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., 12/25)
   - Any 3-digit CVC (e.g., 123)
   - Any ZIP code (e.g., 12345)

6. **Complete payment:**
   - Fill in email (optional)
   - Click "Pay $X.XX"
   - Should redirect to success page

---

## 📁 Files Created

### Backend Files:
- ✅ `server/src/config/stripe.ts` - Stripe client initialization
- ✅ `server/src/services/checkoutService.ts` - Payment intent logic
- ✅ `server/src/controllers/checkoutController.ts` - HTTP handlers
- ✅ `server/src/routes/checkoutRoutes.ts` - API routes
- ✅ Updated `server/src/index.ts` - Added checkout routes

### Frontend Files:
- ✅ `client/src/pages/CheckoutPage.tsx` - Checkout form with Stripe Elements
- ✅ `client/src/pages/CheckoutSuccessPage.tsx` - Success page
- ✅ Updated `client/src/App.tsx` - Added checkout routes
- ✅ Updated `client/src/pages/CartPage.tsx` - Added checkout navigation

---

## 🔍 API Endpoints

### POST `/api/checkout/create-payment-intent`

Creates a Stripe Payment Intent for the cart.

**Request:**
```json
{
  "items": [
    {"beatId": "uuid-here", "quantity": 1}
  ],
  "customerEmail": "customer@example.com" // optional
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 500,
  "currency": "usd"
}
```

### GET `/api/checkout/payment-intent/:id`

Get payment intent status.

**Response:**
```json
{
  "id": "pi_xxx",
  "status": "succeeded",
  "amount": 500,
  "currency": "usd",
  "metadata": {...}
}
```

---

## 🧪 Stripe Test Cards

Use these test cards in Stripe test mode:

| Card Number | Description |
|------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

**Other test details:**
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

---

## 🐛 Troubleshooting

### Error: "STRIPE_SECRET_KEY is not set"

**Solution:**
- Check `server/.env` file exists
- Check key is named exactly `STRIPE_SECRET_KEY`
- Restart server after adding to `.env`

### Error: "Invalid API Key"

**Solution:**
- Verify you're using test keys (`sk_test_` and `pk_test_`)
- Check for typos or extra spaces
- Make sure keys are from the same Stripe account

### Error: "No valid beats found in cart"

**Solution:**
- Check beat IDs exist in database
- Verify database connection
- Check beat IDs are valid UUIDs

### Frontend: "Stripe Elements not loading"

**Solution:**
- Check `VITE_STRIPE_PUBLISHABLE_KEY` in `client/.env`
- Restart frontend dev server
- Check browser console for errors

### Payment fails silently

**Solution:**
- Check browser console for errors
- Check server logs for errors
- Verify Stripe keys are correct
- Try a different test card

---

## 🔐 Security Notes

1. **Never commit `.env` files** - Already gitignored ✅
2. **Use test keys in development** - Safe to use in local dev
3. **Switch to live keys only in production** - When ready to accept real payments
4. **Keep secret keys secret** - Never expose `sk_` keys in frontend code
5. **Use HTTPS in production** - Required for Stripe in production

---

## 📚 Next Steps

After Stripe integration is working:

1. **Order Management System** - Create orders table and track purchases
2. **Download Token System** - Generate secure download links after payment
3. **Webhook Handler** - Handle payment events from Stripe
4. **Email Service** - Send order confirmations and download links

See `PROJECT_STATUS.md` for full roadmap.

---

## 🎉 Success Checklist

- [ ] Stripe SDK installed on server
- [ ] Stripe.js installed on client
- [ ] API keys added to `server/.env`
- [ ] Publishable key added to `client/.env`
- [ ] Backend endpoint returns payment intent
- [ ] Frontend checkout page loads
- [ ] Test payment completes successfully
- [ ] Success page displays after payment

---

**Need Help?** Check the Stripe documentation: https://stripe.com/docs

**Last Updated:** November 2025

