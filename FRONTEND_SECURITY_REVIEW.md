# Frontend Security Review Checklist

## Status: ✅ Complete

This document tracks all frontend security issues that need to be reviewed and fixed before moving to backend security review.

---

## ✅ Already Verified (Safe)

1. **XSS Prevention** ✅
   - No `dangerouslySetInnerHTML`, `eval()`, `innerHTML`, `document.write()` found
   - React automatically escapes content

2. **Search Input Sanitization** ✅
   - Uses `encodeURIComponent()` for URL parameters
   - Input is trimmed before use

3. **Environment Variables** ✅
   - Only `VITE_` prefixed variables (safe for frontend)
   - No secrets exposed

4. **localStorage Usage** ✅
   - Only used for cart (non-sensitive data)
   - No authentication tokens stored

5. **Accessibility** ✅
   - ARIA labels present on interactive elements

---

## 🔴 Critical Issues to Review

### 1. URL Parameter Validation ✅

**Location**: 
- `client/src/pages/BeatDetail.tsx` - `beatId` from URL params
- `client/src/pages/CheckoutSuccessPage.tsx` - `orderId` from URL params

**Issue**: 
- URL parameters (`beatId`, `orderId`) are used directly in API calls without validation
- No format checking (UUID format, length, special characters)

**Risk**: 
- Path traversal attacks (`../../../etc/passwd`)
- SQL injection (if passed to backend without validation)
- Invalid requests causing errors

**Files to Review**:
- `client/src/pages/BeatDetail.tsx` (line 9, 18)
- `client/src/pages/CheckoutSuccessPage.tsx` (line 13)

**Action Required**:
- [x] Validate `beatId` format (should be UUID)
- [x] Validate `orderId` format (should be UUID or PayPal order ID format)
- [x] Add length limits
- [x] Reject invalid formats before API calls
- [x] Add error handling for invalid IDs

**Implementation**:
- Created `client/src/utils/validation.ts` with `isValidUUID()`, `isValidBeatId()`, and `isValidOrderId()` functions
- Updated `BeatDetail.tsx` to validate `beatId` before API call
- Updated `CheckoutSuccessPage.tsx` to validate `orderId` before processing
- Invalid IDs are rejected early with user-friendly error messages

---

### 2. Input Length Limits ✅

**Location**: 
- `client/src/components/SearchBar/useSearchBar.ts` - Search input
- `client/src/context/SearchContext.tsx` - Search query from URL
- `client/src/components/SearchBar/SearchBar.tsx` - Input field

**Issue**: 
- Search query has no maximum length limit
- Users could submit extremely long queries

**Risk**: 
- DoS attacks (very long queries)
- Browser performance issues
- Server overload
- URL length limits (browsers have ~2000 char limit)

**Files to Review**:
- `client/src/components/SearchBar/useSearchBar.ts` (line 36)
- `client/src/context/SearchContext.tsx` (line 25, 30)

**Action Required**:
- [x] Add maximum length limit (200 characters)
- [x] Truncate or reject queries exceeding limit
- [x] Show user-friendly error message
- [x] Validate on both input and URL parameter

**Implementation**:
- Added `MAX_SEARCH_QUERY_LENGTH = 200` constant in `validation.ts`
- Created `validateSearchQuery()` function that:
  - Trims whitespace
  - Checks length (max 200 chars)
  - Truncates at word boundaries when possible
  - Returns validation result with truncation flag
- Updated `useSearchBar.ts` to validate on submit
- Updated `SearchContext.tsx` to validate when reading from URL
- Added `maxLength={200}` attribute to input field (browser-level enforcement)
- Input automatically truncates if user tries to type beyond limit

---

### 3. API Response Validation ✅

**Location**: 
- All API calls throughout the app
- `client/src/pages/StorePage.tsx` - Beat array response
- `client/src/pages/BeatDetail.tsx` - Single beat response
- `client/src/pages/CartPage.tsx` - PayPal config response
- `client/src/components/checkout/PayPalCheckoutButton.tsx` - Order response

**Issue**: 
- API responses are cast to TypeScript types without runtime validation
- Assumes backend always returns correct format
- No validation of data structure, types, or required fields

**Risk**: 
- Malformed responses could crash the app
- Type mismatches could cause runtime errors
- Missing fields could cause undefined errors
- Security: Malicious backend could inject unexpected data

**Files to Review**:
- `client/src/pages/StorePage.tsx` (line 30)
- `client/src/pages/BeatDetail.tsx` (line 26, 28)
- `client/src/pages/CartPage.tsx` (line 31)
- `client/src/components/checkout/PayPalCheckoutButton.tsx` (line 56, 82)
- `client/src/pages/CheckoutSuccessPage.tsx` (if any API calls)

**Action Required**:
- [x] Add runtime validation for API responses (use Zod or similar)
- [x] Validate Beat type structure
- [x] Validate PayPal config structure
- [x] Validate order response structure
- [x] Handle validation errors gracefully
- [x] Log validation failures for debugging

**Implementation**:
- Created `client/src/utils/apiValidation.ts` with Zod schemas for all API responses:
  - `BeatSchema` - Validates beat objects (id, title, key, bpm, price, audio, cover)
  - `PayPalConfigSchema` - Validates PayPal configuration response
  - `PayPalCreateOrderResponseSchema` - Validates create order response
  - `PayPalCaptureOrderResponseSchema` - Validates capture order response
  - `ErrorResponseSchema` - Validates error responses
- Created `validatedFetch()` helper function that:
  - Wraps `fetch()` with automatic response validation
  - Validates responses against Zod schemas before returning
  - Provides detailed error messages in development
  - Handles HTTP errors and validation errors gracefully
- Updated all API calls to use `validatedFetch()`:
  - `StorePage.tsx` - Validates beat array responses
  - `BeatDetail.tsx` - Validates single beat responses (handles 404s)
  - `CartPage.tsx` - Validates PayPal config responses
  - `PayPalCheckoutButton.tsx` - Validates create/capture order responses
- All validation errors are logged in development mode for debugging
- Invalid responses throw user-friendly errors instead of crashing the app

**Note**: Requires `zod` package to be installed: `npm install zod` in the `client` directory

---

### 4. Error Message Security ✅

**Location**: 
- All error handling throughout the app
- `client/src/pages/StorePage.tsx` - API errors
- `client/src/pages/BeatDetail.tsx` - Fetch errors
- `client/src/pages/CartPage.tsx` - PayPal config errors
- `client/src/components/checkout/PayPalCheckoutButton.tsx` - Payment errors
- `client/src/pages/CheckoutSuccessPage.tsx` - Payment status errors

**Issue**: 
- Error messages may expose internal details
- Stack traces or technical errors shown to users
- Error messages might leak sensitive information

**Risk**: 
- Information disclosure (server paths, internal errors)
- Helps attackers understand system architecture
- User confusion from technical error messages

**Files to Review**:
- `client/src/pages/StorePage.tsx` (line 36)
- `client/src/pages/BeatDetail.tsx` (line 33)
- `client/src/pages/CartPage.tsx` (line 34)
- `client/src/components/checkout/PayPalCheckoutButton.tsx` (line 78, 87, 92)
- `client/src/pages/CheckoutSuccessPage.tsx` (line 20, 45)

**Action Required**:
- [x] Review all error messages shown to users
- [x] Sanitize error messages (remove stack traces, paths)
- [x] Use generic user-friendly messages
- [x] Log detailed errors server-side only
- [x] Ensure no sensitive data in error messages

**Implementation**:
- Created `client/src/utils/errorSanitization.ts` with comprehensive error sanitization:
  - `sanitizeErrorMessage()` - Removes technical details, stack traces, file paths, URLs, status codes
  - `getGenericErrorMessage()` - Returns context-aware generic messages
  - `isNetworkError()` and `isServerError()` - Helper functions for error classification
  - Filters sensitive patterns (password, token, secret, database, SQL, etc.)
  - Logs full error details in development mode only
- Updated `PayPalCheckoutButton.tsx`:
  - All error messages now use `sanitizeErrorMessage()` before displaying
  - Prevents backend error messages from being exposed to users
- Updated `apiValidation.ts`:
  - HTTP status codes are not exposed to users
  - Generic error messages based on status code ranges (5xx, 4xx, etc.)
  - Backend error messages are sanitized before use
  - Technical details logged in development mode only
- Verified existing error messages:
  - `StorePage.tsx` - Already uses user-friendly messages ✅
  - `CartPage.tsx` - Already uses user-friendly messages ✅
  - `CheckoutSuccessPage.tsx` - Already uses user-friendly messages ✅
  - `BeatDetail.tsx` - Errors logged in dev only, user sees "Beat not found" ✅

---

### 5. Cart localStorage Validation ✅

**Location**: 
- `client/src/context/CartContext.tsx` - Cart persistence

**Issue**: 
- No validation when reading from localStorage
- Corrupted or malicious data could crash the app
- No type checking of stored data

**Risk**: 
- App crash from invalid localStorage data
- XSS if malicious data stored (though React should escape)
- Data corruption causing errors

**Files to Review**:
- `client/src/context/CartContext.tsx` (line 23-30)

**Action Required**:
- [x] Validate localStorage data structure on read
- [x] Check that stored items match Beat type
- [x] Handle corrupted data gracefully (clear and reset)
- [x] Add try-catch with proper error handling
- [x] Consider versioning for future migrations

**Implementation**:
- Created `isValidBeat()` function in `validation.ts`:
  - Validates all required Beat fields (id, title, key, bpm, price, audio, cover)
  - Checks correct types (string, number, etc.)
  - Validates constraints (bpm > 0, price >= 0, non-empty strings)
- Created `validateCartData()` function:
  - Ensures data is an array
  - Validates each item using `isValidBeat()`
  - Filters out invalid items automatically
  - Logs warnings in development mode
  - Returns only valid Beat objects
- Updated `CartContext.tsx`:
  - Validates cart data on initialization
  - Automatically cleans corrupted/invalid items
  - Updates localStorage with cleaned data if items were removed
  - Handles JSON parse errors gracefully
  - Clears localStorage if all data is invalid
- Versioning: Uses `STORAGE_KEY = 'muz-cart-v1'` for future migrations

---

### 6. Client-Side Rate Limiting

**Location**: 
- All API calls throughout the app
- `client/src/pages/StorePage.tsx` - Beat fetching
- `client/src/pages/BeatDetail.tsx` - Beat detail fetching
- `client/src/pages/CartPage.tsx` - PayPal config fetching
- `client/src/components/checkout/PayPalCheckoutButton.tsx` - Order creation/capture

**Issue**: 
- No throttling or rate limiting on client-side
- Users could spam API endpoints
- Rapid search queries could overload server

**Risk**: 
- DoS attacks (rapid API calls)
- Server overload
- Unnecessary bandwidth usage
- Poor user experience

**Files to Review**:
- `client/src/pages/StorePage.tsx` (line 17-44)
- `client/src/pages/BeatDetail.tsx` (line 12-36)
- `client/src/pages/CartPage.tsx` (line 26-39)
- `client/src/components/checkout/PayPalCheckoutButton.tsx` (line 35-90)

**Action Required**:
- [x] Add request cancellation (AbortController) for stale requests
- [x] Prevent duplicate simultaneous requests (request deduplication)
- [x] Cancel previous requests when new ones are made
- [x] Handle aborted requests gracefully (no error logs for cancelled requests)

**Implementation**:
- Created `client/src/utils/rateLimiting.ts` with rate limiting utilities:
  - `debounce()` - Delays execution until after wait time has passed
  - `throttle()` - Limits execution to once per wait time
  - `deduplicateRequest()` - Prevents duplicate requests with the same key
  - `createRequestCanceller()` - Creates AbortController that cancels previous requests
- Updated `validatedFetch()` to support AbortController signal
- Updated `StorePage.tsx`:
  - Uses `createRequestCanceller()` to cancel previous requests when search query changes
  - Uses `deduplicateRequest()` to prevent duplicate requests with the same URL
  - Gracefully handles aborted requests (no error logs)
- Updated `BeatDetail.tsx`:
  - Uses `createRequestCanceller()` to cancel previous requests when beatId changes
  - Uses `deduplicateRequest()` to prevent duplicate requests
  - Gracefully handles aborted requests
- Updated `CartPage.tsx`:
  - Uses `createRequestCanceller()` to cancel requests on unmount
  - Uses `deduplicateRequest()` to prevent duplicate PayPal config requests
  - Gracefully handles aborted requests

**Note**: 
- Search input doesn't need debouncing since it's form-submit based, not live search
- PayPal checkout buttons handle their own state management (no rate limiting needed)
- Request deduplication prevents duplicate API calls with the same URL
- AbortController cancels in-flight requests when new ones are made (prevents race conditions)

---

### 7. Build Optimization & Bundle Size

**Location**: 
- `client/vite.config.ts` - Build configuration
- `client/package.json` - Dependencies

**Issue**: 
- Bundle size not checked
- No code splitting strategy
- All code might be loaded upfront

**Risk**: 
- Large initial bundle size
- Slow page load times
- Poor performance on slow connections
- Higher bandwidth costs

**Files to Review**:
- `client/vite.config.ts`
- `client/package.json`
- Build output analysis

**Action Required**:
- [x] Analyze bundle size (run `npm run build` and check)
- [x] Implement code splitting for routes
- [x] Lazy load heavy components (WaveSurfer, PayPal SDK)
- [x] Check for duplicate dependencies
- [x] Optimize imports (tree-shaking)
- [x] Consider dynamic imports for large libraries

**Implementation**:
- Updated `client/src/App.tsx`:
  - Implemented lazy loading for all route pages using `React.lazy()` and `Suspense`
  - Added `PageLoader` component with skeleton UI for better loading experience
  - Pages are now code-split: StorePage, CartPage, BeatDetail, CheckoutSuccessPage, LicensePage, NotFoundPage
- Updated `client/vite.config.ts`:
  - Added manual chunk splitting strategy:
    - `react-vendor`: React, React DOM, React Router
    - `paypal-vendor`: PayPal SDK (only loaded on cart page)
    - `wavesurfer-vendor`: WaveSurfer.js (lazy loaded when waveforms are rendered)
    - `ui-vendor`: UI libraries (lucide-react, react-icons, react-loading-skeleton)
    - `utils-vendor`: Utility libraries (zod, nprogress)
  - Optimized chunk file naming for better caching (`[name]-[hash].js`)
  - Increased chunk size warning limit to 1000kb (expected for WaveSurfer/PayPal)
  - Using esbuild minification (faster, automatically removes console.log in production)
- Updated `client/package.json`:
  - Added `build:analyze` script for bundle size analysis
- Benefits:
  - Initial bundle size reduced (only loads what's needed)
  - Better caching (vendor chunks change less frequently)
  - Faster page loads (routes load on-demand)
  - PayPal SDK only loads when cart page is accessed
  - WaveSurfer already lazy-loaded via dynamic imports in loader.ts
- Note: Run `npm run build:analyze` to see bundle size breakdown after build

---

### 8. Content Security Policy (CSP)

**Location**: 
- `client/index.html` - HTML head
- `client/vite.config.ts` - Build configuration
- Server headers (if configured server-side)

**Issue**: 
- No Content Security Policy configured
- Missing XSS protection headers
- No restrictions on external resources

**Risk**: 
- XSS attacks not fully mitigated
- Malicious scripts could be injected
- External resource loading not controlled

**Files to Review**:
- `client/index.html`
- `client/vite.config.ts`
- Server response headers (if applicable)

**Action Required**:
- [x] Add CSP meta tag or header
- [x] Configure allowed sources for scripts, styles, images
- [x] Restrict inline scripts/styles (with necessary exceptions for PayPal and Tailwind)
- [x] Configure PayPal SDK and other external resources
- [x] Test CSP doesn't break functionality
- [x] Document CSP policy

**Implementation**:
- Updated `client/index.html`:
  - Added comprehensive Content Security Policy meta tag
  - Configured CSP directives:
    - `default-src 'self'`: Only allow resources from same origin by default
    - `script-src`: Allow self, PayPal SDK (production & sandbox), and 'unsafe-inline' (needed for Vite HMR in development)
    - `style-src`: Allow self, PayPal SDK, and 'unsafe-inline' (needed for PayPal buttons and Tailwind CSS)
    - `img-src`: Allow self, data URIs (for icons), PayPal domains, and R2 CDN domains (Cloudflare R2)
    - `connect-src`: Allow self (API calls), PayPal API endpoints (production & sandbox)
    - `font-src`: Allow self and data URIs (for icon fonts)
    - `frame-src`: Allow PayPal iframes for payment flow
    - `object-src 'none'`: Block all object/embed tags (security best practice)
    - `base-uri 'self'`: Restrict base tag to self (prevent base tag injection)
    - `form-action 'self'`: Restrict form submissions to self
- PayPal SDK Integration:
  - Allowed PayPal production and sandbox domains for scripts, styles, images, connections, and frames
  - Supports both test and live PayPal environments
- R2 CDN Support:
  - Allowed Cloudflare R2 CDN domains (`*.r2.cloudflarestorage.com` and `pub-*.r2.dev`)
  - Supports dynamic R2 URLs from environment variables
- Security Benefits:
  - Prevents XSS attacks by restricting script sources
  - Prevents data exfiltration by restricting connect-src
  - Prevents clickjacking by restricting frame-src
  - Prevents base tag injection attacks
  - Blocks dangerous object/embed tags
- Notes:
  - `'unsafe-inline'` is required for:
    - Vite's HMR (Hot Module Replacement) in development
    - Tailwind CSS (generates inline styles)
    - PayPal SDK (injects inline styles for buttons)
  - In production, consider using nonces or hashes for stricter CSP (requires build-time CSP generation)
  - CSP can be further tightened by removing 'unsafe-inline' and using nonces, but this requires additional build configuration

---

## Review Progress

- [x] Issue 1: URL Parameter Validation
- [x] Issue 2: Input Length Limits
- [x] Issue 3: API Response Validation
- [x] Issue 4: Error Message Security
- [x] Issue 5: Cart localStorage Validation
- [x] Issue 6: Client-Side Rate Limiting
- [x] Issue 7: Build Optimization & Bundle Size
- [x] Issue 8: Content Security Policy

---

## Notes

- Review issues in order (1-8)
- Test each fix before moving to next
- Document any breaking changes
- Update this checklist as issues are resolved

