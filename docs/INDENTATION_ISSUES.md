# Indentation Inconsistencies

## Current State Analysis

After fixing test files and CheckoutSuccessPage, here's what we found:

### Files Using 2 Spaces (Newer Checkout Files)
- ✅ `client/src/pages/CheckoutPage.tsx`
- ✅ `client/src/pages/CheckoutSuccessPage.tsx`

### Files Using 4 Spaces (Most Client Files - Standard)
- `client/src/pages/CartPage.tsx` ⚠️ **INCONSISTENT** (should match checkout pages?)
- `client/src/context/CartContext.tsx`
- `client/src/context/SearchContext.tsx`
- `client/src/context/WaveformContext.tsx`
- `client/src/components/**/*.tsx` (most component files)
- `client/src/types/*.ts`
- `client/src/utils/*.ts`

### Files Using TABS (Inconsistent - Should Be Fixed)

**Client Files:**
- ⚠️ `client/src/App.tsx`
- ⚠️ `client/src/main.tsx`
- ⚠️ `client/src/context/PlayerContext.tsx`
- ⚠️ `client/src/components/buttons/ShareBeatButton.tsx`
- ⚠️ `client/src/pages/BeatDetail.tsx`
- ⚠️ `client/src/__tests__/smoke/smoke.test.ts` (just fixed, but still tabs?)
- ⚠️ `client/src/__tests__/context/playerContext.test.tsx` (just fixed, but still tabs?)
- ⚠️ `client/src/__tests__/context/cartContext.test.tsx` (just fixed, but still tabs?)
- ⚠️ `client/src/__tests__/context/searchContext.test.tsx` (just fixed, but still tabs?)
- ⚠️ `client/src/__tests__/utils/formatTime.test.ts` (just fixed, but still tabs?)

**Server Files:**
- ⚠️ `server/src/config/stripe.ts`
- ⚠️ `server/src/utils/searchQueryBuilder.ts`
- ⚠️ `server/src/utils/searchParser.ts`
- ⚠️ `server/src/utils/keyUtils.ts`
- ⚠️ `server/src/db/update-prices.ts`
- ⚠️ `server/src/db/migrate-json-to-db.ts`
- ⚠️ `server/src/db/setup-table.ts`
- ⚠️ `server/src/controllers/beatsController.ts`
- ⚠️ `server/src/controllers/checkoutController.ts`
- ⚠️ `server/src/routes/checkoutRoutes.ts`

## Recommendation

**Option 1: Standardize on 2 Spaces (Matches Checkout Pages)**
- Convert all client files to 2 spaces
- Convert all server files to 2 spaces (or tabs if that's the server standard)

**Option 2: Standardize on 4 Spaces (Matches Most Client Files)**
- Convert checkout pages to 4 spaces
- Convert tab files to 4 spaces

**Option 3: Keep Current Pattern**
- Client: 4 spaces (convert checkout pages and tab files)
- Server: Tabs (keep as is, or convert to 2 spaces)

## Action Items

1. **Decide on standard:** 2 spaces vs 4 spaces vs tabs
2. **Fix CartPage.tsx** - Currently 4 spaces, checkout pages are 2 spaces
3. **Fix all tab files** - Convert to chosen standard
4. **Update CODE_STYLE.md** - Document the chosen standard

