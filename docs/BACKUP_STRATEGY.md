# Backup Strategy for Sensitive Assets

## What Should NOT Be in Public Git

1. **Audio Files (WAV, MP3)**
   - Copyright protection
   - File size (2.3GB+)
   - Should be served by server, not in repo

2. **Test Fixtures with Sensitive Data**
   - Real API keys
   - Real user data
   - Large test files

3. **Environment Variables**
   - `.env` files with secrets
   - API keys, database passwords

## What SHOULD Be in Public Git

1. **Test Code** (`*.test.ts`, `__tests__/**/*.ts`)
   - Just code, no secrets
   - Safe to commit

2. **Mock Data Generators**
   - Code that generates fake data
   - No real secrets

3. **Environment Templates** (`.env.example`)
   - Placeholder values
   - Shows what variables are needed

## Backup Strategy

### Layer 1: Local Backups (External Drive)
- **What**: Full monorepo + media files
- **Frequency**: Weekly/Monthly
- **Location**: External hard drive, USB drive
- **Pros**: Fast, offline, full control
- **Cons**: Can be lost/damaged

### Layer 2: Private Cloud Storage
- **What**: Media files (beats, images), sensitive test fixtures
- **Options**:
  - **Google Drive / Dropbox** (encrypted folder)
  - **iCloud** (encrypted)
  - **AWS S3** (private bucket, encrypted)
  - **Backblaze B2** (cheap cloud storage)
- **Pros**: Offsite, accessible anywhere
- **Cons**: Monthly cost, requires internet

### Layer 3: Private Git Repo (Optional)
- **What**: Sensitive assets in separate private repo
- **Structure**:
  ```
  muzbeats-assets/ (private repo)
  ├── beats/
  │   ├── mp3/
  │   └── wav/
  └── test-fixtures/
  ```
- **Pros**: Version control for assets
- **Cons**: Still need to backup the repo itself

### Layer 4: Encrypted Archive
- **What**: Encrypted `.zip` or `.tar.gz` with sensitive data
- **Tools**: 
  - `zip -e` (password-protected)
  - `7z` (AES-256 encryption)
  - `gpg` (GNU Privacy Guard)
- **Location**: Store in private cloud or external drive
- **Pros**: Extra security layer
- **Cons**: Requires password management

## Recommended Setup

1. **Public Git Repo** (GitHub/GitLab)
   - Code only (no media, no secrets)
   - Test code (no sensitive fixtures)
   - `.env.example` files

2. **Private Cloud Storage** (Google Drive / AWS S3)
   - All media files (beats, images)
   - Encrypted `.env` files (backup only)
   - Large test fixtures

3. **External Drive** (Monthly backup)
   - Full monorepo snapshot
   - All media files
   - Encrypted archives

4. **Local Machine** (Development)
   - Working copy with media files
   - `.env` files (gitignored)
   - Test fixtures (gitignored)

## Best Practices

1. **Never commit secrets** - Use `.env` files (gitignored)
2. **Use environment variables** - Load from `.env` at runtime
3. **Encrypt sensitive backups** - Add extra security layer
4. **Test with mock data** - Don't use real secrets in tests
5. **Document backup locations** - Keep a secure list of where backups are

## Example: Setting Up Encrypted Backup

```bash
# Create encrypted archive of media files
cd /path/to/muzbeats
7z a -p -mhe=on muzbeats-media-backup.7z server/public/assets/

# Upload to private cloud storage
# Store password in password manager (1Password, Bitwarden, etc.)
```

