# Code Organization

## Overview
This document describes the organization of utility and helper code in the client application.

## Directory Structure

### `/client/src/api/`
**Purpose**: API-related utilities and validation

**Files**:
- `api.ts` - API URL construction, asset URL transformation
  - `getApiUrl()` - Get base API URL based on environment
  - `apiUrl()` - Build full API URL from path
  - `getR2PublicUrl()` - Get R2 CDN URL for assets
  - `getAssetUrl()` - Get base asset URL
  - `assetUrl()` - Build full asset URL from path
  - `transformBeatAssets()` - Transform single beat's asset paths to full URLs
  - `transformBeatsAssets()` - Transform array of beats' asset paths to full URLs

- `apiValidation.ts` - API response validation using Zod
  - Zod schemas for API responses (`BeatSchema`, `PayPalConfigSchema`, etc.)
  - `validatedFetch()` - Fetch wrapper with automatic response validation
  - Type exports for validated responses

### `/client/src/validation/`
**Purpose**: Input and data validation utilities

**Files**:
- `validation.ts` - Validation functions for user input and data structures
  - `isValidUUID()` - Validate UUID format
  - `isValidBeatId()` - Validate beat ID format
  - `isValidOrderId()` - Validate order ID format
  - `validateSearchQuery()` - Validate and sanitize search queries
  - `truncateForDisplay()` - Truncate text for UI display
  - `isValidBeat()` - Validate Beat object structure
  - `validateCartData()` - Validate and sanitize cart data from localStorage

### `/client/src/security/`
**Purpose**: Security-related utilities

**Files**:
- `errorSanitization.ts` - Error message sanitization
  - `sanitizeErrorMessage()` - Remove sensitive information from error messages
  - Filters stack traces, file paths, credentials, database errors
  - Provides user-friendly error messages

### `/client/src/utils/`
**Purpose**: Simple helper functions (non-API, non-validation, non-security)

**Files**:
- `formatTime.ts` - Time formatting utilities
  - `formatTime()` - Convert seconds to "m:ss" format

- `preload.ts` - Resource preloading utilities
  - `preloadImage()` - Preload an image asynchronously

## Import Guidelines

### When to use each directory:

- **`@/api/*`**: Use for anything related to API calls, URL construction, or API response validation
- **`@/validation/*`**: Use for validating user input, URL parameters, or data structures
- **`@/security/*`**: Use for security-related utilities (error sanitization, etc.)
- **`@/utils/*`**: Use for simple, general-purpose helper functions that don't fit the above categories

### Examples:

```typescript
// ✅ API-related
import { apiUrl, transformBeatsAssets } from '@/api/api';
import { validatedFetch, BeatSchema } from '@/api/apiValidation';

// ✅ Validation
import { isValidBeatId, validateSearchQuery } from '@/validation/validation';

// ✅ Security
import { sanitizeErrorMessage } from '@/security/errorSanitization';

// ✅ Simple utilities
import { formatTime } from '@/utils/formatTime';
import { preloadImage } from '@/utils/preload';
```

## Migration Notes

This structure was reorganized from a flat `/utils/` directory to improve code organization and maintainability. The reorganization separates concerns:

- **API code** is isolated and can be easily mocked/tested
- **Validation logic** is centralized and reusable
- **Security utilities** are clearly separated
- **Simple helpers** remain in utils for easy access

## Benefits

1. **Clear separation of concerns**: Each directory has a specific purpose
2. **Easier to find code**: Developers know where to look for specific functionality
3. **Better maintainability**: Related code is grouped together
4. **Improved testability**: API code can be easily mocked, validation can be tested independently
5. **Scalability**: Easy to add new files to the appropriate directory

