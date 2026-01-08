# localStorage Cart Validation Testing Guide

## Overview
This document describes how to test the localStorage cart validation implemented in `CartContext.tsx`.

## What to Test

### 1. Normal Operation (Valid Cart Data)
- ✅ **Add items to cart**: Add beats to cart, refresh page - should persist
- ✅ **Remove items**: Remove items, refresh - should persist correctly
- ✅ **Clear cart**: Clear cart, refresh - should remain empty

### 2. Invalid Data Handling

#### Test 2a: Corrupted JSON
1. Open browser DevTools Console
2. Run: `localStorage.setItem('muz-cart-v1', 'invalid json{')`
3. Refresh the page
4. **Expected**: Cart should be empty, no errors in console (or dev-only error)

#### Test 2b: Non-Array Data
1. Run: `localStorage.setItem('muz-cart-v1', '{"not": "an array"}')`
2. Refresh the page
3. **Expected**: Cart should be empty, console warning in dev mode

#### Test 2c: Invalid Beat Objects
1. Run: `localStorage.setItem('muz-cart-v1', '[{"id": "123", "title": "Test"}]')`
   - Missing required fields (key, bpm, price, audio, cover)
2. Refresh the page
3. **Expected**: Invalid item removed, cart empty

#### Test 2d: Mixed Valid/Invalid Items
1. Add a valid beat to cart normally
2. Run: `const cart = JSON.parse(localStorage.getItem('muz-cart-v1')); cart.push({invalid: "item"}); localStorage.setItem('muz-cart-v1', JSON.stringify(cart));`
3. Refresh the page
4. **Expected**: Valid item remains, invalid item removed

#### Test 2e: Wrong Types
1. Run: `localStorage.setItem('muz-cart-v1', '[{"id": 123, "title": "Test", "key": "C", "bpm": "150", "price": "19.99", "audio": "test.mp3", "cover": "test.jpg"}]')`
   - Wrong types (id is number, bpm/price are strings)
2. Refresh the page
3. **Expected**: Invalid item removed, cart empty

#### Test 2f: Invalid Values
1. Run: `localStorage.setItem('muz-cart-v1', '[{"id": "", "title": "Test", "key": "C", "bpm": -5, "price": -10, "audio": "", "cover": ""}]')`
   - Empty strings, negative values
2. Refresh the page
3. **Expected**: Invalid item removed, cart empty

### 3. Edge Cases

#### Test 3a: Empty Array
1. Run: `localStorage.setItem('muz-cart-v1', '[]')`
2. Refresh the page
3. **Expected**: Cart is empty (normal behavior)

#### Test 3b: Null/Undefined
1. Run: `localStorage.setItem('muz-cart-v1', 'null')`
2. Refresh the page
3. **Expected**: Cart is empty, no errors

#### Test 3c: Very Large Array
1. Create array with 1000+ items (if possible)
2. **Expected**: Should validate all items (may be slow but shouldn't crash)

### 4. Console Checks

#### Development Mode:
- Should see warnings when invalid items are removed
- Should see error logs for JSON parse failures

#### Production Mode:
- No console warnings/errors (or minimal)
- Silent validation and cleanup

## Testing Checklist

- [ ] Normal cart operations work (add, remove, clear)
- [ ] Cart persists across page refreshes
- [ ] Corrupted JSON is handled gracefully
- [ ] Non-array data is rejected
- [ ] Invalid beat objects are filtered out
- [ ] Mixed valid/invalid items: valid items kept, invalid removed
- [ ] Wrong data types are rejected
- [ ] Invalid values (empty, negative) are rejected
- [ ] Empty array works correctly
- [ ] App doesn't crash on any test case
- [ ] localStorage is cleaned when all data is invalid

## Manual Testing Steps

### Quick Test Script (Run in Browser Console):

```javascript
// Test 1: Valid data
localStorage.setItem('muz-cart-v1', JSON.stringify([{
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Beat',
    key: 'C',
    bpm: 120,
    price: 19.99,
    audio: '/test.mp3',
    cover: '/test.jpg'
}]));
location.reload(); // Should keep the item

// Test 2: Invalid data
localStorage.setItem('muz-cart-v1', '[{"invalid": "data"}]');
location.reload(); // Should clear cart

// Test 3: Corrupted JSON
localStorage.setItem('muz-cart-v1', 'invalid json{');
location.reload(); // Should clear cart, no errors
```

## Expected Behavior Summary

- **Valid data**: Works normally ✅
- **Invalid items**: Filtered out, valid items kept ✅
- **All invalid**: Cart cleared, localStorage cleaned ✅
- **Corrupted JSON**: Cart cleared, error logged (dev only) ✅
- **No crashes**: All edge cases handled gracefully ✅

