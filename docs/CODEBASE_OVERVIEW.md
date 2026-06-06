# MuzBeats Codebase Overview
**Complete Guide to Understanding Your Application**

---

## 🏗️ Architecture Overview

### High-Level Flow

```
User Browser
    ↓
React Frontend (Vite)
    ↓ HTTP/REST API
Express Backend (Node.js)
    ↓
PostgreSQL Database
    ↓
Cloudflare R2 (Media Storage)
```

### Technology Stack

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS
- React Router (routing)
- PayPal React SDK

**Backend:**
- Express 5 + TypeScript
- PostgreSQL (database)
- PayPal Server SDK
- Resend (email)
- AWS SDK (for R2)

**Infrastructure:**
- Railway (backend + database)
- Cloudflare Pages (frontend)
- Cloudflare R2 (media storage)

---

## 📁 Project Structure

```
muzbeats/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── checkout/     # PayPal checkout button
│   │   │   ├── NavBar/       # Navigation bar
│   │   │   └── ...
│   │   ├── pages/            # Route pages
│   │   │   ├── StorePage.tsx      # Main store (browse beats)
│   │   │   ├── CartPage.tsx        # Shopping cart + PayPal
│   │   │   ├── BeatDetail.tsx      # Single beat view
│   │   │   └── CheckoutSuccessPage.tsx
│   │   ├── context/          # React Context (state management)
│   │   │   ├── CartContext.tsx     # Shopping cart state
│   │   │   ├── PlayerContext.tsx   # Audio player state
│   │   │   └── SearchContext.tsx  # Search state
│   │   ├── utils/            # Utility functions
│   │   │   └── api.ts       # API URL helpers
│   │   └── types/           # TypeScript types
│   └── package.json
│
├── server/                   # Express backend
│   ├── src/
│   │   ├── config/          # Configuration
│   │   │   ├── database.ts  # PostgreSQL connection
│   │   │   └── paypal.ts   # PayPal SDK setup
│   │   ├── controllers/     # HTTP request handlers
│   │   │   ├── beatsController.ts      # Beat CRUD
│   │   │   ├── paypalController.ts     # PayPal payments
│   │   │   └── downloadController.ts  # File downloads
│   │   ├── routes/          # API route definitions
│   │   │   ├── beatsRoutes.ts
│   │   │   ├── checkoutRoutes.ts
│   │   │   └── downloadRoutes.ts
│   │   ├── services/         # Business logic
│   │   │   ├── beatsService.ts        # Beat queries
│   │   │   ├── paypalService.ts       # PayPal integration
│   │   │   ├── orderService.ts        # Order creation
│   │   │   ├── downloadService.ts     # Download tokens
│   │   │   └── emailService.ts        # Email sending
│   │   ├── utils/           # Utility functions
│   │   │   └── r2.ts        # R2 URL helpers
│   │   ├── db/              # Database scripts
│   │   │   ├── initializeDatabase.ts   # Schema bootstrap (server + npm run init-db)
│   │   │   └── migrations/  # Schema migrations
│   │   └── index.ts         # Server entry point
│   ├── public/              # Static assets (served by Express)
│   │   └── assets/
│   │       ├── images/       # Cover images
│   │       └── beats/         # Audio files (local dev)
│   └── package.json
│
└── docs/                    # Documentation
```

---

## 🔄 Key Data Flows

### 1. Browse Beats Flow

```
User visits /store
    ↓
StorePage.tsx renders
    ↓
Fetches: GET /api/beats?q=search
    ↓
beatsController.getAllBeatsHandler()
    ↓
beatsService.getAllBeats()
    ↓
PostgreSQL query: SELECT * FROM beats WHERE ...
    ↓
Returns beats array
    ↓
Frontend displays beat cards
```

**Files:**
- `client/src/pages/StorePage.tsx`
- `server/src/routes/beatsRoutes.ts`
- `server/src/controllers/beatsController.ts`
- `server/src/services/beatsService.ts`

---

### 2. Purchase Flow (PayPal)

```
User adds beats to cart
    ↓
User clicks PayPal button in CartPage
    ↓
PayPalCheckoutButton.createOrder()
    ↓
POST /api/checkout/paypal/create-order
    ↓
paypalController.createPayPalOrderHandler()
    ↓
paypalService.createPayPalOrder()
    ↓
- Fetches beat prices from database
- Creates PayPal order via SDK
- Stores beat IDs in memory (orderDataStore)
    ↓
Returns PayPal order ID
    ↓
Frontend redirects to PayPal
    ↓
User approves payment on PayPal
    ↓
PayPal redirects back to frontend
    ↓
PayPalCheckoutButton.onApprove()
    ↓
POST /api/checkout/paypal/capture-order
    ↓
paypalController.capturePayPalOrderHandler()
    ↓
- Captures PayPal order
- Checks idempotency (prevents duplicates)
- orderService.createOrderFromPayPalCapture()
    ↓
- Creates order in database
- Creates order_items
- Generates download tokens
- Stores in downloads table
    ↓
emailService.sendDownloadEmail()
    ↓
Sends email with download links
    ↓
User receives email with download links
```

**Files:**
- `client/src/pages/CartPage.tsx`
- `client/src/components/checkout/PayPalCheckoutButton.tsx`
- `server/src/routes/checkoutRoutes.ts`
- `server/src/controllers/paypalController.ts`
- `server/src/services/paypalService.ts`
- `server/src/services/orderService.ts`
- `server/src/services/emailService.ts`

---

### 3. Download Flow

```
User clicks download link in email
    ↓
GET /api/downloads/:token
    ↓
downloadController.downloadBeatHandler()
    ↓
downloadService.validateDownloadToken(token)
    ↓
- Checks token exists in database
- Checks expiration (30 days)
- Checks download limit (5 max)
    ↓
If valid:
    ↓
- Increments download count
- Checks if WAV file exists
    ↓
If WAV exists:
    - Streams from private R2 bucket
    - OR serves from local filesystem
    ↓
If no WAV (dev only):
    - Falls back to MP3 (dev only)
    - Production: Returns error
    ↓
File streamed to user
```

**Files:**
- `server/src/routes/downloadRoutes.ts`
- `server/src/controllers/downloadController.ts`
- `server/src/services/downloadService.ts`

---

## 🗄️ Database Schema

### Tables

**1. `beats`**
```sql
- id (UUID, PRIMARY KEY)
- title (VARCHAR)
- key (VARCHAR) - e.g., "A minor"
- bpm (INTEGER)
- price (DECIMAL)
- audio_path (VARCHAR) - Path to MP3 preview
- cover_path (VARCHAR) - Path to cover image
- created_at, updated_at
```

**2. `orders`**
```sql
- id (UUID, PRIMARY KEY)
- customer_email (VARCHAR)
- total_amount (DECIMAL)
- status (VARCHAR) - 'pending', 'completed', 'failed', 'refunded'
- paypal_order_id (VARCHAR, UNIQUE)
- created_at, updated_at
```

**3. `order_items`**
```sql
- id (UUID, PRIMARY KEY)
- order_id (UUID, FK → orders)
- beat_id (UUID, FK → beats)
- price_at_purchase (DECIMAL) - Price at time of purchase
- quantity (INTEGER)
- created_at
```

**4. `downloads`**
```sql
- id (UUID, PRIMARY KEY)
- order_id (UUID, FK → orders)
- beat_id (UUID, FK → beats)
- download_token (VARCHAR, UNIQUE) - Secure token
- expires_at (TIMESTAMP) - 30 days from purchase
- download_count (INTEGER) - Current downloads
- max_downloads (INTEGER) - Max 5 downloads
- created_at
```

---

## 🔐 Security Architecture

### 1. Download Token Security

**Generation:**
- Uses `crypto.randomBytes(32)` (256-bit entropy)
- Base64url encoded (URL-safe)
- Stored in database with expiration

**Validation:**
- Token must exist in database
- Must not be expired (30 days)
- Must not exceed download limit (5)
- Counter incremented on each download

**Files:**
- `server/src/services/orderService.ts` (generation)
- `server/src/services/downloadService.ts` (validation)

---

### 2. Payment Security

**PayPal Integration:**
- Order created on backend (not frontend)
- Beat IDs stored in-memory temporarily
- PayPal order verified before database order creation
- Idempotency check prevents duplicate orders
- Amount validated from PayPal (not trusted from client)

**Files:**
- `server/src/services/paypalService.ts`
- `server/src/controllers/paypalController.ts`

---

### 3. SQL Injection Protection

**All queries use parameterized queries:**
```typescript
await pool.query(
    'SELECT * FROM beats WHERE id = $1',
    [beatId]  // Never concatenated
);
```

**Never do this:**
```typescript
// ❌ BAD - SQL injection risk
await pool.query(`SELECT * FROM beats WHERE id = '${beatId}'`);
```

---

## 🌐 API Endpoints

### Beats API

**GET `/api/beats`**
- Query params: `?q=search&bpm=140&key=A+minor`
- Returns: Array of beats
- Controller: `beatsController.getAllBeatsHandler()`

**GET `/api/beats/:id`**
- Returns: Single beat by ID
- Controller: `beatsController.getBeatByIdHandler()`

---

### Checkout API

**GET `/api/checkout/config`**
- Returns: Payment provider configuration
- Response: `{ paypal: { enabled: true, clientId: "..." } }`

**POST `/api/checkout/paypal/create-order`**
- Body: `{ items: [{ beatId: "uuid", quantity: 1 }] }`
- Returns: `{ orderId: "paypal_order_id", ... }`
- Controller: `paypalController.createPayPalOrderHandler()`

**POST `/api/checkout/paypal/capture-order`**
- Body: `{ orderId: "paypal_order_id" }`
- Returns: `{ success: true, orderId: "db_order_id", ... }`
- Controller: `paypalController.capturePayPalOrderHandler()`

**GET `/api/checkout/paypal/order/:id`**
- Returns: PayPal order status
- Controller: `paypalController.getPayPalOrderHandler()`

---

### Downloads API

**GET `/api/downloads/:token`**
- Validates token, checks expiration/limits
- Streams WAV file (or MP3 in dev)
- Controller: `downloadController.downloadBeatHandler()`

---

## 🎨 Frontend Architecture

### State Management

**React Context:**
- `CartContext` - Shopping cart state
- `PlayerContext` - Audio player state
- `SearchContext` - Search/filter state

**No Redux/Zustand** - Simple Context API is sufficient

---

### Routing

**Routes:**
- `/` → Redirects to `/store`
- `/store` → StorePage (browse beats)
- `/store/cart` → CartPage (cart + PayPal)
- `/store/beat/:beatId` → BeatDetail (single beat)
- `/store/checkout/success` → CheckoutSuccessPage
- `/store/license` → LicensePage

**File:** `client/src/App.tsx`

---

### Component Hierarchy

```
App
├── Layout
│   ├── NavBar
│   ├── <Outlet /> (page content)
│   └── PlayerBar
└── Routes
    ├── StorePage
    ├── CartPage
    ├── BeatDetail
    └── CheckoutSuccessPage
```

---

## 🔧 Configuration

### Environment Variables

**Backend (`server/.env`):**
```bash
# Database
DATABASE_URL=postgresql://...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox  # or "live"

# Email
RESEND_API_KEY=...
RESEND_FROM_EMAIL=MuzBeats <noreply@prodmuz.com>

# R2 Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=muzbeats-media-public
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# URLs
BACKEND_URL=https://api.prodmuz.com
FRONTEND_URL=https://www.prodmuz.com
CORS_ALLOWED_ORIGINS=https://www.prodmuz.com,https://prodmuz.com
```

**Frontend (`client/.env`):**
- No environment variables needed!
- Payment config fetched from backend at runtime

---

## 📦 Key Dependencies

### Backend
- `express` - Web framework
- `pg` - PostgreSQL client
- `@paypal/paypal-server-sdk` - PayPal integration
- `resend` - Email service
- `@aws-sdk/client-s3` - R2 storage
- `dotenv` - Environment variables
- `cors` - CORS middleware

### Frontend
- `react` + `react-dom` - UI framework
- `react-router-dom` - Routing
- `@paypal/react-paypal-js` - PayPal buttons
- `wavesurfer.js` - Audio waveform
- `tailwindcss` - Styling

---

## 🚀 Deployment

### Railway (Backend)

**Services:**
1. **Backend Service** - Express API
2. **Database Service** - PostgreSQL

**Environment Variables:**
- Set in Railway dashboard
- Separate for staging/production

---

### Cloudflare Pages (Frontend)

**Deployment:**
- Automatic on git push
- Separate deployments for `main` (prod) and `staging` branches

---

## 🔍 Key Concepts Explained

### 1. In-Memory Order Storage

**Why?**
- PayPal doesn't reliably return `customId` in order capture
- Need to store beat IDs between order creation and capture

**How?**
- `orderDataStore` Map in `paypalService.ts`
- Stores: `{ beatIds: string[] }`
- Cleared after retrieval (prevents memory leaks)

**Future:** Consider Redis for production (optional)

---

### 2. Download Token Lifecycle

1. **Generation** (on purchase):
   - `crypto.randomBytes(32)` → 256-bit random
   - Base64url encoded → URL-safe string
   - Stored in `downloads` table

2. **Validation** (on download):
   - Check token exists
   - Check expiration (30 days)
   - Check download count (< 5)

3. **Expiration:**
   - Tokens expire after 30 days
   - Max 5 downloads per token
   - Cannot be regenerated (security)

---

### 3. WAV vs MP3 Security

**MP3 (Previews):**
- Stored in public R2 bucket
- Served via public URLs
- Anyone can access (intentional)

**WAV (Masters):**
- Stored in private R2 bucket (or local filesystem)
- Served ONLY through `/api/downloads/:token`
- Never publicly accessible
- Requires valid download token

---

## 🐛 Common Issues & Solutions

### Issue: PayPal order created but no email sent

**Check:**
1. `RESEND_API_KEY` set in Railway?
2. `RESEND_FROM_EMAIL` verified domain?
3. Check backend logs for email errors
4. Check Resend dashboard for sent emails

---

### Issue: Download link returns 404

**Check:**
1. Token exists in database?
2. Token expired? (30 days)
3. Download limit reached? (5 max)
4. WAV file exists in R2/local?

---

### Issue: CORS errors

**Check:**
1. `CORS_ALLOWED_ORIGINS` includes frontend URL?
2. Frontend URL matches exactly (https vs http)?
3. Backend logs show CORS errors?

---

## 📚 Next Steps

1. ✅ **Code Review Complete** - See SECURITY_AUDIT.md
2. ✅ **Architecture Understood** - This document
3. 🚀 **Switch PayPal to Live Mode** - See below
4. 📢 **Start Driving Traffic** - Post on TikTok!

---

## 🎯 PayPal Live Mode Setup

### Step 1: Get Live Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Switch from **Sandbox** to **Live** mode
3. Create a new app (or switch existing)
4. Copy **Client ID** and **Secret**

### Step 2: Update Railway Production

**Backend Service → Variables:**
```bash
PAYPAL_CLIENT_ID=<your_live_client_id>
PAYPAL_CLIENT_SECRET=<your_live_secret>
PAYPAL_MODE=live
```

### Step 3: Test with Real Purchase

1. Make a small test purchase ($1-2)
2. Verify email received
3. Verify download works
4. Check PayPal dashboard for payment

### Step 4: Launch! 🚀

- Post on TikTok
- Drive traffic to prodmuz.com
- Start selling beats!

---

**You're ready to launch!** 🎉

