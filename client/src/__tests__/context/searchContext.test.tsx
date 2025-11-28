import { renderHook, act } from '@testing-library/react';
import { SearchProvider, useSearch } from '@/context/SearchContext';
import type { Beat } from '@/types/Beat';

/**
* Unit tests for SearchContext: verifies default state and setter behavior.
*/
describe('SearchContext', () => {
		// Wrapper component to provide context
		const wrapper = ({ children }: { children?: React.ReactNode }) => (
				<SearchProvider>{children}</SearchProvider>
		);

		it('provides default values', () => {
				const { result } = renderHook(() => useSearch(), { wrapper });

				expect(result.current.searchQuery).toBe(''); // default empty string
				expect(result.current.beats).toEqual([]);    // default empty array
		});

		it('updates searchQuery when setSearchQuery is called', () => {
				const { result } = renderHook(() => useSearch(), { wrapper });

				act(() => {
						result.current.setSearchQuery('hello world');
				});

				expect(result.current.searchQuery).toBe('hello world');
		});

		it('updates beats when setBeats is called', () => {
				const sampleBeats: Beat[] = [
						{
								id:    '1',
								title: 'Test Beat',
								key:   'Cmaj',
								bpm:   100,
								price: 1,
								audio: '/test.mp3',
								cover: '/test.webp'
						}
				];
				const { result } = renderHook(() => useSearch(), { wrapper });

				act(() => {
						result.current.setBeats(sampleBeats);
				});

				expect(result.current.beats).toEqual(sampleBeats);
		});

		it('throws error if useSearch is used outside of provider', () => {
				expect(() => renderHook(() => useSearch())).toThrow(
						'useSearch must be used within SearchProvider'
				);
		});
});
