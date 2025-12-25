# How to Get Railway Database URL (Public)

## Problem
If you see an error like:
```
Error: getaddrinfo ENOTFOUND postgres.railway.internal
```

This means you're using an **internal** Railway URL that only works inside Railway's network.

## Solution: Get the Public Database URL

### Step 1: Find Your Database Service

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Look for a service named something like:
   - `Postgres`
   - `Database`
   - `PostgreSQL`
   - Or check the service that has the database icon

### Step 2: Get the Public Connection String

**Option A: From Variables Tab**

1. Click on your **PostgreSQL database service**
2. Go to **Variables** tab
3. Look for `DATABASE_URL` or `POSTGRES_URL`
4. **Check the hostname**:
   - ✅ **Good (Public)**: `containers-us-west-xxx.railway.app` or similar
   - ❌ **Bad (Internal)**: `postgres.railway.internal`

**Option B: From Connect Tab**

1. Click on your **PostgreSQL database service**
2. Go to **Connect** tab (or **Data** tab)
3. Look for **Connection String** or **Public Network**
4. Copy the connection string that has a public hostname

**Option C: From Service Settings**

1. Click on your **PostgreSQL database service**
2. Go to **Settings** tab
3. Look for **Public Networking** or **Connection Info**
4. Enable public networking if needed
5. Copy the public connection string

### Step 3: Format Should Look Like

```
postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:5432/railway
```

Or:

```
postgresql://postgres:PASSWORD@PUBLIC-HOSTNAME.railway.app:PORT/railway
```

**NOT:**

```
postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway  ❌
```

### Step 4: Use the Public URL

```bash
cd server
DATABASE_URL="postgresql://postgres:PASSWORD@PUBLIC-HOSTNAME.railway.app:PORT/railway" \
  npm run update-covers -- --apply
```

## Alternative: Use Railway's Public Networking

If you can't find a public URL:

1. Go to your PostgreSQL service in Railway
2. Go to **Settings** → **Networking**
3. Enable **Public Networking** (if not already enabled)
4. Railway will generate a public URL
5. Copy that URL and use it

## Troubleshooting

### Still Getting Connection Errors?

1. **Check firewall**: Make sure your IP isn't blocked
2. **Check credentials**: Verify the password is correct
3. **Check port**: Usually 5432, but verify in Railway
4. **Try from Railway's web terminal**: If available, test connection there first

### Can't Find Public URL?

Some Railway databases might only have internal URLs. In that case:

1. Use Railway's web terminal (if available)
2. Or set up a Railway tunnel/proxy
3. Or use Railway CLI to run commands remotely

