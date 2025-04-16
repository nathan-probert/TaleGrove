'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';


export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        if (currentUser) {
          router.replace('/books');
        } else {
          router.replace('/signin');
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        // Handle error appropriately, maybe redirect to an error page or signin
        router.replace('/signin');
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, [router]); // Only run once on mount, router dependency is stable

  // Optional: Render a loading indicator while checking auth status
  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  // Render null while redirecting (or loading state handles this)
  return null;
}
