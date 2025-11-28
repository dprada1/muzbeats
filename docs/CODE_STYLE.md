# Code Style Guide

This document outlines the coding standards and formatting conventions for the MuzBeats project.

## Indentation

**TypeScript/JavaScript Files:** All `.ts` and `.tsx` files must use **4 spaces** for indentation.

**Why 4 spaces?**
- Consistent with the existing codebase
- Better readability for nested code
- Standard in many TypeScript/React projects

**JSON Files:** All JSON files must use **2 spaces** for indentation.

**Example:**
```json
{
  "name": "MuzBeats",
  "version": "1.0.0",
  "dependencies": {
    "express": "^5.1.0",
    "react": "^19.1.0"
  }
}
```

**Why 2 spaces?**
- Consistent with JavaScript/TypeScript conventions
- More readable than tabs or 4 spaces
- Standard in most modern projects
- Easier to maintain and review

**Tools:**
- Most editors can be configured to use 2 spaces for JSON
- Prettier (if used) should be configured with `"tabWidth": 2` for JSON files
- ESLint can enforce this with appropriate rules

---

## JSDoc Comments

**Format:** JSDoc comments must use aligned asterisks with proper spacing.

**Example:**
```typescript
/**
 * Function description that explains what the function does.
 * 
 * @param param1 - Description of parameter
 * @param param2 - Description of another parameter
 * @returns Description of return value
 */
function example(param1: string, param2: number): boolean {
    // ...
}
```

**Rules:**
- Opening `/**` on its own line
- Each content line must start with ` * ` (space, asterisk, space)
- Closing `*/` on its own line
- Asterisks must be aligned vertically
- Maintain proper indentation level matching the code block

**Why this format?**
- Consistent with standard JSDoc conventions
- Better readability and alignment
- Easier to maintain and review

---

## File Endings

**Trailing Newlines:** All files must end with exactly **1 newline** (not 0, not 2).

**Why?**
- Consistent with POSIX standards
- Prevents issues with some tools and git diffs
- Standard practice in most codebases

---

**Last Updated:** November 2025

