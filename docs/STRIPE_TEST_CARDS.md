# Stripe Test Cards & Payment Methods Guide

This document provides a comprehensive reference for testing payments in Stripe test mode.

## 🎯 Quick Reference

### Successful Payment Cards

| Card Number | Type | Expiry | CVC | Description |
|------------|------|--------|-----|-------------|
| `4242 4242 4242 4242` | Visa | Any future date | Any 3 digits | Standard successful payment |
| `5555 5555 5555 4444` | Mastercard | Any future date | Any 3 digits | Successful Mastercard payment |
| `3782 822463 10005` | American Express | Any future date | Any 4 digits | Successful Amex payment |

### Declined Payment Cards

| Card Number | Description |
|------------|-------------|
| `4000 0000 0000 0002` | Generic decline |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 0069` | Expired card |
| `4000 0000 0000 0119` | Incorrect CVC |

### 3D Secure Authentication

| Card Number | Description |
|------------|-------------|
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |
| `4000 0027 6000 3184` | Requires authentication (3D Secure v2) |

### Processing & Status Cards

| Card Number | Description |
|------------|-------------|
| `4000 0000 0000 3220` | Processing (will eventually succeed) |
| `4000 0000 0000 3055` | Requires authentication, then succeeds |

---

## 📋 Complete Test Card List

### Visa Cards

- **`4242 4242 4242 4242`** - Success
- **`4000 0000 0000 0002`** - Decline
- **`4000 0000 0000 9995`** - Insufficient funds
- **`4000 0025 0000 3155`** - Requires 3D Secure
- **`4000 0000 0000 3220`** - Processing

### Mastercard Cards

- **`5555 5555 5555 4444`** - Success
- **`5200 8282 8282 8210`** - Success (debit)
- **`5105 1051 0510 5100`** - Success (prepaid)

### American Express

- **`3782 822463 10005`** - Success
- **`3714 496353 98431`** - Success

### Discover

- **`6011 1111 1111 1117`** - Success
- **`6011 0009 9013 9424`** - Success

---

## 🔄 Payment Method Testing

### Amazon Pay

**Test Behavior:**
- In test mode, Amazon Pay may not fully simulate all failure scenarios
- If clicking "fail" shows success, this is a known limitation in test mode
- **Solution:** Verify payment status on the success page (already implemented)

**Test Steps:**
1. Select Amazon Pay as payment method
2. Use test Amazon account credentials
3. Complete or cancel the payment
4. Verify status on success page

### Klarna

**Test Behavior:**
- Klarna test mode may require a **real phone number** (not a dummy number)
- This is a Klarna requirement, not a Stripe limitation
- Phone number is used for identity verification even in test mode

**Test Steps:**
1. Select Klarna as payment method
2. Enter a **real phone number** (your own is fine)
3. Complete the Klarna flow
4. Payment will process in test mode

**Note:** This is expected behavior. Klarna requires phone verification even in test mode.

### Apple Pay / Google Pay

**Test Behavior:**
- Works in test mode with test cards
- Requires browser/devices that support these payment methods
- Use test cards above when prompted

### PayPal

**Test Behavior:**
- Requires PayPal test account
- Use test credentials from Stripe dashboard
- May redirect to PayPal for authentication

---

## 🐛 Common Issues & Solutions

### Issue: Amazon Pay "Fail" Shows Success

**Problem:** Clicking fail button in Amazon Pay test flow shows success page.

**Solution:** 
- ✅ Fixed: Success page now verifies payment status
- Payment status is checked against backend before showing success
- Failed payments will show error message

### Issue: Klarna Requires Real Phone Number

**Problem:** Klarna asks for real phone number in test mode.

**Solution:**
- ✅ This is expected behavior
- Klarna requires phone verification even in test mode
- Use your own phone number (it's test mode, no real charges)

### Issue: Payment Redirects But Status Unknown

**Problem:** Payment redirects but we don't know if it succeeded.

**Solution:**
- ✅ Fixed: Success page verifies payment status
- Checks payment intent status with backend
- Shows appropriate success/failure message

---

## 🧪 Testing Checklist

### Basic Payment Flow
- [ ] Test successful payment with `4242 4242 4242 4242`
- [ ] Test declined payment with `4000 0000 0000 0002`
- [ ] Test 3D Secure with `4000 0025 0000 3155`
- [ ] Verify email receipt is sent

### Payment Methods
- [ ] Test credit card (Visa, Mastercard, Amex)
- [ ] Test Amazon Pay (success and failure)
- [ ] Test Klarna (with real phone number)
- [ ] Test Apple Pay / Google Pay (if available)

### Error Handling
- [ ] Verify failed payments show error message
- [ ] Verify success page checks payment status
- [ ] Verify redirects work correctly
- [ ] Test network errors

---

## 📚 Additional Resources

- [Stripe Testing Documentation](https://docs.stripe.com/testing)
- [Stripe Test Cards Reference](https://stripe.com/docs/testing#cards)
- [Klarna Testing Guide](https://docs.klarna.com/platform-solutions/acquiring-partners/stripe/payments/testing-stripe-integration/)

---

## 🔐 Security Notes

1. **Never use test cards in production** - They will fail
2. **Test keys vs Live keys** - Always use `sk_test_` and `pk_test_` in development
3. **Test mode is safe** - No real charges, use freely for testing
4. **Switch to live keys** - Only when ready for production

---

**Last Updated:** November 2025

