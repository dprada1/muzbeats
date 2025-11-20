# MuzBeats

A modern, scalable music beat store application with React frontend and Express backend, featuring advanced search capabilities, audio playback with waveform visualization, and a PostgreSQL database.

## ✨ Features

- 🎵 **Beat Store**: Browse and search through a catalog of music beats
- 🔍 **Advanced Search**: Natural language search with BPM, key, and keyword filtering
- 🎹 **Enharmonic Key Matching**: Intelligent key matching (A minor = C major)
- 🎧 **Audio Playback**: Waveform visualization with WaveSurfer.js
- 🗄️ **Database-Backed**: PostgreSQL for scalable, production-ready data storage
- 🛒 **Shopping Cart**: Add beats to cart (checkout coming soon)
- 📱 **Responsive Design**: Works on desktop and mobile

## 🏗️ Architecture

**Monorepo Structure:**
- **Client**: React + TypeScript + Vite (port 5173)
- **Server**: Express + TypeScript + PostgreSQL (port 3000)
- **Database**: PostgreSQL with connection pooling

**Key Technologies:**
- Frontend: React 19, TypeScript, Tailwind CSS, WaveSurfer.js
- Backend: Express 5, TypeScript, node-postgres
- Database: PostgreSQL 16
- Build Tools: Vite, tsx

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 16+
- npm

### Installation

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd muzbeats
   
   # Install backend dependencies
   cd server && npm install
   
   # Install frontend dependencies
   cd ../client && npm install
   ```

2. **Set up database:**
   ```bash
   # See docs/POSTGRES_SETUP.md for detailed instructions
   createdb muzbeats_dev
   cd ../server
   npx tsx src/db/setup-table.ts
   npm run migrate
   ```

3. **Configure environment:**
   ```bash
   # Create server/.env (see docs/ENV_SETUP.md)
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=muzbeats_dev
   DB_USER=postgres
   DB_PASSWORD=
   PORT=3000
   ```

4. **Start development servers:**
   
   **Terminal 1 - Backend:**
   ```bash
   cd server
   npm run dev
   ```
   → http://localhost:3000
   
   **Terminal 2 - Frontend:**
   ```bash
   cd client
   npm run dev
   ```
   → http://localhost:5173

### Verify Installation

- Backend health: http://localhost:3000/health
- Database test: `cd server && npm run test-db`
- Frontend: http://localhost:5173

📖 **For detailed setup instructions, see [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)**

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Getting Started](./docs/GETTING_STARTED.md)** - Setup and installation guide
- **[Architecture Overview](./docs/architecture/OVERVIEW.md)** - System design and decisions
- **[API Documentation](./docs/api/BEATS_API.md)** - API endpoints and usage
- **[Search System](./docs/architecture/SEARCH_SYSTEM.md)** - Search architecture and implementation
- **[Database Schema](./docs/architecture/DATABASE_SCHEMA.md)** - Database design and schema
- **[PostgreSQL Setup](./docs/POSTGRES_SETUP.md)** - Database installation guide
- **[Environment Setup](./docs/ENV_SETUP.md)** - Environment variables guide
- **[Backend Roadmap](./docs/BACKEND_ROADMAP.md)** - Development roadmap and progress

## 🛠️ Development

### Available Scripts

**Backend (`server/`):**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm run migrate` - Import beats from JSON to database
- `npm run test-db` - Test database connection

**Frontend (`client/`):**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests

### Project Structure

```
muzbeats/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/      # Route pages
│   │   ├── context/    # State management
│   │   └── utils/      # Utilities
│   └── package.json
│
├── server/              # Express backend
│   ├── src/
│   │   ├── config/     # Database config
│   │   ├── controllers/# HTTP handlers
│   │   ├── routes/     # API routes
│   │   ├── services/   # Business logic
│   │   ├── utils/      # Search utilities
│   │   └── db/         # Database scripts
│   └── package.json
│
└── docs/                # Documentation
```

## 🔍 Search Features

The search system supports natural language queries:

- **Keywords**: `pierre`, `shoreline` (searches in titles)
- **BPM**: `160`, `160bpm`, `150-170` (exact or range)
- **Keys**: `Cm`, `CM`, `C min`, `C#min` (case-sensitive: CM = major, Cm = minor)
- **Combined**: `pierre 160 C#min` (all criteria)

**Enharmonic Matching:**
- Searches automatically include enharmonic equivalents
- Example: "Am" also finds "C maj" beats (same notes, different key)

See [Search System Documentation](./docs/architecture/SEARCH_SYSTEM.md) for details.

## 🗄️ Database

**Current Schema:**
- `beats` table with 63 beats migrated from JSON
- Indexes on bpm, key, and price for fast queries
- UUID primary keys for scalability

**Future Tables:**
- `orders` - Customer orders
- `order_items` - Items in each order
- `downloads` - Secure download tracking

See [Database Schema Documentation](./docs/architecture/DATABASE_SCHEMA.md) for details.

## 🛑 Stopping Services

**Graceful Stop:**
- Press `Ctrl + C` in each terminal (press twice if needed)

**Force Kill:**
```bash
# Kill server
lsof -ti :3000 | xargs kill -9

# Kill client
lsof -ti :5173 | xargs kill -9

# Kill both
lsof -ti :3000 :5173 | xargs kill -9
```

📖 **For detailed instructions, see [START_STOP.md](./START_STOP.md)**

## 🔐 Security

- Environment variables in `.env` (gitignored)
- Parameterized SQL queries (SQL injection safe)
- No secrets committed to repository

See [SECURITY_CHECK.md](./SECURITY_CHECK.md) for security audit results.

## 🚧 Roadmap

**Completed:**
- ✅ Monorepo structure
- ✅ PostgreSQL database setup
- ✅ Data migration (JSON → PostgreSQL)
- ✅ Backend search & filtering
- ✅ Enharmonic key matching

**In Progress:**
- 🔄 Stripe payment integration
- 🔄 Order management system

See [Backend Roadmap](./docs/BACKEND_ROADMAP.md) for full details.

## 📝 License

ISC

---

**Version**: 2.0 (Renovated from file-based to database-backed)  
**Last Updated**: November 2025
