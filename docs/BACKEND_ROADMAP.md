# Backend Development Roadmap

## ✅ Completed

1. **Monorepo Split**
   - Separated client and server into distinct directories
   - Server runs independently on port 3000
   - Client runs independently on port 5173

2. **Data Migration**
   - Moved `data.json` to `server/public/assets/data.json`
   - Moved all images to `server/public/assets/images/`
   - Moved all audio files (MP3/WAV) to `server/public/assets/beats/`
   - All media files now served by Express server

3. **Basic Server Setup**
   - Express server with TypeScript
   - CORS enabled
   - Static file serving (`/assets` route)
   - Health check endpoint (`/health`)
   - Basic folder structure:
     ```
     server/
     ├── src/
     │   ├── controllers/
     │   ├── routes/
     │   ├── services/
     │   ├── types/
     │   └── index.ts
     ├── public/
     │   └── assets/
     └── dist/
     ```

4. **Beats API (Basic)**
   - `GET /api/beats` - Get all beats
   - `GET /api/beats/:id` - Get single beat by ID
   - ~~File-based data loading with caching~~ ✅ **Now using PostgreSQL**

5. **Database Setup (PostgreSQL)** ✅
   - PostgreSQL connection pool configured
   - Database connection via `pg` (node-postgres)
   - Environment variables for DB connection (`.env`)
   - `beats` table created with proper schema:
     - id (UUID), title, key, bpm, price, audio_path, cover_path
     - created_at, updated_at timestamps
     - Indexes on bpm, key, and price
   - Migration script to import `data.json` → PostgreSQL
   - All 63 beats successfully migrated to database
   - `beatsService.ts` now queries PostgreSQL instead of JSON file
   - `data.json` kept as backup only (not used in production)

---

## 🚧 In Progress / Next Steps

### Phase 2: Stripe Payment Integration

#### 2.1 Stripe Setup
- Install `stripe` package
- Add Stripe API keys to `.env`:
  - `STRIPE_SECRET_KEY` (server-side)
  - `STRIPE_PUBLISHABLE_KEY` (client-side, optional)
- Create Stripe account and get test keys

#### 2.2 Payment Flow
- **Create Payment Intent**
  - `POST /api/checkout/create-payment-intent`
  - Receives cart items from client
  - Calculates total
  - Creates Stripe PaymentIntent
  - Returns client secret

- **Confirm Payment**
  - `POST /api/checkout/confirm`
  - Webhook handler for Stripe events
  - Updates order status in database
  - Generates download links/tokens

#### 2.3 Webhook Handler
- `POST /api/webhooks/stripe`
  - Handles `payment_intent.succeeded`
  - Handles `payment_intent.payment_failed`
  - Handles `charge.refunded`
  - Updates order status accordingly
  - Webhook signature verification

#### 2.4 Download System
- Generate secure download tokens after payment
- `GET /api/downloads/:token`
  - Validates token
  - Serves WAV file (or MP3)
  - Tracks download count
  - Expires after X days/downloads

### Phase 3: Order Management

#### 3.1 Database Schema
- **Orders Table**
  - Order ID (UUID)
  - Customer email (for guest checkout)
  - Total amount
  - Status (pending, completed, failed, refunded)
  - Stripe payment intent ID
  - Created/updated timestamps

- **Order Items Table**
  - Order ID (foreign key)
  - Beat ID (foreign key)
  - Price at time of purchase
  - Quantity (usually 1)

- **Downloads Table** (Optional - for tracking)
  - Order ID
  - Beat ID
  - Download token (for secure file access)
  - Expiration date
  - Download count

---

### Phase 2: Stripe Payment Integration

#### 2.1 Stripe Setup
- Install `stripe` package
- Add Stripe API keys to `.env`:
  - `STRIPE_SECRET_KEY` (server-side)
  - `STRIPE_PUBLISHABLE_KEY` (client-side, optional)
- Create Stripe account and get test keys

#### 2.2 Payment Flow
- **Create Payment Intent**
  - `POST /api/checkout/create-payment-intent`
  - Receives cart items from client
  - Calculates total
  - Creates Stripe PaymentIntent
  - Returns client secret

- **Confirm Payment**
  - `POST /api/checkout/confirm`
  - Webhook handler for Stripe events
  - Updates order status in database
  - Generates download links/tokens

#### 2.3 Webhook Handler
- `POST /api/webhooks/stripe`
  - Handles `payment_intent.succeeded`
  - Handles `payment_intent.payment_failed`
  - Handles `charge.refunded`
  - Updates order status accordingly
  - Webhook signature verification

#### 2.4 Download System
- Generate secure download tokens after payment
- `GET /api/downloads/:token`
  - Validates token
  - Serves WAV file (or MP3)
  - Tracks download count
  - Expires after X days/downloads

---

### Phase 3: Order Management

#### 3.1 Order API Endpoints
- `POST /api/orders` - Create order (guest checkout)
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/:id/downloads` - Get download links
- `POST /api/orders/:id/resend-email` - Resend download email

#### 3.2 Order Service
- Create order from cart
- Link to Stripe payment intent
- Update order status
- Generate download tokens
- Email service integration (optional)

---

### Phase 4: Enhanced Features

#### 4.1 Email Service (Optional)
- Install `nodemailer` or use service like SendGrid
- Send order confirmation emails
- Send download links via email
- Email templates

#### 4.2 Analytics & Tracking
- Track popular beats
- Track sales metrics
- Track download statistics
- Admin dashboard endpoints (future)

#### 4.3 Rate Limiting
- Install `express-rate-limit`
- Protect API endpoints
- Prevent abuse

#### 4.4 Input Validation
- Install `zod` or `joi`
- Validate request bodies
- Validate query parameters
- Return proper error messages

#### 4.5 Error Handling
- Centralized error handler middleware
- Custom error classes
- Proper HTTP status codes
- Error logging

#### 4.6 Logging
- Install `winston` or `pino`
- Log requests, errors, payments
- Structured logging

#### 4.7 Security Enhancements
- Helmet.js for security headers
- Request sanitization
- SQL injection prevention (use parameterized queries)
- XSS protection

---

### Phase 5: Production Readiness

#### 5.1 Environment Configuration
- `.env.example` file
- Environment validation
- Different configs for dev/staging/prod

#### 5.2 Testing
- Unit tests for services
- Integration tests for API endpoints
- Test database setup
- Stripe test mode integration

#### 5.3 Documentation
- API documentation (Swagger/OpenAPI)
- Database schema documentation
- Deployment guide

#### 5.4 Deployment
- Docker setup (optional)
- CI/CD pipeline
- Environment variables management
- Database migrations in production

---

## 📦 Required Dependencies

### Core Backend
```json
{
  "dependencies": {
    "express": "^5.1.0",
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    
    // Database
    "pg": "^8.11.0",  // PostgreSQL client
    // OR
    "@prisma/client": "^5.0.0",  // Prisma ORM
    
    // Payments
    "stripe": "^14.0.0",
    
    // Validation
    "zod": "^3.22.0",
    
    // Security
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.0",
    
    // Utilities
    "uuid": "^9.0.0",  // For order IDs
    "winston": "^3.11.0"  // Logging
  },
  "devDependencies": {
    // Database migrations
    "prisma": "^5.0.0",  // If using Prisma
    // OR
    "node-pg-migrate": "^6.2.0"  // If using raw pg
  }
}
```

---

## 🗂️ Proposed Folder Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.ts       # DB connection
│   │   ├── stripe.ts         # Stripe client
│   │   └── env.ts            # Environment validation
│   ├── controllers/
│   │   ├── beatsController.ts
│   │   ├── ordersController.ts
│   │   ├── checkoutController.ts
│   │   └── downloadsController.ts
│   ├── services/
│   │   ├── beatsService.ts
│   │   ├── ordersService.ts
│   │   ├── stripeService.ts
│   │   └── emailService.ts
│   ├── routes/
│   │   ├── beatsRoutes.ts
│   │   ├── ordersRoutes.ts
│   │   ├── checkoutRoutes.ts
│   │   └── webhookRoutes.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   ├── validator.ts
│   │   └── auth.ts (if needed)
│   ├── models/ (if using raw SQL)
│   │   ├── Beat.ts
│   │   ├── Order.ts
│   │   └── OrderItem.ts
│   ├── types/
│   │   ├── Beat.ts
│   │   ├── Order.ts
│   │   └── Stripe.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── downloadToken.ts
│   └── index.ts
├── migrations/ (if using raw SQL)
│   └── 001_initial_schema.sql
├── prisma/ (if using Prisma)
│   ├── schema.prisma
│   └── migrations/
├── public/
│   └── assets/
├── tests/
│   ├── unit/
│   └── integration/
└── .env.example
```

---

## 🔄 Implementation Priority

### High Priority (MVP)
1. ✅ Basic server setup
2. ✅ Static file serving
3. ✅ Beats API
4. ✅ PostgreSQL setup
5. ✅ Database schema & migrations
6. ✅ Data migration (JSON → PostgreSQL)
7. 🔄 Stripe payment integration
8. 🔄 Order creation & management
9. 🔄 Download token system

### Medium Priority
9. Email service
10. Input validation
11. Error handling
12. Rate limiting
13. Logging

### Low Priority (Nice to Have)
14. Analytics
15. Admin dashboard
16. User accounts (if moving away from guest checkout)
17. Advanced search/filtering in database

---

## 📝 Notes

- **Guest Checkout**: Currently planned as guest-only (no user accounts)
- **File Serving**: WAV files served via secure download tokens after purchase
- **Database**: PostgreSQL recommended for production, but SQLite could work for development
- **ORM vs Raw SQL**: Prisma recommended for type safety, but `pg` is fine if you prefer raw SQL
- **Stripe**: Use test mode during development, switch to live keys for production

---

## 🚀 Quick Start Commands (Future)

```bash
# Install dependencies
npm install

# Setup database
npm run db:migrate

# Seed database with beats
npm run db:seed

# Run in development
npm run dev

# Run in production
npm run build
npm start
```

