import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from 'react';
import type { Beat } from '../types/Beat';

interface CartContextType {
    items: Beat[];
    add: (b: Beat) => void;
    remove: (id: string) => void;
    inCart: (id: string) => boolean;
    clear: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const STORAGE_KEY = 'muz-cart-v1';

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Beat[]>([]);

    /* --- localStorage hydration --------------------------------------- */
    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                setItems(JSON.parse(raw));
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    /* --- persist whenever items change -------------------------------- */
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }, [items]);

    /* --- helpers ------------------------------------------------------- */
    const add = (b: Beat) =>
        setItems((arr) => (arr.find((i) => i.id === b.id) ? arr : [...arr, b]));
    const remove = (id: string) =>
        setItems((arr) => arr.filter((i) => i.id !== id));
    const inCart = (id: string) => items.some((i) => i.id === id);
    const clear = () => setItems([]);

    return (
        <CartContext.Provider value={{ items, add, remove, inCart, clear }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
    return ctx;
}
