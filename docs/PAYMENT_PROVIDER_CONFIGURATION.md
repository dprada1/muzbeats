# Payment Provider Configuration

This document explains how to enable/disable payment providers (Stripe and PayPal) in the MuzBeats application.

## Overview

MuzBeats supports two payment providers:
- **PayPal**: For international payments
- **Stripe**: For credit/debit card payments (requires SSN verification in the US)

The application is designed with **backend-first security** - the frontend dynamically queries the backend to determine which payment providers are available, preventing any frontend tampering.

## Environment Variables

### Backend (server/.env)

#### Stripe Configuration

```bash
# Enable/Disable Stripe (set to "false" to completely disable)
ENABLE_STRIPE=false

# Stripe API Keys (only needed if ENABLE_STRIPE is true or unset)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### PayPal Configuration

```bash
# PayPal credentials (if missing, PayPal will be automatically disabled)
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret

# PayPal mode: "sandbox" for testing, "live" for production
PAYPAL_MODE=sandbox
```

### Frontend (client/.env)

**Important**: The frontend NO LONGER needs `VITE_STRIPE_PUBLISHABLE_KEY` or `VITE_PAYPAL_CLIENT_ID`. These are now fetched dynamically from the backend at runtime.

You can remove these variables from `client/.env` if they exist.

## How It Works

### 1. Backend Configuration Check

On startup, the backend logs which payment providers are enabled:

```
💳 Stripe payment provider: DISABLED
💰 PayPal payment provider: ENABLED (sandbox)
```

### 2. Frontend Dynamic Loading

The frontend calls `GET /api/checkout/config` to determine available payment methods:

```json
{
  "stripe": {
    "enabled": false,
    "publishableKey": null
  },
  "paypal": {
    "enabled": true,
    "clientId": "AZD..."
  }
}
```

### 3. Backend Route Protection

If Stripe is disabled (`ENABLE_STRIPE=false`), all Stripe-related endpoints will return `403 Forbidden`:
- `POST /api/checkout/create-payment-intent`
- `GET /api/checkout/payment-intent/:id`
- `POST /api/checkout/process-payment`

This prevents anyone from using Stripe even if they tamper with the frontend.

## Production Configuration

### Recommended Setup

For production **without SSN verification**, disable Stripe completely:

```bash
# Production backend (Railway)
ENABLE_STRIPE=false
PAYPAL_CLIENT_ID=<your_live_paypal_client_id>
PAYPAL_CLIENT_SECRET=<your_live_paypal_client_secret>
PAYPAL_MODE=live
```

**Result**: Only PayPal will be shown to customers. Stripe is completely inaccessible.

### Future: Enabling Stripe (when you have SSN)

When you complete Stripe verification and want to enable Stripe:

```bash
# Production backend (Railway)
ENABLE_STRIPE=true  # <-- Simply change this to true
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

PAYPAL_CLIENT_ID=<your_live_paypal_client_id>
PAYPAL_CLIENT_SECRET=<your_live_paypal_client_secret>
PAYPAL_MODE=live
```

**Result**: Both PayPal and Stripe will be shown, and customers can choose their preferred payment method.

## Testing Locally

### Test with both providers enabled:

```bash
# server/.env
ENABLE_STRIPE=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
PAYPAL_CLIENT_ID=<sandbox_client_id>
PAYPAL_CLIENT_SECRET=<sandbox_secret>
PAYPAL_MODE=sandbox
```

### Test with only PayPal (production simulation):

```bash
# server/.env
ENABLE_STRIPE=false
PAYPAL_CLIENT_ID=<sandbox_client_id>
PAYPAL_CLIENT_SECRET=<sandbox_secret>
PAYPAL_MODE=sandbox
```

### Test with only Stripe:

```bash
# server/.env
ENABLE_STRIPE=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
# (Don't set PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET)
```

## Security Benefits

1. **Backend Control**: The backend decides which payment methods are available, not the frontend
2. **No Frontend Tampering**: Even if someone modifies the frontend code to show Stripe, the backend will reject the request
3. **Easy Toggle**: Changing `ENABLE_STRIPE` in production takes effect immediately on next deploy
4. **Safe Default**: If `ENABLE_STRIPE` is not set, Stripe is enabled by default (backward compatible)

## Troubleshooting

### "No payment methods available"

**Cause**: Both Stripe and PayPal are disabled.

**Solution**: 
- Set `ENABLE_STRIPE=true` and provide Stripe keys, OR
- Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`

### Stripe shows error "not enabled on this server"

**Cause**: `ENABLE_STRIPE=false` in backend env

**Solution**: This is expected if you've disabled Stripe. To re-enable, set `ENABLE_STRIPE=true`

### PayPal doesn't show up

**Cause**: `PAYPAL_CLIENT_ID` or `PAYPAL_CLIENT_SECRET` is missing

**Solution**: Add PayPal credentials to `server/.env`

## Summary

- **To disable Stripe**: Set `ENABLE_STRIPE=false` in backend env
- **To enable Stripe**: Set `ENABLE_STRIPE=true` and provide Stripe keys
- **To disable PayPal**: Remove `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`
- **To enable PayPal**: Add `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`
- **Frontend**: No changes needed - it adapts automatically!


