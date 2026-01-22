import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Navbar from './components/NavBar/NavBar';
import PlayerBar from './components/PlayerBar';
import BeatCardSkeleton from './components/beatcards/store/BeatCardSkeleton';
import { SkeletonTheme } from 'react-loading-skeleton';

// Lazy load pages for code splitting
const StorePage = lazy(() => import('./pages/StorePage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const BeatDetail = lazy(() => import('./pages/BeatDetail'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage'));
const LicensePage = lazy(() => import('./pages/LicensePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Loading fallback component
function PageLoader() {
    return (
        <div className="pt-12 flex flex-col gap-2 sm:gap-6 max-w-3xl mx-auto">
            <SkeletonTheme baseColor="#1e1e1e" highlightColor="#2c2c2c">
                <div className="h-12 bg-zinc-800 rounded-lg mb-4" />
                <div className="flex flex-col gap-3 sm:gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <BeatCardSkeleton key={i} />
                    ))}
                </div>
            </SkeletonTheme>
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
