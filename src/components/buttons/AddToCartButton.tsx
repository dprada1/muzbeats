import { FaCartShopping, FaTrash } from 'react-icons/fa6';
import { useCart } from '@/context/CartContext';
import type { Beat } from '@/types/Beat';

interface Props {
    beat: Beat;
    className?: string;
}

export default function AddToCartButton({ beat, className = '' }: Props) {
    const { inCart, addToCart, removeFromCart } = useCart();
    const active = inCart(beat.id);

    const handle = (e: React.MouseEvent) => {
        e.stopPropagation();
        active ? removeFromCart(beat.id) : addToCart(beat);
    };

    // Style tokens
    const base = 'flex items-center gap-2 px-3 py-1 rounded-full border transition active:scale-[1.02] no-ring text-sm cursor-pointer w-[6rem] sm:w-[8rem] justify-center';
    const filled = 'bg-transparent border-brand-yellow text-brand-yellow hover:bg-brand-yellow hover:text-black';
    const outline = 'border-red-400 text-red-400 hover:bg-red-400 hover:text-black';

    const priceText = `$${beat.price.toFixed(2)}`;

    return (
        <button
            onClick={handle}
            aria-pressed={active}
            aria-label={active ? `Remove from cart — ${priceText}` : `Add to cart — ${priceText}`}
            className={`${base} ${active ? outline : filled} ${className}`}
        >
            {active ? <FaTrash /> : <FaCartShopping />}
            <span className="whitespace-nowrap font-medium pointer-events-none">
                ${beat.price.toFixed(2)}
            </span>
        </button>
    );
}
