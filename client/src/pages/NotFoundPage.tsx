import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div className="pt-12 flex flex-col gap-2 sm:gap-6 max-w-3xl mx-auto text-center">
            <div className="flex flex-col items-center gap-6 py-12">
                <div className="text-8xl font-bold text-zinc-700">404</div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
                    Page Not Found
                </h1>
                <p className="text-base sm:text-lg text-zinc-400 mb-8">
                    The page you're looking for doesn't exist.
                </p>
                <Link
                    to="/store"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full
                               bg-button-yellow text-black font-semibold hover:bg-button-yellow-hover
                               active:scale-[1.02] transition no-ring"
                >
                    ← Back to Store
                </Link>
            </div>
        </div>
    );
}

