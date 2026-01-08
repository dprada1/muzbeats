# Testing Checklist - API Validation & Search Query Truncation

## Quick Test Guide

### 1. Start the Dev Server
```bash
cd client && npm run dev
```

### 2. Open Browser DevTools
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
- Go to **Console** tab
- Keep it open during testing

---

## Test 1: Search Query Truncation ✅

### Visual Test:
1. Navigate to `/store`
2. Type a very long search query (60+ characters)
   - Example: `asdasdsadadsaddasdsdsdasdasdsadasdsadasdsadsdsdsdsdsdsdssdsdsdsdsdsdsdsdsadasdadsadasdsadsadadasdasdasdasdsadsadsad`
3. Submit the search

### Expected Results:
- ✅ Search input field: Query is capped at 200 characters (you can't type more)
- ✅ Subtitle display: Query is truncated to 60 characters with "..." 
- ✅ Hover over truncated text: Full query appears in tooltip
- ✅ URL: Contains full validated query (up to 200 chars)
- ✅ API call: Uses full validated query

### What to Check:
- [ ] No text overflow in subtitle
- [ ] Ellipsis appears after 60 characters
- [ ] Tooltip shows full query on hover
- [ ] Search still works with long queries

---

## Test 2: API Response Validation ✅

### Test 2a: Normal Operation (Valid Responses)

1. **Store Page** (`/store`)
   - [ ] Beats load successfully
   - [ ] No console errors
   - [ ] All beat cards display correctly

2. **Beat Detail** (`/store/beat/{valid-beat-id}`)
   - [ ] Beat details load successfully
   - [ ] No console errors
   - [ ] Beat card displays correctly

3. **Cart Page** (`/store/cart`)
   - [ ] PayPal config loads successfully
   - [ ] No console errors
   - [ ] PayPal buttons appear (if config is valid)

4. **Search Functionality**
   - [ ] Enter a search query
   - [ ] Results load successfully
   - [ ] No console errors

### Test 2b: Error Handling

1. **404 Error (Beat Detail)**
   - Navigate to `/store/beat/invalid-uuid-format`
   - [ ] Shows "Beat not found" message
   - [ ] No console errors (404 is expected)
   - [ ] App doesn't crash

2. **Network Error** (Optional - stop backend server)
   - [ ] App handles gracefully
   - [ ] Shows appropriate error state
   - [ ] No crashes

---

## Test 3: Console Validation

### What You Should See:

#### ✅ Success Case (Normal Operation):
- No validation errors
- Only normal API logs (if any)
- Clean console

#### ⚠️ Validation Failure (If Backend Returns Invalid Data):
You would see:
```
API response validation failed: {
  url: "http://localhost:3000/api/beats",
  errors: [
    {
      code: "invalid_type",
      expected: "string",
      received: "number",
      path: ["beats", 0, "title"],
      message: "Expected string, received number"
    }
  ],
  receivedData: { ... }
}
```

**Note:** You won't see this unless the backend returns invalid data. This is expected - validation is working if you don't see errors!

---

## Test 4: Search Query Warnings

### Test Long Query Truncation:
1. Type a query longer than 200 characters
2. Submit it
3. Check console

### Expected:
- Console warning (dev mode only): 
  ```
  Search query truncated to 200 characters (max: 200)
  ```
- Input field updates to show truncated version
- Search uses truncated query

---

## Test 5: Edge Cases

1. **Empty Search Query**
   - Clear search and submit
   - [ ] Navigates to `/store` (no query param)
   - [ ] Shows "All beats" subtitle

2. **Whitespace-Only Query**
   - Type only spaces
   - [ ] Query is rejected/cleared
   - [ ] Navigates to `/store`

3. **Special Characters in Query**
   - Try: `test & query "with" special chars`
   - [ ] Query is properly encoded in URL
   - [ ] Search works correctly

---

## Summary Checklist

- [ ] Search query truncation works (60 char display limit)
- [ ] Tooltip shows full query on hover
- [ ] Store page loads beats successfully
- [ ] Beat detail page loads successfully
- [ ] Cart page loads PayPal config successfully
- [ ] Search functionality works
- [ ] 404 errors handled gracefully
- [ ] No console errors (except expected ones)
- [ ] App doesn't crash on any test case

---

## If You See Issues

### Validation Errors in Console:
- Check if backend is returning valid data
- Validation is working correctly if it catches invalid data
- Check the `errors` array for specific field issues

### UI Issues:
- Check browser console for JavaScript errors
- Verify Zod is installed: `npm list zod` in client directory
- Clear browser cache and hard refresh

### Search Truncation Not Working:
- Check that `truncateForDisplay()` is being called
- Verify tooltip appears on hover
- Check browser DevTools Elements tab for `title` attribute

