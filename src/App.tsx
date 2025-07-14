import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PlayerBar from './components/PlayerBar';
import StorePage from './pages/StorePage';
import CartPage from './pages/CartPage';

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
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to="/store" replace />} />
				<Route path="/store" element={<Layout />}>
					<Route index element={<StorePage />} />
					<Route path="cart" element={<CartPage />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}


/*
function App() {
	return (
		<div className="min-h-screen bg-[--color-dark-bg] text-[--color-brand-yellow] flex items-center justify-center">
		<h1 className="text-3xl font-bold">Hello Tailwind v4 + custom theme</h1>
		</div>
	);

}
*/

export default App;
