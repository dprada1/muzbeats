import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { deduplicateRequest } from '@/utils/rateLimiting';

describe('deduplicateRequest', () => {
    beforeEach(() => {
        // Clear any pending requests before each test
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Small delay to ensure promises resolve
        return new Promise(resolve => setTimeout(resolve, 10));
    });

    it('executes request function when no duplicate exists', async () => {
        const requestFn = vi.fn().mockResolvedValue('result');
        const result = await deduplicateRequest('unique-key', requestFn);
        
        expect(requestFn).toHaveBeenCalledTimes(1);
        expect(result).toBe('result');
    });

    it('deduplicates simultaneous requests with same key', async () => {
        const requestFn = vi.fn().mockResolvedValue('result');
        
        // Start two requests with the same key simultaneously
        const promise1 = deduplicateRequest('same-key', requestFn);
        const promise2 = deduplicateRequest('same-key', requestFn);
        
        const [result1, result2] = await Promise.all([promise1, promise2]);
        
        // Function should only be called once
        expect(requestFn).toHaveBeenCalledTimes(1);
        // Both promises should resolve to the same result
        expect(result1).toBe('result');
        expect(result2).toBe('result');
    });

    it('handles different keys independently', async () => {
        const requestFn1 = vi.fn().mockResolvedValue('result1');
        const requestFn2 = vi.fn().mockResolvedValue('result2');
        
        const promise1 = deduplicateRequest('key1', requestFn1);
        const promise2 = deduplicateRequest('key2', requestFn2);
        
        const [result1, result2] = await Promise.all([promise1, promise2]);
        
        expect(requestFn1).toHaveBeenCalledTimes(1);
        expect(requestFn2).toHaveBeenCalledTimes(1);
        expect(result1).toBe('result1');
        expect(result2).toBe('result2');
    });

    it('handles request errors', async () => {
        const error = new Error('Request failed');
        const requestFn = vi.fn().mockRejectedValue(error);
        
        await expect(deduplicateRequest('error-key', requestFn)).rejects.toThrow('Request failed');
        expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('deduplicates even when first request fails', async () => {
        const error = new Error('Request failed');
        const requestFn = vi.fn().mockRejectedValue(error);
        
        const promise1 = deduplicateRequest('error-key', requestFn);
        const promise2 = deduplicateRequest('error-key', requestFn);
        
        await expect(promise1).rejects.toThrow('Request failed');
        await expect(promise2).rejects.toThrow('Request failed');
        
        // Function should only be called once (deduplicated)
        expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('handles AbortError and creates new request', async () => {
        const abortError = new Error('Request was cancelled');
        abortError.name = 'AbortError';
        
        const requestFn1 = vi.fn().mockRejectedValue(abortError);
        const requestFn2 = vi.fn().mockResolvedValue('success');
        
        // First request fails with AbortError
        const promise1 = deduplicateRequest('abort-key', requestFn1);
        
        // Wait for the first request to fail and cleanup
        await promise1.catch(() => {});
        // Small delay to ensure finally block completes
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Second request should create a new request (not deduplicated)
        const result = await deduplicateRequest('abort-key', requestFn2);
        
        expect(requestFn1).toHaveBeenCalledTimes(1);
        expect(requestFn2).toHaveBeenCalledTimes(1);
        expect(result).toBe('success');
    });

    it('handles cancelled message in error', async () => {
        const cancelledError = new Error('Request was cancelled');
        const requestFn1 = vi.fn().mockRejectedValue(cancelledError);
        const requestFn2 = vi.fn().mockResolvedValue('success');
        
        const promise1 = deduplicateRequest('cancelled-key', requestFn1);
        await promise1.catch(() => {});
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const result = await deduplicateRequest('cancelled-key', requestFn2);
        
        expect(requestFn1).toHaveBeenCalledTimes(1);
        expect(requestFn2).toHaveBeenCalledTimes(1);
        expect(result).toBe('success');
    });

    it('handles aborted message in error', async () => {
        const abortedError = new Error('Request was aborted');
        const requestFn1 = vi.fn().mockRejectedValue(abortedError);
        const requestFn2 = vi.fn().mockResolvedValue('success');
        
        const promise1 = deduplicateRequest('aborted-key', requestFn1);
        await promise1.catch(() => {});
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const result = await deduplicateRequest('aborted-key', requestFn2);
        
        expect(requestFn1).toHaveBeenCalledTimes(1);
        expect(requestFn2).toHaveBeenCalledTimes(1);
        expect(result).toBe('success');
    });

    it('cleans up pending requests after completion', async () => {
        const requestFn = vi.fn().mockResolvedValue('result');
        
        await deduplicateRequest('cleanup-key', requestFn);
        // Small delay to ensure finally block completes
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Start a new request with the same key - should execute (not deduplicated)
        const requestFn2 = vi.fn().mockResolvedValue('result2');
        const result = await deduplicateRequest('cleanup-key', requestFn2);
        
        expect(requestFn).toHaveBeenCalledTimes(1);
        expect(requestFn2).toHaveBeenCalledTimes(1);
        expect(result).toBe('result2');
    });

    it('cleans up pending requests after error', async () => {
        const error = new Error('Request failed');
        const requestFn = vi.fn().mockRejectedValue(error);
        
        await deduplicateRequest('error-cleanup-key', requestFn).catch(() => {});
        // Small delay to ensure finally block completes
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Start a new request with the same key - should execute (not deduplicated)
        const requestFn2 = vi.fn().mockResolvedValue('success');
        const result = await deduplicateRequest('error-cleanup-key', requestFn2);
        
        expect(requestFn).toHaveBeenCalledTimes(1);
        expect(requestFn2).toHaveBeenCalledTimes(1);
        expect(result).toBe('success');
    });

    it('handles multiple concurrent requests with different keys', async () => {
        const results = await Promise.all([
            deduplicateRequest('key1', () => Promise.resolve('result1')),
            deduplicateRequest('key2', () => Promise.resolve('result2')),
            deduplicateRequest('key3', () => Promise.resolve('result3')),
        ]);
        
        expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('handles async request functions', async () => {
        const requestFn = vi.fn().mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve('async-result'), 10))
        );
        
        const result = await deduplicateRequest('async-key', requestFn);
        
        expect(requestFn).toHaveBeenCalledTimes(1);
        expect(result).toBe('async-result');
    });
});
