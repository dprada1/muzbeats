# Security Audit Guide for React Dependencies

## Current React Version
- **React**: `^19.1.0` (latest stable)
- **React DOM**: `^19.1.0`

## How to Check React Version

### Method 1: Check package.json
```bash
cd client
cat package.json | grep -A 1 '"react"'
```

### Method 2: Check installed version
```bash
cd client
npm list react react-dom
```

### Method 3: Check in browser console
```javascript
console.log(React.version);
```

### Method 4: Check package-lock.json
```bash
cd client
grep -A 2 '"react"' package-lock.json | head -10
```

## Actionable Security Steps

### 1. **Audit Dependencies for Known Vulnerabilities**

#### Run npm audit (Built-in)
```bash
cd client
npm audit
```

#### Fix automatically (if safe)
```bash
npm audit fix
```

#### Get detailed report
```bash
npm audit --json > audit-report.json
```

### 2. **Use Security Scanning Tools**

#### Install and run Snyk (Recommended)
```bash
# Install Snyk CLI globally
npm install -g snyk

# Authenticate (free account)
snyk auth

# Test your project
cd client
snyk test

# Monitor continuously
snyk monitor
```

#### Use OWASP Dependency-Check
```bash
# Install via Homebrew (macOS)
brew install dependency-check

# Run scan
cd client
dependency-check --project "MuzBeats" --scan . --format JSON --out ./security-report
```

#### Use npm-check-updates with audit
```bash
# Install
npm install -g npm-check-updates

# Check for outdated packages
cd client
ncu

# Check with security audit
ncu --audit
```

### 3. **Verify Package Integrity**

#### Check package signatures
```bash
cd client
npm ci --prefer-offline --no-audit
npm audit --production
```

#### Verify package-lock.json integrity
```bash
cd client
npm install --package-lock-only
git diff package-lock.json
```

### 4. **Check for Suspicious Packages**

#### List all installed packages
```bash
cd client
npm list --depth=0
```

#### Check for packages with known issues
```bash
# Check for packages with no maintainer
npm list --depth=0 | grep -E "(unmaintained|deprecated)"

# Check package sizes (unusually large = suspicious)
cd client
du -sh node_modules/* | sort -h | tail -20
```

#### Review package sources
```bash
cd client
npm list --depth=0 --json | jq '.dependencies | to_entries[] | {name: .key, version: .value.version, resolved: .value.resolved}'
```

### 5. **Use Automated Security Tools**

#### GitHub Dependabot (if using GitHub)
Add `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/client"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

#### Renovate Bot (Alternative)
Create `renovate.json` in root:
```json
{
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchPackagePatterns": ["react", "react-dom"],
      "groupName": "react packages"
    }
  ]
}
```

### 6. **Manual Security Checklist**

#### ✅ Verify package sources
- [ ] All packages come from npm registry (not random URLs)
- [ ] No packages from suspicious domains
- [ ] Check `package-lock.json` for unusual `resolved` URLs

#### ✅ Review package maintainers
```bash
cd client
npm view react maintainers
npm view react-dom maintainers
```

#### ✅ Check for typosquatting
- [ ] Verify exact package names (e.g., `react` not `reacct`)
- [ ] Check for packages with similar names
- [ ] Review recently added packages

#### ✅ Monitor package updates
```bash
# Check for outdated packages
cd client
npm outdated

# Review changelogs before updating
npm view react changelog
```

### 7. **React-Specific Security Concerns**

#### Check for compromised React packages
- React itself is maintained by Meta/Facebook - verify at: https://github.com/facebook/react
- React DOM should match React version exactly
- Be cautious of packages claiming to be "React" but aren't official

#### Verify React installation
```bash
cd client
npm list react react-dom
# Should show matching versions
```

#### Check for malicious React hooks/utilities
```bash
# List all React-related packages
cd client
npm list | grep -i react
```

### 8. **Continuous Monitoring**

#### Set up automated checks
```bash
# Add to package.json scripts
"security:audit": "npm audit && snyk test",
"security:check": "npm outdated && npm audit"
```

#### Run weekly security checks
```bash
cd client
npm run security:audit
```

### 9. **Emergency Response**

If you suspect malware:

1. **Immediately isolate**
   ```bash
   cd client
   rm -rf node_modules package-lock.json
   ```

2. **Review package.json manually**
   - Check for suspicious packages
   - Verify all package names

3. **Clean reinstall**
   ```bash
   npm ci
   npm audit
   ```

4. **Check for unauthorized changes**
   ```bash
   git diff package.json package-lock.json
   ```

5. **Report to npm security**
   - Email: security@npmjs.com
   - Or use: https://www.npmjs.com/support

### 10. **Best Practices Going Forward**

1. **Pin exact versions for critical packages**
   ```json
   "react": "19.1.0",  // Remove ^ for production
   ```

2. **Use npm ci instead of npm install**
   - Ensures exact versions from package-lock.json
   - Faster and more secure

3. **Review package-lock.json in git**
   - Commit it to version control
   - Review changes before committing

4. **Use .npmrc for security**
   ```ini
   audit=true
   audit-level=moderate
   fund=false
   ```

5. **Regular updates**
   ```bash
   # Update weekly
   npm outdated
   npm update
   npm audit
   ```

## Quick Security Check Script

Create `scripts/security-check.sh`:
```bash
#!/bin/bash
cd client

echo "🔍 Checking React version..."
npm list react react-dom

echo "🔍 Running npm audit..."
npm audit

echo "🔍 Checking for outdated packages..."
npm outdated

echo "🔍 Verifying package integrity..."
npm ci --dry-run

echo "✅ Security check complete!"
```

Make it executable:
```bash
chmod +x scripts/security-check.sh
```

## Resources

- **npm Security**: https://docs.npmjs.com/security-best-practices
- **React Security**: https://react.dev/learn/escape-hatches
- **Snyk Vulnerability DB**: https://security.snyk.io/
- **npm Security Advisories**: https://github.com/advisories?query=ecosystem:npm
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/

## React-Specific Security Notes

React 19.1.0 is the latest stable version and is actively maintained by Meta. However:

1. **Keep React updated** - Security patches are released regularly
2. **Be cautious with third-party React packages** - Always verify maintainers
3. **Review React-related dependencies** - Especially hooks, utilities, and wrappers
4. **Check for React-specific vulnerabilities** - Use React's official security page
5. **Avoid packages that modify React internals** - These can be security risks

## Monitoring Commands

Run these regularly (weekly recommended):

```bash
cd client
npm audit                    # Check for vulnerabilities
npm outdated                 # Check for updates
npm list --depth=0           # Review installed packages
snyk test                    # If using Snyk
```
