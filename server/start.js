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
register({
    baseUrl: resolve(__dirname, 'dist'),
    paths: {
        '@/*': ['*']
    }
});

// Import and run the actual application
import('./dist/index.js');

