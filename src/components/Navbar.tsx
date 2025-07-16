import { Link } from 'react-router-dom';
import { FaYoutube, FaTiktok, FaEnvelope } from 'react-icons/fa';
import { FaCartShopping } from "react-icons/fa6";
import SearchBar from './SearchBar';

function Navbar() {
    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-[#1a1a1a] text-white h-16 px-4 flex items-center justify-between border-b border-neutral-800 shadow-sm">
            <a href="/store" className="flex items-center gap-2 group">
                <img
                    src="/assets/images/skimask.png"
                    alt="Logo"
                    className="w-10 h-10 object-cover"
                />
                <span className="text-white text-lg font-semibold group-hover:text-yellow-400 transition-colors duration-200">
                    Muz Beats
                </span>
            </a>

            <div className="flex-1 mx-10 max-w-xl">
                <SearchBar />
            </div>

            <div className="flex items-center gap-5 text-lg">
                <Link to="/store/cart" className="hover:text-yellow-400 transition-colors"><FaCartShopping /></Link>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition-colors"><FaYoutube /></a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition-colors"><FaTiktok /></a>
                <a href="mailto:someone@example.com" className="hover:text-yellow-400 transition-colors"><FaEnvelope /></a>
                <Link to="/about" className="underline hover:text-yellow-400 transition-colors">About Me</Link>
            </div>
        </nav>
    );
}

export default Navbar;
