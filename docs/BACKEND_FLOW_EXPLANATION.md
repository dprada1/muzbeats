# Backend Flow Explanation

This document explains how the MuzBeats backend works, from incoming requests to database interactions.

**Tracking:** Use [BACKEND_REVIEW_ROADMAP.md](./BACKEND_REVIEW_ROADMAP.md) for the full review checklist (Phases 0–9).

---

## 🏗️ Architecture Overview

The backend follows a **layered architecture**:

```
Request → Routes → Controllers → Services → Database
```

Each layer has a specific responsibility:
- **Routes**: Define URL endpoints and map them to controller functions
- **Controllers**: Handle HTTP requests/responses, validate input, call services
- **Services**: Contain business logic, interact with external APIs (PayPal, R2), and database
- **Database**: PostgreSQL stores all persistent data

---

## 📁 File Structure

```
server/src/
├── index.ts              # Main server file (Express setup, middleware)
├── routes/               # URL route definitions
│   ├── beatsRoutes.ts    # /api/beats endpoints
│   ├── checkoutRoutes.ts # /api/checkout endpoints
│   ├── downloadRoutes.ts # /api/downloads endpoints
│   └── webhookRoutes.ts  # /api/webhooks endpoints (empty for now)
├── controllers/          # Request handlers
│   ├── beatsController.ts
│   ├── paypalController.ts
│   └── downloadController.ts
├── services/             # Business logic
│   ├── beatsService.ts
│   ├── paypalService.ts
│   ├── orderService.ts
│   ├── downloadService.ts
│   └── emailService.ts
├── config/               # Configuration
│   ├── database.ts       # PostgreSQL connection pool
│   └── paypal.ts         # PayPal SDK client
├── utils/                # Utility functions
│   ├── searchParser.ts
│   ├── searchQueryBuilder.ts
│   ├── keyUtils.ts
│   └── r2.ts
└── types/                # TypeScript type definitions
    ├── Beat.ts
    ├── Order.ts
    └── SearchParams.ts
```

---

## 🚀 Server Startup (`index.ts`)

When the server starts (see [BACKEND_FIRST_PRINCIPLES.md](./BACKEND_FIRST_PRINCIPLES.md) for line-by-line detail):

1. **Load environment variables** from `.env` (and platform env on Railway)
2. **Create Express app** and register **middleware** (CORS, urlencoded, double-slash fix, webhooks before JSON, JSON parser, static `/assets`, `/health`)
3. **Register API routes** (`/api/beats`, `/api/checkout`, `/api/downloads`; webhooks mounted earlier)
4. **Initialize database schema** via `initializeDatabase()` — verifies/creates all four tables (`beats`, `orders`, `order_items`, `downloads`)
5. **Start listening** on `PORT` (default 3000) **only if step 4 succeeds**; otherwise `process.exit(1)`

The PostgreSQL connection pool is created when `@/config/database.js` is first imported (by `initializeDatabase`).

---

## 🔍 Flow 1: Getting Beats (Search/Browse)

**Endpoint:** `GET /api/beats` or `GET /api/beats/:id`

### Request Flow:

```
Frontend Request
    ↓
beatsRoutes.ts (router.get('/') or router.get('/:id'))
    ↓
beatsController.ts (getBeatsHandler or getBeatByIdHandler)
    ↓
beatsService.ts (getBeats or getBeatById)
    ↓
PostgreSQL Database (SELECT query)
    ↓
Response (JSON array or single Beat object)
```

### Step-by-Step:

1. **Frontend makes request:**
   ```typescript
   // Example: GET /api/beats?q=pierre%20160%20C%23min
   fetch('/api/beats?q=pierre 160 C#min')
   ```

2. **Route matches** (`beatsRoutes.ts`):
   ```typescript
   router.get('/', getBeatsHandler);  // Matches /api/beats
   router.get('/:id', getBeatByIdHandler); // Matches /api/beats/:id
   ```

3. **Controller handles request** (`beatsController.ts`):
   - Extracts query parameters (`q`, `bpm`, `key`, etc.) or URL param (`id`)
   - Parses search query if `q` parameter exists
   - Calls service function

4. **Service queries database** (`beatsService.ts`):
   - Builds SQL query with WHERE clauses (if search params provided)
   - Uses parameterized queries (`$1, $2, ...`) to prevent SQL injection
   - Maps database rows to Beat objects
   - Converts file paths to R2 URLs (if R2 configured)

5. **Response sent back:**
   ```json
   [
     {
       "id": "uuid",
       "title": "Beat Title",
       "key": "C#min",
       "bpm": 160,
       "price": 29.99,
       "audio": "https://r2-url.com/beats/mp3/beat.mp3",
       "cover": "https://r2-url.com/covers/cover.jpg"
     }
   ]
   ```

### Key Files:
- **Route:** `server/src/routes/beatsRoutes.ts` - Defines endpoints
- **Controller:** `server/src/controllers/beatsController.ts` - Handles HTTP logic
- **Service:** `server/src/services/beatsService.ts` - Database queries
- **Utils:** `server/src/utils/searchParser.ts` - Parses search queries
- **Utils:** `server/src/utils/searchQueryBuilder.ts` - Builds SQL WHERE clauses

---

## 💳 Flow 2: PayPal Checkout

**Endpoints:** 
- `POST /api/checkout/paypal/create-order`
- `POST /api/checkout/paypal/capture-order`
- `GET /api/checkout/config`

### Create Order Flow:

```
Frontend: User clicks "Pay with PayPal"
    ↓
POST /api/checkout/paypal/create-order
    ↓
paypalController.ts (createPayPalOrderHandler)
    ↓
paypalService.ts (createPayPalOrder)
    ↓
1. Fetch beats from database (get prices)
2. Calculate total amount
3. Create PayPal Order via PayPal SDK
4. Store beat IDs in memory (orderDataStore Map)
    ↓
Response: { orderId, approvalUrl, amount, currency }
    ↓
Frontend: Redirects user to PayPal approvalUrl
```

### Capture Order Flow (After User Approves):

```
Frontend: User approves payment on PayPal
    ↓
POST /api/checkout/paypal/capture-order
    ↓
paypalController.ts (capturePayPalOrderHandler)
    ↓
1. Retrieve stored beat IDs from memory
2. Capture PayPal order (verify payment)
3. Check idempotency (prevent duplicate orders)
    ↓
orderService.ts (createOrderFromPayPalCapture)
    ↓
1. Start database transaction
2. Insert into orders table
3. Insert into order_items table
4. Generate download tokens (crypto.randomBytes)
5. Insert into downloads table
6. Commit transaction
    ↓
emailService.ts (sendDownloadEmail)
    ↓
Send email with download links to customer
    ↓
Response: { success: true, orderId, customerEmail, ... }
```

### Key Security Points:

1. **Beat IDs stored in memory** (`orderDataStore` Map):
   - Maps PayPal order ID → beat IDs
   - Cleared after retrieval (prevents memory leaks)
   - **Note:** Lost on server restart (acceptable for this use case)

2. **Idempotency check:**
   - Before creating order, checks if `paypal_order_id` already exists
   - Prevents duplicate orders if capture is called twice

3. **Amount validation:**
   - Total amount comes from PayPal (not trusted from client)
   - Email comes from PayPal payer info (not from client)

4. **Download tokens:**
   - Generated with `crypto.randomBytes(32)` (256-bit entropy)
   - Base64url encoded (URL-safe)
   - Stored in database with expiration (30 days) and download limit (5)

### Key Files:
- **Route:** `server/src/routes/checkoutRoutes.ts`
- **Controller:** `server/src/controllers/paypalController.ts`
- **Service:** `server/src/services/paypalService.ts` - PayPal SDK integration
- **Service:** `server/src/services/orderService.ts` - Database order creation
- **Service:** `server/src/services/emailService.ts` - Email sending
- **Config:** `server/src/config/paypal.ts` - PayPal SDK client

---

## 📥 Flow 3: Downloading Beats

**Endpoint:** `GET /api/downloads/:token`

### Download Flow:

```
User clicks download link in email
    ↓
GET /api/downloads/:token
    ↓
downloadController.ts (downloadBeatHandler)
    ↓
downloadService.ts (validateDownloadToken)
    ↓
1. Query database for token
2. Check if token exists
3. Check if token expired (expires_at < now)
4. Check if download limit reached (download_count >= max_downloads)
    ↓
If valid:
    ↓
1. Increment download_count (before serving file)
2. Check if WAV file exists (prefer WAV over MP3)
3. Serve file:
   - If WAV exists + private R2 enabled → Stream from private R2 bucket
   - Otherwise → Serve from local filesystem (dev) or redirect to public R2 (MP3)
    ↓
Response: File stream with proper headers
```

### Security Features:

1. **Token validation:**
   - Token must exist in database
   - Token must not be expired (30 days)
   - Token must not exceed download limit (5 downloads)

2. **WAV file protection:**
   - WAV files are **never** publicly accessible
   - WAV files are stored in **private R2 bucket**
   - WAV files are **always** served through protected endpoint
   - MP3 previews can be public (stored in public R2)

3. **Download counting:**
   - Incremented **before** serving file (prevents race conditions)
   - Prevents unlimited downloads

### Key Files:
- **Route:** `server/src/routes/downloadRoutes.ts`
- **Controller:** `server/src/controllers/downloadController.ts`
- **Service:** `server/src/services/downloadService.ts` - Token validation, file serving
- **Utils:** `server/src/utils/r2.ts` - R2 (S3) client utilities

---

## 🗄️ Database Schema

### Tables:

1. **`beats`** - Beat catalog
   ```sql
   id (UUID, PRIMARY KEY)
   title (VARCHAR)
   key (VARCHAR)
   bpm (INTEGER)
   price (DECIMAL)
   audio_path (VARCHAR)  -- e.g., "/assets/beats/mp3/beat.mp3"
   cover_path (VARCHAR)  -- e.g., "/assets/covers/cover.jpg"
   created_at (TIMESTAMP)
   updated_at (TIMESTAMP)
   ```

2. **`orders`** - Customer orders
   ```sql
   id (UUID, PRIMARY KEY)
   customer_email (VARCHAR)
   total_amount (DECIMAL)
   status (VARCHAR)  -- 'pending', 'completed', 'failed', 'refunded'
   paypal_order_id (VARCHAR, UNIQUE)  -- Links to PayPal order
   created_at (TIMESTAMP)
   updated_at (TIMESTAMP)
   ```

3. **`order_items`** - Items in each order
   ```sql
   id (UUID, PRIMARY KEY)
   order_id (UUID, FOREIGN KEY → orders.id)
   beat_id (UUID, FOREIGN KEY → beats.id)
   price_at_purchase (DECIMAL)  -- Price at time of purchase
   quantity (INTEGER)
   created_at (TIMESTAMP)
   ```

4. **`downloads`** - Download tokens
   ```sql
   id (UUID, PRIMARY KEY)
   order_id (UUID, FOREIGN KEY → orders.id)
   beat_id (UUID, FOREIGN KEY → beats.id)
   download_token (VARCHAR, UNIQUE)  -- Secure token
   expires_at (TIMESTAMP)  -- 30 days from order
   download_count (INTEGER)  -- Current download count
   max_downloads (INTEGER)  -- Default: 5
   created_at (TIMESTAMP)
   ```

### Relationships:
- `order_items.order_id` → `orders.id` (CASCADE delete)
- `order_items.beat_id` → `beats.id` (RESTRICT delete - can't delete beat if in order)
- `downloads.order_id` → `orders.id` (CASCADE delete)
- `downloads.beat_id` → `beats.id` (RESTRICT delete)

---

## 🔐 Security Measures (Current)

### ✅ SQL Injection Prevention
- **All queries use parameterized queries:**
  ```typescript
  await pool.query(
    'SELECT * FROM beats WHERE id = $1',
    [beatId]  // Parameter, not string concatenation
  );
  ```

### ✅ Token Security
- **256-bit entropy:** `crypto.randomBytes(32)`
- **URL-safe encoding:** Base64url
- **Expiration:** 30 days
- **Download limits:** 5 max downloads
- **Validation before serving:** Checks expiration and limits

### ✅ Payment Security
- **Idempotency:** Prevents duplicate orders
- **Amount from PayPal:** Not trusted from client
- **Email from PayPal:** Not trusted from client
- **Order verification:** PayPal order verified before creating database order

### ✅ CORS Security
- **Whitelist-based:** Only allowed origins can call API
- **Configurable:** Via `CORS_ALLOWED_ORIGINS` environment variable

### ✅ File Security
- **WAV files protected:** Never publicly accessible
- **Private R2 bucket:** WAV masters stored in private bucket
- **Token validation:** Required before file access

---

## 🔄 Request/Response Examples

### Example 1: Search Beats

**Request:**
```http
GET /api/beats?q=pierre%20160%20C%23min HTTP/1.1
Host: localhost:3000
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Pierre",
    "key": "C#min",
    "bpm": 160,
    "price": 29.99,
    "audio": "https://pub-xxx.r2.dev/beats/mp3/pierre.mp3",
    "cover": "https://pub-xxx.r2.dev/covers/pierre.jpg"
  }
]
```

### Example 2: Create PayPal Order

**Request:**
```http
POST /api/checkout/paypal/create-order HTTP/1.1
Content-Type: application/json

{
  "items": [
    { "beatId": "550e8400-e29b-41d4-a716-446655440000", "quantity": 1 }
  ]
}
```

**Response:**
```json
{
  "orderId": "5O190127TN364715T",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=...",
  "amount": 29.99,
  "currency": "USD"
}
```

### Example 3: Download Beat

**Request:**
```http
GET /api/downloads/abc123xyz456... HTTP/1.1
Host: localhost:3000
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: audio/wav
Content-Disposition: attachment; filename="pierre.wav"
Content-Length: 12345678

[Binary WAV file data streamed...]
```

---

## 🛠️ Key Utilities

### `searchParser.ts`
- Parses raw search query strings (`"pierre 160 C#min"`)
- Extracts BPM values, ranges, keys, and keywords
- Returns `SearchParams` object

### `searchQueryBuilder.ts`
- Builds SQL WHERE clauses from `SearchParams`
- Handles enharmonic key matching (Am = C maj)
- Uses parameterized queries

### `keyUtils.ts`
- Normalizes key notation (`"Cm"` → `"cmin"`)
- Finds enharmonic equivalents (`"Am"` → `["amin", "cmaj"]`)

### `r2.ts`
- Converts file paths to R2 CDN URLs
- Handles R2 configuration (public/private buckets)

---

## 📧 Email Service

### `emailService.ts`
- Sends download emails after successful purchase
- Uses Resend API
- HTML escaping for security
- URL encoding for download links
- Optional email allowlist for staging

**Email includes:**
- Order ID and total amount
- Download links for each beat (with tokens)
- Expiration notice (30 days, 5 downloads max)

---

## 🔑 Environment Variables

Key environment variables used:

```bash
# Database
DATABASE_URL          # Full connection string (Railway)
DB_HOST              # Database host (local dev)
DB_PORT              # Database port
DB_NAME              # Database name
DB_USER              # Database user
DB_PASSWORD          # Database password

# PayPal
PAYPAL_CLIENT_ID     # PayPal client ID
PAYPAL_CLIENT_SECRET # PayPal client secret
PAYPAL_MODE          # 'live' or 'sandbox'

# R2 (Cloudflare)
R2_ENDPOINT          # R2 endpoint URL
R2_ACCESS_KEY_ID     # R2 access key
R2_SECRET_ACCESS_KEY # R2 secret key
R2_PUBLIC_BUCKET_NAME    # Public bucket (MP3s, images)
R2_PRIVATE_BUCKET_NAME   # Private bucket (WAV masters)
R2_PUBLIC_URL        # Public CDN URL

# Email
RESEND_API_KEY       # Resend API key
RESEND_FROM_EMAIL    # From email address
EMAIL_ALLOWLIST      # Optional: restrict emails (staging)

# URLs
FRONTEND_URL         # Frontend URL
BACKEND_URL          # Backend URL
EMAIL_LINK_BASE_URL  # Base URL for email links

# CORS
CORS_ALLOWED_ORIGINS # Comma-separated list of allowed origins
```

---

## 🎯 Next Steps

Now that you understand the backend flow, we can proceed with the security review:

1. **Review each flow** for security vulnerabilities
2. **Add rate limiting** to prevent abuse
3. **Add security headers** (Helmet.js)
4. **Enhance input validation** (Zod)
5. **Improve error handling** (sanitize error messages)

See `SERVER_SECURITY_REVIEW.md` for the complete checklist.
