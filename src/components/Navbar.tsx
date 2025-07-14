import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-black text-yellow-400 p-4 flex gap-6">
      <Link to="/store" className="hover:underline">Beat Store</Link>
      <Link to="/store/cart" className="hover:underline">Cart</Link>
    </nav>
  );
}
