# Payment Flow & Receipt System Explained

## 📧 What is `receipt_email` in Stripe?

The `receipt_email` parameter you're passing to Stripe does the following:

**Stripe automatically sends a basic receipt email** when payment succeeds. This receipt includes:
- Payment amount
- Transaction ID
- Date/time
- Basic payment details

**However, this is NOT enough for a beat store** because:
- ❌ No download links
- ❌ No list of purchased beats
- ❌ No custom branding
- ❌ No way to track orders in your database

## 🔄 Complete Payment Flow (Current vs. Ideal)

### Current Flow (What You Have Now)

```
1. Customer enters email in checkout form
2. Customer enters card details
3. Payment succeeds
4. Stripe sends basic receipt email (automatic)
5. Customer sees success page
6. ❌ No order tracking in database
7. ❌ No download links generated
8. ❌ No custom email with beats
```

### Ideal Flow (What You Should Build)

```
1. Customer enters email in checkout form
2. Customer enters card details
3. Payment succeeds
4. Stripe sends basic receipt email (automatic) ✅
5. Webhook fires: payment_intent.succeeded
6. Your backend receives webhook
7. Backend creates order record in database ✅
8. Backend generates secure download tokens ✅
9. Backend sends custom email with download links ✅
10. Customer sees success page with download links ✅
```

## 🗄️ What You Need to Track in Your Database

You **absolutely need** to track orders because:

1. **Customer Support**: "I lost my download link" - you need to look up their order
2. **Download Links**: Generate secure, time-limited download tokens
3. **Analytics**: Track sales, popular beats, revenue
4. **Refunds**: If someone requests a refund, you need to know what they bought
5. **Legal/Accounting**: Records of all transactions

### Database Tables You Need

```sql
-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email VARCHAR(255) NOT NULL,
  total_amount INTEGER NOT NULL, -- in cents
  status VARCHAR(50) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items table (which beats were purchased)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  beat_id UUID REFERENCES beats(id),
  price_at_purchase INTEGER NOT NULL, -- in cents (price may change later)
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Download tokens table (secure download links)
CREATE TABLE download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  beat_id UUID REFERENCES beats(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Recommended Approach

### Option 1: Keep Stripe Receipt + Add Custom Email (Recommended)

**Pros:**
- Stripe receipt = official payment record (good for accounting)
- Custom email = great UX with download links
- Customer gets both (redundancy is good)

**Flow:**
1. Keep `receipt_email` in your code (Stripe sends basic receipt)
2. Add webhook handler for `payment_intent.succeeded`
3. In webhook: create order in database
4. In webhook: generate download tokens
5. In webhook: send custom email with download links via your email service (SendGrid, AWS SES, etc.)

### Option 2: Disable Stripe Receipt, Only Custom Email

**Pros:**
- Full control over email content
- Simpler (one email instead of two)

**Cons:**
- No automatic Stripe receipt (might be useful for records)
- More work to set up email service

## 📝 What You Need to Build Next

### 1. Webhook Handler (Critical)

```typescript
// server/src/routes/webhookRoutes.ts
POST /api/webhooks/stripe
- Verify webhook signature (security!)
- Handle payment_intent.succeeded event
- Create order in database
- Generate download tokens
- Send custom email
```

### 2. Order Service

```typescript
// server/src/services/orderService.ts
- createOrder(paymentIntentId, email, beats)
- generateDownloadTokens(orderId)
- sendDownloadEmail(orderId)
```

### 3. Email Service

```typescript
// server/src/services/emailService.ts
- sendDownloadEmail(email, order, downloadLinks)
- Use SendGrid, AWS SES, or similar
```

### 4. Download Endpoint

```typescript
// server/src/routes/downloadRoutes.ts
GET /api/downloads/:token
- Validate token
- Check expiration
- Check download count
- Serve WAV/MP3 file
```

## 🎬 Summary

**Current State:**
- ✅ Stripe sends basic receipt (automatic)
- ❌ No order tracking
- ❌ No download links
- ❌ No custom email

**What `receipt_email` Does:**
- Stripe automatically emails a basic payment receipt
- This is separate from your custom email system
- Good to keep for official records

**What You Still Need:**
- Database tables for orders
- Webhook handler to process successful payments
- Order creation service
- Download token generation
- Custom email service with download links

**Bottom Line:** Stripe's receipt is just a basic payment confirmation. You still need to build your own order system for download links, customer support, and analytics.

