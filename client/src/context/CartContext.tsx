import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    type ReactNode,
} from 'react';
import type { Beat } from '@/types/Beat';
import { validateCartData, isValidBeat } from '@/validation/validation';

interface CartContextType {
    cartItems: Beat[];
    addToCart: (b: Beat) => void;
    removeFromCart: (id: string) => void;
    inCart: (id: string) => boolean;
    clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const STORAGE_KEY = 'muz-cart-v1';

export function CartProvider({ children }: { children: ReactNode }) {
    /* Hydrate synchronously with validation */
    const [cartItems, setCartItems] = useState<Beat[]>(() => {
        try {
            const rawLocalStorageItem: string | null = localStorage.getItem(STORAGE_KEY);
            if (!rawLocalStorageItem) {
                return [];
            }
            
            const parsedCart: any = JSON.parse(rawLocalStorageItem);
            // Validate and sanitize cart data
            const validatedCart: Beat[] = validateCartData(parsedCart);
            
            // If validation removed items, clean up localStorage immediately
            // (before useEffect runs to avoid double-write)
            const originalLength = Array.isArray(parsedCart) ? parsedCart.length : 0;
            if (validatedCart.length !== originalLength) {
                if (validatedCart.length === 0) {
                    localStorage.removeItem(STORAGE_KEY);
                } else {
                    // Update with cleaned data
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(validatedCart));
                }
            }
            
            return validatedCart;
        } catch (error) {
            // JSON parse error or other issues - clear corrupted data
            if (import.meta.env.DEV) {
                console.error('Error loading cart from localStorage:', error);
            }
            localStorage.removeItem(STORAGE_KEY);
            return [];
        }
    });

    /* Persist whenever items change */
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    }, [cartItems]);

    
    const addToCart = useCallback((b: Beat) => {
        if (!isValidBeat(b)) {
            if (import.meta.env.DEV) console.warn('Rejected invalid beat for cart:', b);
            return;
        }
        setCartItems((arr) => (arr.find((i) => i.id === b.id) ? arr : [...arr, b]));
    }, []);

    const removeFromCart = useCallback((id: string) => {
        setCartItems((arr) => arr.filter((i) => i.id !== id));
    }, []);

    const inCart = useCallback(
        (id: string) => cartItems.some((i) => i.id === id),
        [cartItems]
    );

    const clearCart = useCallback(() => {
        setCartItems((arr) => (arr.length === 0 ? arr : []));
    }, []);

    const value = useMemo(
        () => ({ cartItems, addToCart, removeFromCart, inCart, clearCart }),
        [cartItems, addToCart, removeFromCart, inCart, clearCart]
    );

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx: CartContextType | undefined = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
    return ctx;
}
