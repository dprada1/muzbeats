# Environment Variables & Password Setup Guide

## 🔒 Security Principles

**Golden Rule:** Never commit secrets to git. Ever.

**Why?**
- Git history is permanent (even if you delete it later)
- Anyone with repo access can see secrets
- Public repos get scraped by bots
- Once exposed, consider secrets compromised

---

## 📁 File Structure

```
server/
├── .env              ← Your actual secrets (GITIGNORED)
├── .env.example      ← Template (COMMITTED to git)
└── src/
    └── config/
        └── database.ts
```

**Key Points:**
- `.env` = Your real passwords (never commit)
- `.env.example` = Template with placeholders (safe to commit)
- `.gitignore` = Already configured to ignore `.env`

---

## ✅ Step 1: Verify .gitignore is Set Up

Your `.gitignore` already has this (good!):

```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

**Verify it's working:**
```bash
# Create a test .env file
echo "TEST=secret" > server/.env

# Check git status (should NOT show .env)
cd server
git status

# .env should NOT appear in the list
# If it does, something is wrong with .gitignore
```

**If `.env` shows up in git status:**
- Check you're in the right directory
- Check `.gitignore` is in the repo root
- Try: `git check-ignore -v server/.env` (should show which rule matches)

---

## 📝 Step 2: Create .env.example Template

**Purpose:** Shows what environment variables are needed without exposing real values.

**Create `server/.env.example`:**

```env
# Database Configuration
# For local development with default postgres user (no password)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=muzbeats_dev
DB_USER=postgres
DB_PASSWORD=

# For local development with custom user (use password)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=muzbeats_dev
# DB_USER=muzbeats_user
# DB_PASSWORD=your_password_here

# Server Configuration
PORT=3000

# Stripe (for later - use test keys during development)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...

# Node Environment
NODE_ENV=development
```

**Why this is safe:**
- No real passwords
- Placeholder values only
- Safe to commit to git
- Helps other developers (or future you) know what's needed

---

## 🔐 Step 3: Create Your Actual .env File

**Create `server/.env` (this file is gitignored):**

```bash
cd server
cp .env.example .env
# Or create it manually
```

**Edit `server/.env` with your real values:**

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=muzbeats_dev
DB_USER=postgres
DB_PASSWORD=

# If you created a custom user (from POSTGRES_SETUP.md Step 4):
# DB_USER=muzbeats_user
# DB_PASSWORD=your_actual_password_here

# Server Configuration
PORT=3000

# Node Environment
NODE_ENV=development
```

**Important:**
- Use real values here
- This file is gitignored (won't be committed)
- Never share this file
- Never commit this file

---

## 💻 Step 4: Update Database Config to Use .env

**Create/Update `server/src/config/database.ts`:**

```typescript
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const { Pool } = pg;

// Create connection pool with values from .env
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'muzbeats_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

export default pool;
```

**What this does:**
- `dotenv.config()` loads variables from `.env` file
- `process.env.DB_PASSWORD` reads the password from `.env`
- Falls back to defaults if env vars not set (for safety)

---

## 🧪 Step 5: Test It Works

**Create test script `server/src/test-env.ts`:**

```typescript
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

console.log('Environment Variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***hidden***' : '(empty)');
console.log('PORT:', process.env.PORT);
```

**Run it:**
```bash
cd server
npx tsx src/test-env.ts
```

**Expected output:**
```
Environment Variables:
DB_HOST: localhost
DB_PORT: 5432
DB_NAME: muzbeats_dev
DB_USER: postgres
DB_PASSWORD: (empty)
PORT: 3000
```

**If you see `undefined`:**
- Check `.env` file exists in `server/` directory
- Check file is named exactly `.env` (not `.env.txt`)
- Check `dotenv` is installed: `npm list dotenv`
- Check values in `.env` don't have quotes (unless needed)

---

## 🔍 Step 6: Verify .env is Gitignored

**Double-check it's not tracked:**
```bash
# From project root
git status

# .env should NOT appear

# Explicitly check
git check-ignore -v server/.env
# Should output: server/.env matched by .gitignore rule

# Try to add it (should fail or be ignored)
git add server/.env
git status
# Should still not show .env
```

**If `.env` shows up:**
1. It might already be tracked (committed before adding to .gitignore)
2. Solution:
```bash
# Remove from git tracking (but keep the file)
git rm --cached server/.env
git commit -m "Remove .env from git tracking"
```

---

## 🎯 Step 7: Password Best Practices

### For Local Development:

**Option A: Use default postgres user (no password)**
```env
DB_USER=postgres
DB_PASSWORD=
```
- Simplest for learning
- Only works locally
- Not secure for production

**Option B: Create a user with password**
```env
DB_USER=muzbeats_user
DB_PASSWORD=your_secure_password_here
```
- Better practice
- More secure
- Closer to production setup

**How to create a user (if you haven't):**
```bash
psql postgres
CREATE USER muzbeats_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE muzbeats_dev TO muzbeats_user;
\c muzbeats_dev
GRANT ALL ON SCHEMA public TO muzbeats_user;
\q
```

### Password Requirements:
- ✅ At least 12 characters
- ✅ Mix of letters, numbers, symbols
- ✅ Don't use common words
- ✅ Don't reuse passwords
- ❌ Don't use "password", "123456", etc.

**Example good password:**
```
mUzB3@ts_2025_Dev!
```

---

## 🚀 Step 8: Production (Railway) Setup

**When you deploy to Railway:**
- Railway provides environment variables in their dashboard
- You set them through Railway's UI (not .env file)
- Railway handles secrets securely

**How it works:**
1. Go to Railway project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add environment variables:
   - `DB_HOST` = (Railway provides this)
   - `DB_PORT` = (Railway provides this)
   - `DB_NAME` = (Railway provides this)
   - `DB_USER` = (Railway provides this)
   - `DB_PASSWORD` = (Railway provides this)
   - `STRIPE_SECRET_KEY` = (your Stripe key)
   - etc.

**Your code stays the same:**
- Still uses `process.env.DB_PASSWORD`
- Railway injects the values at runtime
- No `.env` file needed in production

---

## 📋 Checklist

- [ ] `.gitignore` includes `.env` (already done ✅)
- [ ] Created `server/.env.example` (template)
- [ ] Created `server/.env` (your actual secrets)
- [ ] Verified `.env` is NOT in git (`git status`)
- [ ] Updated `database.ts` to use `process.env`
- [ ] Tested environment variables load correctly
- [ ] Password is secure (if using custom user)
- [ ] `.env.example` is committed to git (safe)

---

## 🐛 Common Issues

### Issue: "Cannot find module 'dotenv'"
**Solution:**
```bash
cd server
npm install dotenv
```

### Issue: Environment variables are `undefined`
**Solutions:**
1. Check `.env` file exists in `server/` directory
2. Check `dotenv.config()` is called before using `process.env`
3. Check file is named exactly `.env` (not `.env.txt` or `.env.local`)
4. Check no typos in variable names
5. Restart your server after changing `.env`

### Issue: ".env file is showing in git"
**Solutions:**
1. Check `.gitignore` has `.env` entry
2. If already committed:
```bash
git rm --cached server/.env
git commit -m "Remove .env from tracking"
```

### Issue: "Password authentication failed"
**Solutions:**
1. Check password in `.env` matches database user password
2. Check user exists: `psql postgres -c "\du"`
3. Check user has permissions on database
4. Try connecting manually: `psql -U muzbeats_user -d muzbeats_dev`

---

## 🔐 Security Reminders

1. **Never commit `.env`** - It's gitignored for a reason
2. **Never share `.env`** - Don't email it, Slack it, etc.
3. **Use strong passwords** - Especially for production
4. **Rotate passwords** - If exposed, change immediately
5. **Use different passwords** - Dev vs production
6. **Don't hardcode** - Always use environment variables
7. **Review `.env.example`** - Make sure it doesn't have real values

---

## 📚 Additional Resources

- [dotenv documentation](https://github.com/motdotla/dotenv)
- [12 Factor App - Config](https://12factor.net/config)
- [OWASP - Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Remember:** If you're ever unsure if something is safe to commit, ask yourself: "Would I be okay if this was public on the internet?" If no, don't commit it! 🔒

