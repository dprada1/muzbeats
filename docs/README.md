# MuzBeats Documentation

Comprehensive documentation for the MuzBeats project, covering architecture, APIs, setup, and development guides.

## 📚 Documentation Structure

### Getting Started
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Complete setup and installation guide
- **[ENV_SETUP.md](./ENV_SETUP.md)** - Environment variables configuration
- **[POSTGRES_SETUP.md](./POSTGRES_SETUP.md)** - PostgreSQL database setup guide

### Architecture
- **[architecture/OVERVIEW.md](./architecture/OVERVIEW.md)** - System architecture and high-level design
- **[architecture/SEARCH_SYSTEM.md](./architecture/SEARCH_SYSTEM.md)** - Search system architecture and implementation
- **[architecture/DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md)** - Database schema and design decisions
- **[architecture/DESIGN_DECISIONS.md](./architecture/DESIGN_DECISIONS.md)** - Detailed rationale for all design decisions

### API Documentation
- **[api/BEATS_API.md](./api/BEATS_API.md)** - Complete API reference for beats endpoints

### Development
- **[BACKEND_ROADMAP.md](./BACKEND_ROADMAP.md)** - Development roadmap and progress tracking
- **[BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md)** - Database backup procedures

### Specialized Topics
- **audio-system/** - Audio player and waveform system documentation (future)
- **search-parser/** - Search parser algorithm details (future)

## 🎯 Quick Navigation

**New to the project?**
1. Start with [GETTING_STARTED.md](./GETTING_STARTED.md)
2. Set up PostgreSQL: [POSTGRES_SETUP.md](./POSTGRES_SETUP.md)
3. Configure environment: [ENV_SETUP.md](./ENV_SETUP.md)

**Want to understand the architecture?**
1. Read [architecture/OVERVIEW.md](./architecture/OVERVIEW.md)
2. Explore [architecture/DESIGN_DECISIONS.md](./architecture/DESIGN_DECISIONS.md)
3. Learn about search: [architecture/SEARCH_SYSTEM.md](./architecture/SEARCH_SYSTEM.md)

**Working on the API?**
- See [api/BEATS_API.md](./api/BEATS_API.md) for endpoint documentation

**Planning features?**
- Check [BACKEND_ROADMAP.md](./BACKEND_ROADMAP.md) for completed and planned work

## 📖 Documentation Philosophy

This documentation follows these principles:

1. **Comprehensive**: Every major decision and feature is documented
2. **Explanatory**: Not just "what" but "why" - explains reasoning
3. **Practical**: Includes code examples and real-world usage
4. **Up-to-Date**: Reflects current implementation (renovated architecture)
5. **Accessible**: Clear structure, easy navigation

## 🔄 Documentation Updates

**Last Major Update**: November 2025  
**Version**: 2.0 (Renovated from file-based to database-backed)

The documentation was comprehensively updated to reflect:
- Migration from JSON file to PostgreSQL database
- Backend search and filtering implementation
- Enharmonic key matching system
- Modern architecture decisions

## 📝 Contributing to Documentation

When adding new features or making changes:

1. **Update relevant docs** - Don't leave documentation outdated
2. **Explain decisions** - Add to DESIGN_DECISIONS.md if significant
3. **Update roadmap** - Mark completed items in BACKEND_ROADMAP.md
4. **Add examples** - Include code examples in API docs
5. **Keep structure** - Follow existing organization

---

**Questions?** Check the relevant documentation file or review the code comments.
