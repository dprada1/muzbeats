# Getting Started with MuzBeats

## 🎯 What is MuzBeats?

MuzBeats is a modern music beat store application where users can browse, search, and purchase music beats. The application features:

- **Advanced Search**: Natural language search with BPM, key, and keyword filtering
- **Audio Playback**: Waveform visualization with WaveSurfer.js
- **Database-Backed**: PostgreSQL for scalable data storage
- **Modern Stack**: React + TypeScript frontend, Express + TypeScript backend

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PostgreSQL** (v16 recommended) - [Installation Guide](./POSTGRES_SETUP.md)
- **Git** - [Download](https://git-scm.com/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd muzbeats
```

### 2. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd ../client
npm install
```

### 3. Set Up PostgreSQL

Follow the detailed guide in [POSTGRES_SETUP.md](./POSTGRES_SETUP.md) to:
- Install PostgreSQL
- Create the database
- Set up the `beats` table

**Quick Setup:**
```bash
# Create database
createdb muzbeats_dev

# Run setup script
cd server
npx tsx src/db/setup-table.ts

# Migrate data
npm run migrate
```

### 4. Configure Environment Variables

**Create `server/.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=muzbeats_dev
DB_USER=postgres
DB_PASSWORD=
PORT=3000
NODE_ENV=development
```

See [ENV_SETUP.md](./ENV_SETUP.md) for detailed instructions.

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
Server runs on: http://localhost:3000

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```
Client runs on: http://localhost:5173

### 6. Verify Everything Works

1. **Check Backend:**
   - Visit http://localhost:3000/health
   - Should return: `{"status":"ok","message":"Server is running"}`

2. **Check Database:**
   ```bash
   cd server
   npm run test-db
   ```
   Should show: "Database connection successful!" and beat count

3. **Check Frontend:**
   - Visit http://localhost:5173
   - Should see the beat store with all beats

4. **Test Search:**
   - Search for "pierre" - should filter beats
   - Search for "160" - should show beats with BPM 160
   - Search for "Cm" - should show C minor beats

## 📁 Project Structure

```
muzbeats/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── context/        # React Context providers
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript types
│   └── package.json
│
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── controllers/    # HTTP handlers
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities
│   │   ├── types/          # TypeScript types
│   │   └── db/             # Database scripts
│   ├── public/             # Static assets
│   └── package.json
│
└── docs/                   # Documentation
    ├── architecture/       # System design
    ├── api/                # API docs
    └── ...
```

## 🔧 Development Workflow

### Making Changes

1. **Backend Changes:**
   - Edit files in `server/src/`
   - Server auto-reloads (tsx watch)
   - Test with: `curl http://localhost:3000/api/beats`

2. **Frontend Changes:**
   - Edit files in `client/src/`
   - Browser auto-reloads (Vite HMR)
   - Changes appear instantly

3. **Database Changes:**
   - Modify `server/src/db/schema.sql`
   - Run setup script: `npx tsx src/db/setup-table.ts`
   - Or manually: `psql muzbeats_dev -f src/db/schema.sql`

### Testing

**Backend:**
```bash
cd server
npm run test-db  # Test database connection
```

**Frontend:**
```bash
cd client
npm test  # Run Vitest tests
```

### Database Migrations

**Import beats from JSON:**
```bash
cd server
npm run migrate
```

**Reset database:**
```bash
cd server
npx tsx src/db/setup-table.ts
npm run migrate
```

## 🐛 Troubleshooting

### Server Won't Start

**Check:**
- PostgreSQL is running: `brew services list` (Mac) or `sudo systemctl status postgresql` (Linux)
- Port 3000 is free: `lsof -i :3000`
- `.env` file exists and has correct values

### Database Connection Fails

**Check:**
- Database exists: `psql -l | grep muzbeats`
- User has permissions: `psql muzbeats_dev -c "\du"`
- `.env` file has correct credentials

### Frontend Can't Connect to Backend

**Check:**
- Backend is running on port 3000
- CORS is enabled (should be by default)
- No browser console errors

### Search Not Working

**Check:**
- Database has beats: `npm run test-db`
- Backend logs show queries
- Browser network tab shows API calls

## 📚 Next Steps

1. **Read the Documentation:**
   - [Architecture Overview](./architecture/OVERVIEW.md)
   - [API Documentation](./api/BEATS_API.md)
   - [Search System](./architecture/SEARCH_SYSTEM.md)
   - [Database Schema](./architecture/DATABASE_SCHEMA.md)

2. **Explore the Code:**
   - Start with `server/src/index.ts` (backend entry)
   - Then `client/src/main.tsx` (frontend entry)
   - Follow the data flow from API to database

3. **Try the Features:**
   - Test different search queries
   - Explore the audio player
   - Check out the cart functionality

## 🎓 Learning Resources

- **PostgreSQL**: https://www.postgresql.org/docs/
- **Express.js**: https://expressjs.com/
- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/

---

**Need Help?** Check the other documentation files or review the code comments.

**Last Updated**: November 2025

