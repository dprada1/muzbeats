import { FaCartShopping, FaTrash } from 'react-icons/fa6';
import { useCart } from '@/context/CartContext';
import type { Beat } from '@/types/Beat';

interface Props {
    beat: Beat;
    className?: string;
    /** When true, button does nothing (e.g. MP3 missing). */
    disabled?: boolean;
}

export default function AddToCartButton({ beat, className = '', disabled = false }: Props) {
    const { inCart, addToCart, removeFromCart } = useCart();
    const active = inCart(beat.id);

    const handle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        active ? removeFromCart(beat.id) : addToCart(beat);
    };

    // Style tokens — never put active:scale on the shared base (disabled still matched it)
    const base =
        'flex items-center gap-2 px-3 py-1 rounded-full border transition no-ring text-sm w-[6rem] sm:w-[8rem] justify-center';
    const filled =
        'bg-transparent border-brand-yellow text-brand-yellow hover:bg-brand-yellow hover:text-black cursor-pointer active:scale-[1.02]';
    const outline =
        'border-red-400 text-red-400 hover:bg-red-400 hover:text-black cursor-pointer active:scale-[1.02]';
    const disabledStyles =
        'border-zinc-600 text-zinc-500 cursor-not-allowed opacity-60';

    const priceText = `$${beat.price.toFixed(2)}`;

    return (
        <button
            onClick={handle}
            disabled={disabled}
            aria-pressed={active}
            aria-disabled={disabled}
            aria-label={
                disabled
                    ? `Unavailable — ${priceText}`
                    : active
                      ? `Remove from cart — ${priceText}`
                      : `Add to cart — ${priceText}`
            }
            className={`${base} ${
                disabled ? disabledStyles : active ? outline : filled
            } ${className}`}
        >
            {active ? <FaTrash /> : <FaCartShopping />}
            <span className="whitespace-nowrap font-medium pointer-events-none">
                ${beat.price.toFixed(2)}
            </span>
        </button>
    );
}
