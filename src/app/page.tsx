'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';


export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        if (await getCurrentUser()) {
          router.replace('/books');
        } else {
          router.replace('/signin');
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.replace('/signin');
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="text-primary animate-spin" />
      </div>
    );
  }

  return null;
}
