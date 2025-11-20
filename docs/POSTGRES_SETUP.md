# PostgreSQL Setup Guide

## 🎯 Learning Objectives

By the end of this guide, you'll:
- Understand what PostgreSQL is and why we use it
- Install PostgreSQL on your Mac
- Create databases and tables
- Connect from Node.js
- Understand basic SQL concepts
- Know when to move to production

---

## 📋 Prerequisites

### Do you need Docker?

**Short answer: No, not for local development.**

**Why:**
- Docker is for containerization (running apps in isolated environments)
- For local development, installing PostgreSQL directly is simpler
- Docker adds complexity you don't need right now
- You can learn Docker later if needed

**When you might use Docker:**
- If you want to run multiple database versions
- If you want to easily reset your database
- For production-like environments

**For now:** Install PostgreSQL directly on your Mac.

---

## 🚀 Step 1: Install PostgreSQL

### Option A: Using Homebrew (Recommended)

**Why Homebrew?**
- Easiest way to install on Mac
- Easy to update/uninstall
- Manages dependencies automatically

**Commands:**
```bash
# 1. Check if Homebrew is installed
brew --version

# If not installed, install it:
# /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install PostgreSQL
brew install postgresql@16

# 3. Start PostgreSQL service
brew services start postgresql@16

# 4. Verify it's running
brew services list
# You should see postgresql@16 with status "started"
```

**What just happened?**
- Installed PostgreSQL version 16
- Started it as a background service (runs automatically on boot)
- PostgreSQL is now running on port 5432 (default)

### Option B: Using Postgres.app (GUI Alternative)

**Why this option?**
- Visual interface (easier for beginners)
- No command line needed
- Good for learning

**Steps:**
1. Download from: https://postgresapp.com/
2. Drag to Applications folder
3. Open Postgres.app
4. Click "Initialize" to create a new server

**Note:** If you use Postgres.app, skip the `brew services` commands.

---

## 🔍 Step 2: Verify Installation

**Commands:**
```bash
# Check PostgreSQL version
psql --version

# Should output something like: psql (PostgreSQL) 16.x
```

**If you get "command not found":**
- Add PostgreSQL to your PATH:
```bash
# Add to ~/.zshrc (or ~/.bash_profile if using bash)
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Then try again
psql --version
```

---

## 🗄️ Step 3: Create Your First Database

**What is a database?**
- A database is like a container for your data
- You'll have one database for your project
- Inside the database, you'll have tables (beats, orders, etc.)

**Commands:**
```bash
# 1. Connect to PostgreSQL (as default user)
psql postgres

# You should see a prompt like: postgres=#
# This means you're connected!

# 2. Create a database for development
CREATE DATABASE muzbeats_dev;

# 3. Create a database for testing (optional but recommended)
CREATE DATABASE muzbeats_test;

# 4. List all databases
\l

# 5. Connect to your new database
\c muzbeats_dev

# Prompt should change to: muzbeats_dev=#

# 6. Exit psql
\q
```

**What just happened?**
- Connected to PostgreSQL
- Created `muzbeats_dev` for development
- Created `muzbeats_test` for running tests
- Connected to your dev database
- Exited the PostgreSQL shell

**Troubleshooting:**
- If `psql postgres` fails, PostgreSQL might not be running
- Run: `brew services restart postgresql@16`

---

## 👤 Step 4: Create a Database User (Optional but Recommended)

**Why create a user?**
- Best practice for security
- Separates your app user from admin user
- Required for production

**Commands:**
```bash
# 1. Connect as admin
psql postgres

# 2. Create a user for your app
CREATE USER muzbeats_user WITH PASSWORD 'your_secure_password_here';

# 3. Grant privileges on your database
GRANT ALL PRIVILEGES ON DATABASE muzbeats_dev TO muzbeats_user;

# 4. Connect to your database
\c muzbeats_dev

# 5. Grant schema privileges (needed for creating tables)
GRANT ALL ON SCHEMA public TO muzbeats_user;

# 6. Exit
\q
```

**Note:** Replace `'your_secure_password_here'` with a real password. Save it somewhere safe (you'll need it for your `.env` file).

**For now (learning):** You can skip this step and use the default `postgres` user. We'll set up proper users before production.

---

## 📊 Step 5: Create Your First Table

**What is a table?**
- Like a spreadsheet with rows and columns
- Each row is a record (one beat)
- Each column is a field (id, title, bpm, etc.)

**Commands:**
```bash
# 1. Connect to your database
psql muzbeats_dev

# 2. Create a beats table
CREATE TABLE beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  key VARCHAR(50) NOT NULL,
  bpm INTEGER NOT NULL CHECK (bpm > 0 AND bpm < 300),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  audio_path VARCHAR(500) NOT NULL,
  cover_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# 3. View your table structure
\d beats

# 4. Insert a test beat
INSERT INTO beats (title, key, bpm, price, audio_path, cover_path)
VALUES (
  'Test Beat - "Learning"',
  'C maj',
  140,
  4.99,
  '/assets/beats/mp3/test.mp3',
  '/assets/images/test.webp'
);

# 5. Query all beats
SELECT * FROM beats;

# 6. Query specific columns
SELECT title, bpm, price FROM beats;

# 7. Query with WHERE clause
SELECT * FROM beats WHERE bpm > 150;

# 8. Exit
\q
```

**What just happened?**
- Created a `beats` table with columns matching your Beat type
- Added constraints (bpm must be > 0, price must be >= 0)
- Inserted a test record
- Learned basic SQL queries

**Key SQL Concepts:**
- `CREATE TABLE` - Creates a new table
- `PRIMARY KEY` - Unique identifier for each row
- `UUID` - Universally unique identifier (better than auto-increment)
- `VARCHAR(n)` - Text field with max length
- `INTEGER` - Whole numbers
- `DECIMAL(10, 2)` - Decimal numbers (10 digits, 2 after decimal)
- `NOT NULL` - Field is required
- `CHECK` - Validation constraint
- `DEFAULT` - Default value if not provided
- `INSERT INTO` - Add new rows
- `SELECT` - Query data
- `WHERE` - Filter results

---

## 🔌 Step 6: Connect from Node.js

**Why this step?**
- Your Express server needs to talk to PostgreSQL
- You'll use a library called `pg` (node-postgres)

**Commands:**
```bash
# 1. Navigate to server directory
cd server

# 2. Install PostgreSQL client library
npm install pg

# 3. Install TypeScript types
npm install --save-dev @types/pg
```

**Create connection file:**

Create `server/src/config/database.ts`:

```typescript
import pg from 'pg';
const { Pool } = pg;

// Create a connection pool
// Pool = reusable connections (more efficient than single connection)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'muzbeats_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Connection pool settings
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

export default pool;
```

**Create `.env` file:**

Create `server/.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=muzbeats_dev
DB_USER=postgres
DB_PASSWORD=

# Server
PORT=3000
```

**Note:** If you created a user in Step 4, use that user and password instead.

**Test the connection:**

Create `server/src/test-db.ts`:

```typescript
import dotenv from 'dotenv';
import pool from './config/database.js';

dotenv.config();

async function testConnection() {
  try {
    // Test query
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].now);
    
    // Test querying beats table
    const beats = await pool.query('SELECT * FROM beats LIMIT 5');
    console.log(`✅ Found ${beats.rows.length} beats`);
    console.log(beats.rows);
    
    // Close the pool
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
```

**Run the test:**
```bash
# From server directory
npx tsx src/test-db.ts
```

**Expected output:**
```
✅ Connected to PostgreSQL
✅ Database connection successful!
Current time: 2025-01-XX...
✅ Found 1 beats
[ { id: '...', title: 'Test Beat - "Learning"', ... } ]
```

**If you get errors:**
- Check PostgreSQL is running: `brew services list`
- Check database exists: `psql -l`
- Check `.env` file has correct values
- Check table exists: `psql muzbeats_dev -c "\d beats"`

---

## 📝 Step 7: Basic SQL Commands Reference

**Useful psql commands:**
```bash
# Connect to database
psql muzbeats_dev

# List all tables
\dt

# Describe table structure
\d beats

# List all databases
\l

# List all users
\du

# Show current database
SELECT current_database();

# Exit psql
\q
```

**Useful SQL queries:**
```sql
-- Select all
SELECT * FROM beats;

-- Select with conditions
SELECT * FROM beats WHERE bpm > 150;
SELECT * FROM beats WHERE key = 'C maj';
SELECT * FROM beats WHERE price BETWEEN 4.99 AND 9.99;

-- Count rows
SELECT COUNT(*) FROM beats;

-- Update a row
UPDATE beats SET price = 5.99 WHERE id = 'your-id-here';

-- Delete a row
DELETE FROM beats WHERE id = 'your-id-here';

-- Order results
SELECT * FROM beats ORDER BY bpm DESC;
SELECT * FROM beats ORDER BY price ASC;

-- Limit results
SELECT * FROM beats LIMIT 10;
SELECT * FROM beats OFFSET 10 LIMIT 10; -- Pagination
```

---

## 🎓 Step 8: Understanding the Architecture

**How it all fits together:**

```
┌─────────────┐
│   Client    │  React app (Vite)
│  (Browser)  │  - Makes API calls
└──────┬──────┘
       │ HTTP
       │
┌──────▼──────┐
│   Server    │  Express.js
│  (Node.js)  │  - Receives requests
└──────┬──────┘  - Processes business logic
       │ SQL
       │
┌──────▼──────┐
│ PostgreSQL  │  Database
│  (Database) │  - Stores data
└─────────────┘  - Handles queries
```

**Data flow:**
1. User searches on frontend
2. Frontend calls `/api/beats/search`
3. Server receives request
4. Server queries PostgreSQL
5. PostgreSQL returns results
6. Server sends JSON to frontend
7. Frontend displays results

---

## 🚀 Step 9: When to Set Up Vercel/Railway

**Timeline:**

### Now (Development Phase):
- ✅ Install PostgreSQL locally
- ✅ Create database and tables
- ✅ Connect from Node.js
- ✅ Build your backend with local PostgreSQL
- ❌ Don't set up Vercel/Railway yet

### Before Launch (Production Phase):
- Set up Railway for backend + PostgreSQL
- Set up Vercel for frontend
- Migrate data from local to production
- Test everything in production

**Why wait?**
- Focus on building features first
- Local development is faster
- No costs while developing
- Easier to debug locally
- Set up production when you're ready to launch

**When you're ready:**
- You have Stripe integration working
- You have order system working
- You've tested locally
- You're ready to get real users

---

## 🐛 Common Issues & Solutions

### Issue: "psql: command not found"
**Solution:**
```bash
# Add to PATH
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
# Add to ~/.zshrc to make permanent
```

### Issue: "Connection refused"
**Solution:**
```bash
# Check if PostgreSQL is running
brew services list

# Start it if not running
brew services start postgresql@16
```

### Issue: "database does not exist"
**Solution:**
```bash
# Create it
createdb muzbeats_dev
# Or in psql:
CREATE DATABASE muzbeats_dev;
```

### Issue: "password authentication failed"
**Solution:**
- Check your `.env` file
- Try connecting with: `psql -U postgres`
- If you created a user, use that user's password

### Issue: "relation does not exist"
**Solution:**
- Table doesn't exist yet
- Create it with `CREATE TABLE` command
- Or check you're connected to the right database: `SELECT current_database();`

---

## 📚 Next Steps

1. **Complete Steps 1-6** (Install, create DB, connect)
2. **Test the connection** (Step 6 test script)
3. **Start building** your backend with PostgreSQL
4. **Learn as you go** - Google SQL syntax when needed
5. **Set up production** when ready to launch

---

## 🎯 Learning Resources

**SQL Tutorials:**
- PostgreSQL Official Docs: https://www.postgresql.org/docs/
- SQLBolt (Interactive): https://sqlbolt.com/
- PostgreSQL Tutorial: https://www.postgresqltutorial.com/

**Node.js + PostgreSQL:**
- node-postgres docs: https://node-postgres.com/
- Prisma docs (if you use ORM): https://www.prisma.io/docs

---

## ✅ Checklist

- [ ] PostgreSQL installed
- [ ] PostgreSQL running (`brew services list`)
- [ ] Database created (`muzbeats_dev`)
- [ ] Can connect with `psql`
- [ ] Created `beats` table
- [ ] Inserted test data
- [ ] Installed `pg` package
- [ ] Created `database.ts` config
- [ ] Created `.env` file
- [ ] Test connection works (`test-db.ts`)
- [ ] Ready to build backend!

---

**Remember:** Learning by doing is the best way. Don't be afraid to break things - that's how you learn! 🚀

