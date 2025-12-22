export default function LicensePage() {
    return (
        <div className="pt-12 pb-28 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">License (Non‑Exclusive)</h1>
            <p className="text-zinc-300 mb-6">
                All beats sold on MuzBeats are currently offered under a <strong>non‑exclusive</strong> license.
            </p>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <section>
                    <h2 className="text-xl font-semibold mb-2">What you can do</h2>
                    <ul className="list-disc pl-5 text-zinc-300 space-y-1">
                        <li>Use the beat in your own original song(s).</li>
                        <li>Release your song on streaming platforms and social media.</li>
                        <li>Perform your song live.</li>
                        <li>Monetize your song (subject to platform rules and your distribution agreements).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">What you cannot do</h2>
                    <ul className="list-disc pl-5 text-zinc-300 space-y-1">
                        <li>Claim ownership of the underlying instrumental/beat composition.</li>
                        <li>Resell, sublicense, or redistribute the beat as a standalone file.</li>
                        <li>Upload the beat by itself to DSPs/content ID systems as your own instrumental.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">Non‑exclusive means</h2>
                    <p className="text-zinc-300">
                        Other customers may purchase the same beat. You do not receive exclusive rights unless an
                        exclusive agreement is explicitly offered and purchased.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">Downloads &amp; access</h2>
                    <p className="text-zinc-300">
                        Download links <strong>expire after 30 days</strong> and can be used a maximum of{' '}
                        <strong>5 times</strong>. Please save your files to a secure location after purchase.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">Contact</h2>
                    <p className="text-zinc-300">
                        Questions? Email{' '}
                        <a href="mailto:danielprada2006@gmail.com" className="underline hover:text-white">
                            danielprada2006@gmail.com
                        </a>
                        .
                    </p>
                </section>
            </div>
        </div>
    );
}


