# Redirect Rule Configuration Explained

## Your Configuration

**Request URL:** `https://prodmuz.com/*`  
**Target URL:** `https://www.prodmuz.com/${1}`  
**Status Code:** `301`  
**Preserve Query String:** ✅ Checked

## What Each Field Does

### Request URL Pattern
- `https://prodmuz.com/*` matches:
  - `https://prodmuz.com/` (root)
  - `https://prodmuz.com/store`
  - `https://prodmuz.com/store?q=energy`
  - `https://prodmuz.com/anything/here`

The `*` is a wildcard that captures everything after `/`.

### Target URL with Replacement
- `${1}` is replaced with whatever the `*` matched
- `https://prodmuz.com/store` → `https://www.prodmuz.com/store`
- `https://prodmuz.com/store?q=energy` → `https://www.prodmuz.com/store?q=energy` (if query string preserved)

### Status Code 301
- **Permanent Redirect**
- Search engines update their index
- Browsers may cache the redirect
- Best for permanent domain changes

### Preserve Query String
- ✅ **Checked:** Keeps `?q=energy` in the URL
- ❌ **Unchecked:** Loses query parameters

**Always check this** for your use case - users might bookmark or share URLs with search queries.

---

## Example Redirects

| Original URL | Redirects To |
|--------------|--------------|
| `https://prodmuz.com/` | `https://www.prodmuz.com/` |
| `https://prodmuz.com/store` | `https://www.prodmuz.com/store` |
| `https://prodmuz.com/store?q=energy` | `https://www.prodmuz.com/store?q=energy` |
| `https://prodmuz.com/store/cart` | `https://www.prodmuz.com/store/cart` |

---

## Why Multiple Status Codes?

Different use cases:
- **301/308:** Permanent moves (domain change, site migration)
- **302/307:** Temporary moves (maintenance, A/B testing)
- **303:** Special case (POST → GET redirect)

For your case (permanent redirect to www), **301 is correct**.

