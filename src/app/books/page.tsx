'use client';

import { useEffect, useState } from 'react';
import BookList from '@/components/dashboard/BookList';
import { Book } from '@/types';
import { fetchUserBooks } from '@/lib/getBooks';
import supabase from '@/lib/supabase';
import Link from 'next/link';

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id || null);

        if (user) {
          try {
            const books = await fetchUserBooks(user.id);
            setBooks(books);
          } catch (error) {
            console.error('Error loading books:', error);
          }
        } else {
          window.location.href = '/signin';
          return;
        }
      } catch (authError) {
        console.error('Error getting user:', authError);
        window.location.href = '/signin';
        return;
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-4">📚 Dashboard</h1>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">📚 Dashboard</h1>
      {books.length > 0 && (
        <div className="mt-6 text-center">
          <Link href="/search">
            <button className="inline-flex cursor-pointer justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Search for more books
            </button>
          </Link>
        </div>
      )}
      <BookList
        books={books}
      />
    </div>
  );
}
