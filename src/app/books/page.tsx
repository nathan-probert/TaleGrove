'use client';

import { useEffect, useState } from 'react';
import BookList from '@/components/BookList';
import { Book } from '@/types';
import { fetchUserBooks } from '@/lib/getBooks';
import supabase, { addBook, deleteBook } from '@/lib/supabase';

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      
      if (user) {
        try {
          const books = await fetchUserBooks(user.id);
          setBooks(books);
        } catch (error) {
          console.error('Error loading books:', error);
        }
      }
      else {
        window.location.href = '/signin';
      }
    };

    initializeData();
  }, []);

  const handleDeleteBook = async (id: string) => {
    try {
      await deleteBook(id);
      setBooks(prev => prev.filter(book => book.id !== id));
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">📚 Dashboard</h1>
      <BookList 
        books={books}
        onDelete={handleDeleteBook}
      />
    </div>
  );
}
