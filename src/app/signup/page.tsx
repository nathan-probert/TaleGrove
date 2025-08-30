
'use client';
import { useState } from 'react';
import { createRootFolder, signUpWithEmail, } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const logo_light = '/images/logo_dark.png';
const logo_dark = '/images/logo_light.png';

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const router = useRouter();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

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
                        {/* Light theme logo */}
                        <Image
                            src={logo_light}
                            alt="TaleGrove Logo"
                            width={150}
                            height={150}
                            priority
                            className="block dark:hidden"
                        />
                        {/* Dark theme logo */}
                        <Image
                            src={logo_dark}
                            alt="TaleGrove Logo (Dark)"
                            width={100}
                            height={100}
                            priority
                            className="hidden dark:block"
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
                            <div className="flex items-center p-3 text-sm text-foreground bg-grey5 rounded-lg border border-grey4">
                                <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
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
                                    className="w-full px-4 py-2.5 rounded-lg border border-grey4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-grey2 text-black"
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
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-2.5 rounded-lg border border-grey4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-grey2 text-black pr-12"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1.5 p-1.5 rounded-lg hover:bg-grey5"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg className="w-6 h-6 text-grey2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-6 h-6 text-grey2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password Input */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-2.5 rounded-lg border border-grey4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-grey2 text-black pr-12"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1.5 p-1.5 rounded-lg hover:bg-grey5"
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? (
                                            <svg className="w-6 h-6 text-grey2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-6 h-6 text-grey2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-6 rounded-lg bg-primary text-white font-medium hover:bg-primary/90  flex items-center justify-center gap-2 disabled:opacity-50"
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