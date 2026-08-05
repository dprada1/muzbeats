import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import Navbar from './components/NavBar/NavBar';
import PlayerBar from './components/PlayerBar';

// Lazy load pages for code splitting
const StorePage = lazy(() => import('./pages/StorePage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const BeatDetail = lazy(() => import('./pages/BeatDetail'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage'));
const LicensePage = lazy(() => import('./pages/LicensePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/** Shared Suspense fallback while a lazy route chunk loads (not page-specific UI). */
function PageLoader() {
    return (
        <div
            className="pt-24 flex justify-center items-center"
            role="status"
            aria-label="Loading page"
        >
            <Loader2 className="size-10 text-brand-yellow animate-spin" aria-hidden />
        </div>
    );
}

function Layout() {
    return (
        <div className="min-h-screen flex flex-col bg-[--color-dark-bg] text-white">
            <Navbar />
            <main className="flex-1 px-2 md:px-4 py-8">
                <Suspense fallback={<PageLoader />}>
                    <Outlet />
                </Suspense>
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
                <Route path="checkout/success" element={<CheckoutSuccessPage />} />
                <Route path="beat/:beatId" element={<BeatDetail />}/>
                <Route path="license" element={<LicensePage />} />
            </Route>
            {/* Catch-all route for 404 - uses Layout wrapper */}
            <Route path="*" element={<Layout />}>
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}

export default App;
