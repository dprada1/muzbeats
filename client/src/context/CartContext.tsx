import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from 'react';
import type { Beat } from '@/types/Beat';
import { validateCartData } from '@/validation/validation';

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
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return [];
            }
            
            const parsed = JSON.parse(raw);
            // Validate and sanitize cart data
            const validated = validateCartData(parsed);
            
            // If validation removed items, clean up localStorage immediately
            // (before useEffect runs to avoid double-write)
            const originalLength = Array.isArray(parsed) ? parsed.length : 0;
            if (validated.length !== originalLength) {
                if (validated.length === 0) {
                    localStorage.removeItem(STORAGE_KEY);
                } else {
                    // Update with cleaned data
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
                }
            }
            
            return validated;
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

    /* Helpers */
    const addToCart = (b: Beat) =>
        setCartItems((arr) => (arr.find((i) => i.id === b.id) ? arr : [...arr, b]));
    const removeFromCart = (id: string) =>
        setCartItems((arr) => arr.filter((i) => i.id !== id));
    const inCart = (id: string) => cartItems.some((i) => i.id === id);
    const clearCart = () => setCartItems([]);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, inCart, clearCart }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
    return ctx;
}
