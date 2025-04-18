'use client';

import { useState, useTransition } from 'react';
import { signInWithEmail } from '@/lib/supabase'; 
import { useRouter } from 'next/navigation';
import { AuthError } from '@supabase/supabase-js';

const getFriendlyErrorMessage = (error: AuthError | null): string | null => {
    if (!error) return null;

    console.error('Sign-in error:', error); // Log the original error for debugging

    if (error.message.includes('Invalid login credentials')) {
        return 'Invalid email or password. Please try again.';
    }
    if (error.message.includes('Email not confirmed')) {
        return 'Please confirm your email address before signing in.';
    }
    // Add more specific error mappings as needed

    // Fallback generic message
    return 'An unexpected error occurred. Please try again later.';
};

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        startTransition(async () => {
            const { error: signInError } = await signInWithEmail(email, password);

            if (signInError) {
                setError(getFriendlyErrorMessage(signInError));
            } else {
                router.replace('/'); 
                router.refresh();
            }
        });
    };

    const isLoading = isPending;

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-3xl font-extrabold text-center text-gray-900">
                    Sign In
                </h2>
                <form onSubmit={handleSignIn} className="space-y-6">
                    {error && (
                        <p className="text-red-600 text-sm text-center bg-red-100 p-3 rounded-md border border-red-200">
                            {error}
                        </p>
                    )}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors duration-150 ${
                                isLoading
                                    ? 'bg-indigo-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                            }`}
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
