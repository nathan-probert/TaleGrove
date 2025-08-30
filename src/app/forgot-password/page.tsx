'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { resetPasswordForEmail } from '@/lib/supabase';

const logo_light = '/images/logo_dark.png';
const logo_dark = '/images/logo_light.png';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await resetPasswordForEmail(email);
            setSuccess(true);
            setTimeout(() => router.push('/signin'), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send reset link');
        } finally {
            setLoading(false);
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
                            Reset Password
                        </h1>
                        <p className="text-grey2 text-sm mt-2">
                            Enter your email to receive a password reset link
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleResetPassword} className="w-full space-y-6">
                        {(error || success) && (
                            <div className={`p-3 text-sm rounded-lg border ${error ? 'text-primary bg-grey5 border-grey4' :
                                'text-green-600 bg-green-50 border-green-200'
                                }`}>
                                <div className="flex items-center">
                                    <svg className={`w-5 h-5 mr-3 ${error ? 'text-primary' : 'text-green-600'
                                        }`} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>{error || 'Reset link sent! Check your email.'}</span>
                                </div>
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
                                    disabled={loading || success}
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || success}
                                className="w-full py-2.5 px-6 rounded-lg bg-primary text-white font-medium hover:bg-primary/90  flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 rounded-full animate-spin border-t-transparent" />
                                        <span>Sending Link...</span>
                                    </>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                        </div>

                        {/* Back to Sign In Link */}
                        <p className="text-center text-sm text-grey2">
                            Remember your password?{' '}
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