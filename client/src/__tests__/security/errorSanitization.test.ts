import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    sanitizeErrorMessage,
    isNetworkError,
    isServerError,
} from '@/security/errorSanitization';

describe('sanitizeErrorMessage', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('handles Error objects', () => {
        const error = new Error('Something went wrong');
        const result = sanitizeErrorMessage(error);
        expect(result).toBe('Something went wrong');
    });

    it('handles string errors', () => {
        const result = sanitizeErrorMessage('String error message');
        expect(result).toBe('String error message');
    });

    it('handles other types by converting to string', () => {
        expect(sanitizeErrorMessage(123)).toBe('123');
        expect(sanitizeErrorMessage(null)).toBe('null');
        expect(sanitizeErrorMessage(undefined)).toBe('undefined');
    });

    it('removes stack traces', () => {
        const error = new Error('Error message\nat /path/to/file.ts:123:45\nat anotherFunction');
        const result = sanitizeErrorMessage(error);
        expect(result).not.toContain('at /path/to/file.ts');
        expect(result).not.toContain('at anotherFunction');
        expect(result).toContain('Error message');
    });

    it('removes absolute file paths', () => {
        const error = new Error('Error /Users/path/to/file.ts:123:45 happened');
        const result = sanitizeErrorMessage(error);
        expect(result).not.toContain('/Users/path/to/file.ts:123:45');
    });

    it('removes Windows file paths', () => {
        const error = new Error('Error C:\\Users\\path\\to\\file.ts:123:45 happened');
        const result = sanitizeErrorMessage(error);
        expect(result).not.toContain('C:\\Users\\path\\to\\file.ts');
    });

    it('removes internal URLs with paths', () => {
        const error = new Error('Error https://api.example.com/internal/path/endpoint happened');
        const result = sanitizeErrorMessage(error);
        expect(result).not.toContain('https://api.example.com/internal/path/endpoint');
    });

    it('removes technical error prefixes', () => {
        expect(sanitizeErrorMessage('Error: Something went wrong')).not.toContain('Error:');
        expect(sanitizeErrorMessage('TypeError: Invalid type')).not.toContain('TypeError:');
        expect(sanitizeErrorMessage('ReferenceError: Undefined variable')).not.toContain('ReferenceError:');
    });

    it('removes database error codes', () => {
        const error = new Error('Error [SQL: SELECT * FROM users] occurred');
        const result = sanitizeErrorMessage(error);
        expect(result).not.toContain('[SQL:');
        expect(result).not.toContain('SELECT * FROM users]');
    });

    it('removes error brackets', () => {
        const error = new Error('Error [DatabaseError: Connection failed] occurred');
        const result = sanitizeErrorMessage(error);
        expect(result).not.toContain('[DatabaseError:');
    });

    it('cleans up multiple spaces', () => {
        const error = new Error('Error    with    multiple    spaces');
        const result = sanitizeErrorMessage(error);
        expect(result).not.toContain('    ');
        expect(result.split(' ').length).toBeLessThan(10);
    });

    it('trims whitespace', () => {
        const error = new Error('   Error message   ');
        const result = sanitizeErrorMessage(error);
        expect(result).toBe('Error message');
    });

    it('returns generic message for sensitive patterns - password', () => {
        const error = new Error('Password validation failed');
        const result = sanitizeErrorMessage(error, 'auth');
        // Should return generic message (contains sensitive pattern "password")
        expect(result).toContain('error occurred');
        expect(result).not.toContain('Password');
        expect(result).not.toContain('validation failed');
    });

    it('returns generic message for sensitive patterns - token', () => {
        const error = new Error('Invalid token provided');
        const result = sanitizeErrorMessage(error, 'auth');
        // Should return generic message (contains sensitive pattern "token")
        expect(result).toContain('error occurred');
        expect(result).not.toContain('token');
        expect(result).not.toContain('Invalid');
    });

    it('returns generic message for sensitive patterns - secret', () => {
        const error = new Error('Secret key mismatch');
        const result = sanitizeErrorMessage(error, 'config');
        // Should return generic message (contains sensitive pattern "secret")
        expect(result).toContain('error occurred');
        expect(result).not.toContain('Secret');
        expect(result).not.toContain('key mismatch');
    });

    it('returns generic message for sensitive patterns - database', () => {
        const error = new Error('Database connection failed');
        const result = sanitizeErrorMessage(error, 'db');
        // Should return generic message (contains sensitive pattern "database")
        expect(result).toContain('error occurred');
        expect(result).not.toContain('Database');
        expect(result).not.toContain('connection failed');
    });

    it('returns generic message for sensitive patterns - SQL', () => {
        const error = new Error('SQL SELECT query failed');
        const result = sanitizeErrorMessage(error, 'db');
        // Should return generic message (contains sensitive pattern "sql select")
        expect(result).toContain('error occurred');
        expect(result).not.toContain('SQL');
        expect(result).not.toContain('SELECT');
    });

    it('returns generic message for sensitive patterns - stack trace', () => {
        const error = new Error('Stack trace: at function');
        const result = sanitizeErrorMessage(error);
        // Should return generic message (contains "stack trace" pattern)
        expect(result).toBe('An error occurred. Please try again or contact support if the issue persists.');
        expect(result).not.toContain('Stack trace');
        expect(result).not.toContain('at function');
    });

    it('removes file:// URLs from messages', () => {
        const error = new Error('Error in file:///path/to/file.js:123:45');
        const result = sanitizeErrorMessage(error);
        // The path portion gets removed, leaving "Error in file:"
        // (absolute path regex removes "/path/to/file.js:123:45")
        expect(result).not.toContain('file://');
        expect(result).not.toContain('path/to/file.js');
        expect(result).toBe('Error in file:');
    });

    it('returns generic message if sanitization removes everything', () => {
        // Error message that will be completely removed by sanitization
        const error = new Error('at /path/to/file.ts:123:45');
        const result = sanitizeErrorMessage(error);
        // Should return generic message since sanitization removes everything
        expect(result).toBe('An error occurred. Please try again or contact support if the issue persists.');
    });

    // Note: sanitizeErrorMessage only returns context-specific generic messages when
    // the original message contains sensitive patterns or is removed by sanitization.
    // For normal messages, it returns the sanitized version of the original message.

    it('returns sanitized message for non-sensitive content', () => {
        const error = new Error('Payment processing failed');
        const result = sanitizeErrorMessage(error, 'payment');
        // Non-sensitive message passes through (just sanitized)
        expect(result).toBe('Payment processing failed');
    });

    it('returns context-specific generic message when sensitive - payment context', () => {
        // Sensitive pattern triggers generic message with payment context
        const error = new Error('Password check failed during payment');
        const result = sanitizeErrorMessage(error, 'payment');
        expect(result).toBe('Payment processing failed. Please try again or contact support if the issue persists.');
    });

    it('returns context-specific generic message when sensitive - checkout context', () => {
        const error = new Error('Token expired during checkout');
        const result = sanitizeErrorMessage(error, 'checkout');
        expect(result).toBe('Payment processing failed. Please try again or contact support if the issue persists.');
    });

    it('returns context-specific generic message when sensitive - PayPal context', () => {
        const error = new Error('Secret key mismatch in PayPal');
        const result = sanitizeErrorMessage(error, 'paypal');
        expect(result).toBe('Payment processing failed. Please try again or contact support if the issue persists.');
    });

    it('returns context-specific generic message when sensitive - fetch context', () => {
        const error = new Error('Database connection during fetch');
        const result = sanitizeErrorMessage(error, 'fetch');
        expect(result).toBe('Unable to connect to the server. Please check your connection and try again.');
    });

    it('returns context-specific generic message when sensitive - API context', () => {
        // Pattern matches api_key, api-key, or apikey (not "API key" with space)
        const error = new Error('api_key is invalid');
        const result = sanitizeErrorMessage(error, 'api');
        expect(result).toBe('Unable to connect to the server. Please check your connection and try again.');
    });

    it('returns context-specific generic message when sensitive - server context', () => {
        const error = new Error('Database query failed on server');
        const result = sanitizeErrorMessage(error, 'server');
        expect(result).toBe('Unable to connect to the server. Please check your connection and try again.');
    });

    it('returns context-specific generic message when sensitive - validation context', () => {
        const error = new Error('Password validation error');
        const result = sanitizeErrorMessage(error, 'validation');
        expect(result).toBe('Invalid data format. Please refresh the page and try again.');
    });

    it('returns context-specific generic message when sensitive - format context', () => {
        const error = new Error('Token format invalid');
        const result = sanitizeErrorMessage(error, 'format');
        expect(result).toBe('Invalid data format. Please refresh the page and try again.');
    });

    it('returns generic fallback when sensitive with unknown context', () => {
        const error = new Error('Secret configuration error');
        const result = sanitizeErrorMessage(error, 'unknown');
        expect(result).toBe('An error occurred. Please try again or contact support if the issue persists.');
    });

    it('logs full error details in development mode', () => {
        const originalEnv = import.meta.env.DEV;
        Object.defineProperty(import.meta, 'env', {
            value: { ...import.meta.env, DEV: true },
            writable: true,
        });

        const error = new Error('Test error');
        sanitizeErrorMessage(error, 'test');

        expect(consoleErrorSpy).toHaveBeenCalledWith('[test] Error details:', error);

        Object.defineProperty(import.meta, 'env', {
            value: { ...import.meta.env, DEV: originalEnv },
            writable: true,
        });
    });
});

describe('isNetworkError', () => {
    it('identifies network errors', () => {
        expect(isNetworkError(new Error('Network error'))).toBe(true);
        expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
        expect(isNetworkError(new Error('Connection failed'))).toBe(true);
        expect(isNetworkError(new Error('NetworkError occurred'))).toBe(true);
        expect(isNetworkError(new Error('Request timeout'))).toBe(true);
    });

    it('identifies non-network errors', () => {
        expect(isNetworkError(new Error('Validation error'))).toBe(false);
        expect(isNetworkError(new Error('Payment failed'))).toBe(false);
        expect(isNetworkError(new Error('Invalid input'))).toBe(false);
    });

    it('handles non-Error types', () => {
        expect(isNetworkError('string')).toBe(false);
        expect(isNetworkError(123)).toBe(false);
        expect(isNetworkError(null)).toBe(false);
        expect(isNetworkError(undefined)).toBe(false);
    });

    it('is case-insensitive', () => {
        expect(isNetworkError(new Error('NETWORK ERROR'))).toBe(true);
        expect(isNetworkError(new Error('Failed To Fetch'))).toBe(true);
    });
});

describe('isServerError', () => {
    it('identifies 5xx server errors', () => {
        expect(isServerError(new Error('500 Internal Server Error'))).toBe(true);
        expect(isServerError(new Error('502 Bad Gateway'))).toBe(true);
        expect(isServerError(new Error('503 Service Unavailable'))).toBe(true);
        expect(isServerError(new Error('504 Gateway Timeout'))).toBe(true);
        expect(isServerError(new Error('599 Custom Error'))).toBe(true);
    });

    it('identifies non-5xx errors', () => {
        expect(isServerError(new Error('400 Bad Request'))).toBe(false);
        expect(isServerError(new Error('401 Unauthorized'))).toBe(false);
        expect(isServerError(new Error('404 Not Found'))).toBe(false);
        expect(isServerError(new Error('200 OK'))).toBe(false);
    });

    it('handles non-Error types', () => {
        expect(isServerError('string')).toBe(false);
        expect(isServerError(123)).toBe(false);
        expect(isServerError(null)).toBe(false);
        expect(isServerError(undefined)).toBe(false);
    });

    it('matches 5xx pattern in any part of message', () => {
        expect(isServerError(new Error('Error 500 occurred'))).toBe(true);
        expect(isServerError(new Error('Status: 503'))).toBe(true);
        expect(isServerError(new Error('Server returned 502'))).toBe(true);
    });
});
