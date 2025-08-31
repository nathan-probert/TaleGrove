"use client";

import { useState, useTransition } from "react";
import { signInWithEmail, signInWithGoogle } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { AuthError } from "@supabase/supabase-js";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import Image from "next/image";

const logo_light = "/images/logo_dark.png";
const logo_dark = "/images/logo_light.png";

const getFriendlyErrorMessage = (error: AuthError | null): string | null => {
  if (!error) return null;

  console.error("Sign-in error:", error);

  if (error.message.includes("Invalid login credentials")) {
    return "Invalid email or password. Please try again.";
  } else if (error.message.includes("Email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }

  return "An unexpected error occurred. Please try again later.";
};

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        router.replace("/");
        router.refresh();
      }
    });
  };

  const isLoading = isPending;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-grey3 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-background rounded-2xl shadow-lg p-4 transition-all duration-300 hover:shadow-xl">
        <div className="flex flex-col items-center space-y-6">
          {/* Logo Container */}
          <div className="transition-transform hover:scale-105">
            {/* Light theme logo */}
            <Image
              src={logo_light}
              alt="TaleGrove Logo"
              width={100}
              height={100}
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
            <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
          </div>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSignIn} className="space-y-6 pt-6">
          {error && (
            <div className="flex items-center p-4 bg-grey5 rounded-lg border border-grey4">
              <svg
                className="w-5 h-5 text-red-500 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-foreground text-sm">{error}</span>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg border border-grey4 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-black placeholder-grey4 disabled:opacity-50"
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
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
                className="w-full px-4 py-3 rounded-lg border border-grey4 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-black placeholder-grey4 disabled:opacity-50 pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 p-1.5 rounded-lg hover:bg-grey5"
              >
                {showPassword ? (
                  <svg
                    className="w-6 h-6 text-grey2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6 text-grey2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right mt-2">
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:text-secondary"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          {/* Divider */}
          <div className="relative mt-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-grey4"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-grey2">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Sign In Buttons */}
          <div className="grid grid-cols-1 gap-3 mt-6">
            <button
              type="button"
              className="flex items-center justify-center py-2.5 px-4 border border-grey4 rounded-lg hover:bg-grey5  text-foreground"
              onClick={() => signInWithGoogle()}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                  fill="currentColor"
                />
              </svg>
              Google
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-grey2 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:text-secondary"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
