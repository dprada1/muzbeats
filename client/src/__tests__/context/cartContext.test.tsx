import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '@/context/CartContext.tsx';
import type { Beat } from '@/types/Beat';

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
);

const sample: Beat = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Beat',
    bpm: 120,
    key: 'C#min',
    audio: '/dummy.mp3',
    cover: '/dummy.jpg',
    price: 19.99,
};

const sample2: Beat = {
    ...sample,
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    title: 'Test Beat 2',
};

describe('CartContext', () => {
    it('adds and removes beats', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        /* add */
        act(() => result.current.addToCart(sample));
        expect(result.current.cartItems).toHaveLength(1);

        /* remove */
        act(() => result.current.removeFromCart(sample.id));
        expect(result.current.cartItems).toHaveLength(0);
    });

    it('clearCart empties the cart', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(sample);
            result.current.addToCart(sample2);
        });
        expect(result.current.cartItems).toHaveLength(2);

        act(() => result.current.clearCart());
        expect(result.current.cartItems).toHaveLength(0);
    });

    it('rejects structurally invalid beats on add', () => {
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() =>
            result.current.addToCart({
                ...sample,
                id: 'not-a-uuid',
            })
        );
        expect(result.current.cartItems).toHaveLength(0);

        act(() =>
            result.current.addToCart({
                ...sample,
                // version nibble is 1, not 4
                id: '123e4567-e89b-12d3-a456-426614174000',
            })
        );
        expect(result.current.cartItems).toHaveLength(0);
    });
});
