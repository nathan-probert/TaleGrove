'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase, { getSession, updatePassword } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

export default function ResetPassword() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        const handleInitialSession = async () => {
            const { data, error } = await getSession();
            if (!data?.session && !error) {
                await getSession();
            }
        };
        handleInitialSession();
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const { data: { session } } = await getSession();
        if (!session) {
            setError('No active session. Please try the reset link again.');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }
        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        setLoading(true);

        try {
            const { error } = await updatePassword(password);
            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                router.push('/signin');
                supabase.auth.signOut();
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Password reset failed');
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
                        <Image
                            src="/images/logo.png"
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
                            Reset Password
                        </h1>
                        <p className="text-grey2 text-sm mt-2">
                            Enter your new password
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
                                    <span>{error || 'Password updated successfully! Redirecting...'}</span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Password Input */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-2.5 rounded-lg border border-grey4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading || success}
                                />
                            </div>

                            {/* Confirm Password Input */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-2.5 rounded-lg border border-grey4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                                        <span>Updating Password...</span>
                                    </>
                                ) : (
                                    'Reset Password'
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