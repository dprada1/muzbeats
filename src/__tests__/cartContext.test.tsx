import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CartProvider, useCart } from '../context/CartContext.tsx';
import type { Beat } from '../types/Beat.ts';

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
);

const sample: Beat = {
    id: 'x1',
    title: 'Test Beat',
    bpm: 120,
    key: 'C#min',
    audio: '/dummy.mp3',
    cover: '/dummy.jpg',
    price: 19.99,
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
            result.current.addToCart({ ...sample, id: 'x2' } as Beat);
        });
        expect(result.current.cartItems).toHaveLength(2);

        act(() => result.current.clearCart());
        expect(result.current.cartItems).toHaveLength(0);
    });
});
