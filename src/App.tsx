import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import PlayerBar from './components/PlayerBar/PlayerBar';
import StorePage from './pages/StorePage';
import CartPage from './pages/CartPage';
import BeatDetail from './pages/BeatDetail';

function Layout() {
	return (
		<div className="min-h-screen flex flex-col bg-[--color-dark-bg] text-white">
			<Navbar />
			<main className="flex-1 px-4 py-8">
				<Outlet />
			</main>
			<PlayerBar />
		</div>
	);
}

function App() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/store" replace />} />
			<Route path="/store" element={<Layout />}>
				<Route index element={<StorePage />} />
				<Route path="cart" element={<CartPage />} />
				<Route path="beat/:beatId" element={<BeatDetail />}/>
			</Route>
		</Routes>
	);
}

export default App;
