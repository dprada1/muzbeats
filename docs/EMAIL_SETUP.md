# Email Service Setup Guide

## Overview

MuzBeats uses [Resend](https://resend.com) to send download emails to customers after successful purchases. Resend is a modern email API with a generous free tier (3,000 emails/month).

## Setup Instructions

### 1. Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Key

1. Log in to your Resend dashboard
2. Go to **API Keys** in the sidebar
3. Click **Create API Key**
4. Give it a name (e.g., "MuzBeats Production")
5. Copy the API key (starts with `re_`)

### 3. Configure Your Domain (Optional but Recommended)

For production, you should verify your domain:

1. Go to **Domains** in the Resend dashboard
2. Click **Add Domain**
3. Follow the DNS setup instructions
4. Once verified, you can use emails like `noreply@yourdomain.com`

For development/testing, you can use Resend's test domain:
- `onboarding@resend.dev` (for testing only)

### 4. Add Environment Variables

Add these to your `server/.env` file:

```bash
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=MuzBeats <noreply@yourdomain.com>

# Frontend URL (for download links in emails)
FRONTEND_URL=http://localhost:3000
```

**For Production:**
```bash
RESEND_API_KEY=re_your_production_api_key
RESEND_FROM_EMAIL=MuzBeats <noreply@muzbeats.com>
FRONTEND_URL=https://yourdomain.com
```

### 5. Test the Email Service

The email service will automatically:
- Send emails when payments succeed (via webhook)
- Include download links for each purchased beat
- Handle errors gracefully (won't break webhook if email fails)

**To test manually:**

1. Make a test purchase through your checkout
2. Check the server logs for email confirmation
3. Check the customer's email inbox

**Note:** If `RESEND_API_KEY` is not set, the service will log a warning but won't fail. This is useful for development when you don't need emails.

## Email Template

The email includes:
- Order confirmation
- Download links for each purchased beat
- Expiration information (30 days, 5 downloads per link)
- Branded styling with MuzBeats colors

## Troubleshooting

### Emails Not Sending

1. **Check API Key:**
   - Verify `RESEND_API_KEY` is set in `.env`
   - Make sure there are no extra spaces or quotes

2. **Check Server Logs:**
   - Look for `emailService:` messages in your server console
   - Errors will be logged but won't break the webhook

3. **Check Resend Dashboard:**
   - Go to **Logs** in Resend dashboard
   - See if emails are being sent and any errors

4. **Domain Verification:**
   - If using a custom domain, make sure it's verified
   - For testing, use `onboarding@resend.dev`

### Rate Limits

Resend free tier:
- 3,000 emails/month
- 100 emails/day

If you exceed limits, upgrade your Resend plan.

## Alternative Email Services

If you prefer a different service, you can modify `server/src/services/emailService.ts`:

- **SendGrid:** Popular, similar API
- **AWS SES:** Very cheap, requires AWS setup
- **Mailgun:** Good deliverability
- **Postmark:** Great for transactional emails

The email service is designed to be easily swappable - just update the `sendDownloadEmail` function.

