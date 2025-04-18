'use client';

import { useState } from 'react';
import supabase from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link for client-side navigation

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        setLoading(false);

        if (signUpError) {
            setError(signUpError.message);
        } else {
            router.push('/books');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-3xl font-extrabold text-center text-gray-900">
                    Sign Up
                </h2>
                <form onSubmit={handleSignUp} className="space-y-6">
                    {error && (
                        <p className="text-red-600 text-sm text-center bg-red-100 p-2 rounded">
                            {error}
                        </p>
                    )}
                    {successMessage && (
                        <p className="text-green-600 text-sm text-center bg-green-100 p-2 rounded">
                            {successMessage}
                        </p>
                    )}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading || !!successMessage} 
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
                            placeholder="Password (min. 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading || !!successMessage}
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !!successMessage}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing Up...' : 'Sign Up'}
                        </button>
                    </div>
                     <div className="text-sm text-center">
                        <p className="text-gray-600">
                            Already have an account?{' '}
                            <Link href="/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}