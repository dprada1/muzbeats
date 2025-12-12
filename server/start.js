/**
 * Production entry point that registers TypeScript path aliases
 * This allows @/ imports to work at runtime
 */
import { register } from 'tsconfig-paths';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register path aliases from tsconfig.json
// baseUrl points to dist (where compiled files are)
// paths map @/* to * (same structure as src)
register({
    baseUrl: resolve(__dirname, 'dist'),
    paths: {
        '@/*': ['*']
    }
});

// Import and run the actual application
await import('./dist/index.js');

