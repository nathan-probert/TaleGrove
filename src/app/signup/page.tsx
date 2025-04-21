'use client';

import { useState } from 'react';
import { createRootFolder, signUpWithEmail, } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { data, error: signUpError } = await signUpWithEmail(email, password);

        setLoading(false);
        if (signUpError) {
            setError(signUpError.message);
        } else {
            const userId = data.user?.id;
            if (userId) {
                if (data.user && data.user.identities && data.user.identities.length > 0) {
                    await createRootFolder(userId);
                } else {
                    setError('Email already exists.');
                    return;
                }
            }
            router.replace('/');
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-grey3 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-background rounded-xl shadow-lg p-8 border border-grey4">
                <div className="flex flex-col items-center space-y-6">

                    {/* Logo Container */}
                    <div className="transition-transform hover:scale-105">
                        <Image
                            src="/images/colour_logo.png"
                            alt="TaleGrove Logo"
                            width={150}
                            height={150}
                            className="dark:invert"
                            priority
                        />
                    </div>

                    {/* Heading */}
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-foreground">
                            Join TaleGrove
                        </h1>
                        <p className="text-grey2 text-sm">
                            Find your next favorite book today!
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSignUp} className="w-full space-y-6">
                        {error && (
                            <div className="flex items-center p-3 text-sm text-primary bg-grey5 rounded-lg border border-grey4">
                                <svg className="w-5 h-5 text-primary mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Email Input */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-grey4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground"
                                    placeholder="reader@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* Password Input */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-2.5 rounded-lg border border-grey4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-6 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 rounded-full animate-spin border-t-transparent" />
                                        <span>Creating Account...</span>
                                    </>
                                ) : (
                                    'Sign Up!'
                                )}
                            </button>
                        </div>

                        {/* Sign In Link */}
                        <p className="text-center text-sm text-grey2">
                            Already have an account?{' '}
                            <Link
                                href="/signin"
                                className="text-primary font-medium hover:text-secondary underline underline-offset-4"
                            >
                                Sign in here
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}