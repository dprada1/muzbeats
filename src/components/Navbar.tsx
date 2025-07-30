import { Link } from 'react-router-dom';
import { FaYoutube, FaTiktok, FaEnvelope } from 'react-icons/fa';
import { FaCartShopping } from "react-icons/fa6";
import SearchBar from './SearchBar';
import { useCart } from '@/context/CartContext';
import NProgress from 'nprogress';
import { InfoTooltip } from './InfoToolTip';
import { IoInformationCircleOutline } from "react-icons/io5";

export default function Navbar() {
    const { cartItems } = useCart();
    const qty = cartItems.length;

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-[#1a1a1a] text-white h-16 px-4 flex items-center justify-between border-b border-neutral-800 shadow-sm">
            {/* logo */}
            <Link
                to="/store"
                className="flex items-center gap-2 group no-ring"
                onClick={() => NProgress.start()}
            >
                <img src="/assets/images/skimask.png" alt="Logo" className="w-10 h-10 object-cover" />
                <span className="text-white text-lg font-semibold whitespace-nowrap group-hover:text-brand-yellow transition-colors duration-200">
                    Muz Beats
                </span>
            </Link>

            <div className="flex-1 flex items-center justify-center space-x-3 px-10">
            <InfoTooltip
                trigger={<IoInformationCircleOutline className="h-5 w-5 text-gray-300" />}
                message={
                    <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Key:</strong> (e.g. C#m)</li>
                    <li><strong>BPM:</strong> single (120) or range (140-160)</li>
                    <li><strong>Keywords:</strong> anywhere in track's title</li>
                    </ul>
                }
            />
                <SearchBar />
            </div>

            <div className="flex items-center gap-5 text-lg pr-4">
                {/* cart icon + badge */}
                <Link to="/store/cart" className="relative inline-flex no-ring hover:text-brand-yellow transition-colors">
                    <FaCartShopping size={20}/>
                    {qty > 0 && (
                        <span className="absolute -top-1 -right-2 min-w-[18px] px-1 text-[11px] leading-4
                                        rounded-full bg-red-600 text-white font-bold text-center">
                        {qty > 9 ? '9+' : qty}
                        </span>
                    )}
                </Link>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-yellow transition-colors"><FaYoutube size={20}/></a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-yellow transition-colors"><FaTiktok size={20}/></a>
                <a href="mailto:someone@example.com" className="hover:text-brand-yellow transition-colors"><FaEnvelope size={20}/></a>
            </div>
        </nav>
    );
}
