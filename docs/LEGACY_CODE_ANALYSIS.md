# Legacy Search Code Analysis

**⚠️ UPDATE: This document is now historical. The legacy code has been removed and tests have been moved to the server. See below for details.**

## 🔍 Current Workflow (Production)

### Complete Data Flow

```
1. User Types in SearchBar
   └─> SearchBar component (client/src/components/SearchBar/SearchBar.tsx)
       └─> useSearchBar hook manages local input state

2. User Submits Search
   └─> onSubmit() in useSearchBar.ts
       └─> Updates URL: navigate('/store?q=pierre 160 C#min')
       └─> No parsing happens here - just raw query string

3. URL Change Detected
   └─> SearchContext (client/src/context/SearchContext.tsx)
       └─> Reads ?q parameter from URL
       └─> Stores raw query string in state: "pierre 160 C#min"
       └─> No parsing happens here - just state management

4. StorePage Reacts to Query Change
   └─> StorePage (client/src/pages/StorePage.tsx)
       └─> useEffect watches searchQuery from context
       └─> Builds API URL: `/api/beats?q=pierre%20160%20C%23min`
       └─> Sends raw query string to backend
       └─> No client-side parsing or filtering

5. Backend Receives Request
   └─> beatsController.ts (server/src/controllers/beatsController.ts)
       └─> Extracts ?q parameter: "pierre 160 C#min"
       └─> Calls parseSearchQuery() from server utils

6. Backend Parses Query
   └─> searchParser.ts (server/src/utils/searchParser.ts)
       └─> Parses into SearchParams:
           {
             bpmValues: [160],
             keys: ["C#min"],
             queryTokens: ["pierre"]
           }

7. Backend Builds SQL Query
   └─> searchQueryBuilder.ts (server/src/utils/searchQueryBuilder.ts)
       └─> Converts SearchParams to SQL WHERE clauses
       └─> Adds enharmonic equivalents
       └─> Executes parameterized SQL query

8. Database Returns Results
   └─> PostgreSQL filters beats
       └─> Returns only matching beats (already filtered)

9. Backend Sends Response
   └─> beatsService.ts returns filtered Beat[]
       └─> JSON response sent to frontend

10. Frontend Displays Results
    └─> StorePage receives filtered beats
        └─> No client-side filtering needed
        └─> Renders beat cards directly
```

### Key Points

✅ **No Client-Side Parsing**: The frontend never parses the search query  
✅ **No Client-Side Filtering**: The frontend never filters beats  
✅ **Raw Query String**: Frontend only handles the raw query string  
✅ **Backend Does Everything**: All parsing and filtering happens on the server

---

## 📁 Legacy Code Status

### Location: `client/src/utils/search/`

**Files:**
- `searchParser.ts` - Parses query string → SearchParams
- `filterBeats.ts` - Filters beats array based on SearchParams
- `keyUtils.ts` - Key normalization and enharmonic equivalents
- `parsers/parseBPMs.ts` - BPM parsing logic
- `parsers/parseKeys.ts` - Key parsing logic
- `parsers/parseGeneralKeywords.ts` - Keyword parsing logic

### Usage Analysis

#### ❌ **NOT Used in Production Code**

**Checked Files:**
- ✅ `StorePage.tsx` - Does NOT import any search utilities
- ✅ `SearchBar.tsx` - Does NOT import any search utilities
- ✅ `useSearchBar.ts` - Does NOT import any search utilities
- ✅ `SearchContext.tsx` - Does NOT import any search utilities
- ✅ All other production components - No imports found

**Conclusion:** The legacy search utilities are **completely unused** in production code.

#### ✅ **ONLY Used in Test Files**

**Test Files Using Legacy Code:**
1. `__tests__/search/filterBeats.test.ts` - Tests `filterBeats()` function
2. `__tests__/search/integration/integration.parse.test.ts` - Tests `parseSearchQuery()`
3. `__tests__/search/bpm/bpm.test.ts` - Tests BPM parsing
4. `__tests__/search/keys/keys.test.ts` - Tests key parsing
5. `__tests__/search/general_keywords/general_keywords.test.ts` - Tests keyword parsing
6. `__tests__/utils/keyUtils.test.ts` - Tests key utilities

**Conclusion:** The legacy code is **only used in tests**, which test code that **no longer runs in production**.

---

## 🤔 Why Keep Tests for Unused Code?

### Current Situation

The tests are testing the **old client-side implementation**, but:
- This code doesn't run in production anymore
- The backend has its own implementation (ported from client)
- The tests don't verify the actual production behavior

### Options

#### Option 1: Remove Legacy Code and Tests ❌
**Pros:**
- Clean codebase
- No confusion about what's used

**Cons:**
- Lose regression tests
- Can't verify parsing logic independently
- Harder to debug if backend implementation differs

#### Option 2: Keep Tests, Mark as Legacy ✅ **RECOMMENDED**
**Pros:**
- Tests serve as specification/documentation
- Can catch regressions if backend logic changes
- Useful for debugging (compare client vs server behavior)
- Tests are well-written and comprehensive

**Cons:**
- Code appears unused (but it's test-only)
- Slight maintenance burden

#### Option 3: Convert to Backend Integration Tests ✅ **BEST LONG-TERM**
**Pros:**
- Tests actual production behavior
- Verifies end-to-end functionality
- Catches API contract issues

**Cons:**
- Requires test server setup
- More complex test infrastructure
- Slower tests

---

## 💡 Recommendations

### Immediate Action: Document Legacy Status

1. **Add comments to legacy files:**
   ```typescript
   /**
    * @deprecated This file is legacy code from the client-side search implementation.
    * It is ONLY used in tests and NOT in production code.
    * 
    * Production search is handled by the backend:
    * - server/src/utils/searchParser.ts
    * - server/src/utils/searchQueryBuilder.ts
    * 
    * These tests serve as regression tests and documentation of the parsing logic.
    */
   ```

2. **Update test file headers:**
   ```typescript
   /**
    * Tests for legacy client-side search utilities.
    * 
    * NOTE: These utilities are NOT used in production.
    * Production search is handled by the backend API.
    * 
    * These tests serve as:
    * - Regression tests (catch if backend logic diverges)
    * - Documentation of expected parsing behavior
    * - Reference implementation for debugging
    */
   ```

### Long-Term: Migration Path

1. **Keep tests for now** - They're valuable as regression tests
2. **Add backend integration tests** - Test actual API endpoints
3. **Gradually phase out** - Once backend tests are comprehensive
4. **Remove legacy code** - After confirming no dependencies

### Alternative: Keep as Reference Implementation

The legacy code could serve as a **reference implementation**:
- Compare client vs server behavior
- Debug parsing issues
- Understand expected behavior
- Document the algorithm

---

## 📊 Code Duplication Analysis

### Current Duplication

**Client (Legacy):**
- `client/src/utils/search/searchParser.ts`
- `client/src/utils/search/keyUtils.ts`
- `client/src/utils/search/filterBeats.ts`

**Server (Production):**
- `server/src/utils/searchParser.ts`
- `server/src/utils/keyUtils.ts`
- `server/src/utils/searchQueryBuilder.ts` (SQL-based, not array filtering)

### Are They Identical?

**Similarities:**
- Same parsing logic (ported from client)
- Same key normalization
- Same enharmonic mapping

**Differences:**
- Server uses SQL queries (not array filtering)
- Server handles database-specific concerns (# vs ♯)
- Server has additional SQL pattern matching

### Should We Share Code?

**Option: Shared Package** ❌
- Overkill for monorepo
- Adds complexity
- Different concerns (client filters arrays, server queries SQL)

**Current Approach** ✅
- Keep separate (they serve different purposes)
- Server version is production code
- Client version is test-only reference

---

## 🎯 Summary

### Production Code Status

| Component | Uses Legacy Utils? | Status |
|-----------|-------------------|--------|
| `StorePage.tsx` | ❌ No | ✅ Clean - uses backend API |
| `SearchBar.tsx` | ❌ No | ✅ Clean - just UI |
| `SearchContext.tsx` | ❌ No | ✅ Clean - just state |
| All other components | ❌ No | ✅ Clean |

### Legacy Code Status

| File | Used In Production? | Used In Tests? | Recommendation |
|------|-------------------|----------------|----------------|
| `searchParser.ts` | ❌ No | ✅ Yes | Keep for tests |
| `filterBeats.ts` | ❌ No | ✅ Yes | Keep for tests |
| `keyUtils.ts` | ❌ No | ✅ Yes | Keep for tests |
| All parsers | ❌ No | ✅ Yes | Keep for tests |

### Workflow Summary

```
User Input → SearchBar → URL → SearchContext → StorePage → Backend API
                                                              ↓
                                                         Parse & Filter
                                                              ↓
                                                         Return Results
                                                              ↓
                                                         StorePage Display
```

**No client-side parsing or filtering happens in production.**

---

## ✅ Final Recommendation

1. **Keep the legacy code** - It's only used in tests
2. **Add documentation** - Mark files as legacy/test-only
3. **Keep tests** - They're valuable regression tests
4. **Add backend integration tests** - Test actual API behavior
5. **Don't remove yet** - Wait until backend tests are comprehensive

The legacy code is **obsolete for production** but **valuable for testing**. It serves as a reference implementation and regression test suite.

---

## ✅ Migration Completed (November 2025)

**Action Taken:**
- ✅ Removed all legacy client-side search utilities (`client/src/utils/search/`)
- ✅ Removed all legacy client-side tests (`client/src/__tests__/search/`)
- ✅ Moved tests to server (`server/src/__tests__/search/`)
- ✅ Tests now test the actual production code (server's `searchParser.ts`)
- ✅ Set up Vitest in server for testing

**Result:**
- Tests now verify the actual production implementation
- No duplicate code between client and server
- Cleaner codebase with tests in the right place

**Test Location:**
- `server/src/__tests__/search/` - All search parsing tests
- Run with: `cd server && npm test`

---

**Last Updated**: November 2025 (Migration completed)

