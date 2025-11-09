import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from 'react';
import type { Beat } from '@/types/Beat';

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
    /* Hydrate synchronously */
    const [cartItems, setCartItems] = useState<Beat[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
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
