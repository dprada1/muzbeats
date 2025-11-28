# Code Style Guide

This document outlines the coding standards and formatting conventions for the MuzBeats project.

## JSON Files

**Indentation:** All JSON files must use **2 spaces** for indentation.

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

**Last Updated:** November 2025

