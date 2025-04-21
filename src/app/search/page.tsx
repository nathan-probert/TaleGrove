'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Book, BookFromAPI, BookStatus } from '@/types';
import { ResultsGrid } from '@/components/search/ResultsGrid';
import { getUserId } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { getCoverUrl, searchForBooks } from '@/lib/books_api';


// Function to parse data for books
const parseBookData = (data: BookFromAPI[], userId: string): Book[] => {
  let books: Book[] = [];

  for (const item of data) {
    books.push({
      id: item.id,
      title: item.title,
      author: item.authors,
      rating: null,
      notes: null,
      user_id: userId,
      status: BookStatus.wishlist,
      book_id: item.id,
      isbn: item.isbn,
      cover_url: getCoverUrl(item.id),
    });
  };

  return books;
}


export default function SearchBook() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title && !author) return;
    setLoading(true);
    setResults([]);

    const userId = await getUserId();
    if (!userId) {
      console.error('User ID not found. Please log in.');
      setLoading(false);
      return;
    }

    try {
      const data: BookFromAPI[] = await searchForBooks(title, author);
      const processedResults = parseBookData(data, userId);

      setResults(processedResults);
    } catch (err: any) {
      console.error('Error fetching from Google Books API:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-grey3 p-8 flex flex-col items-center">
      {/* Back Button */}
      <div className="w-full mb-6">
        <Link href="/books">
          <button className="inline-flex items-center text-sm text-grey2 hover:text-primary transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </Link>
      </div>

      {/* Search Form */}
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-foreground text-center mb-6">Find Your Next Read!</h1>

        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-grey4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground text-sm"
              placeholder="Book title..."
              autoComplete="off"
            />
          </div>

          <div>
            <input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-grey4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground text-sm"
              placeholder="Author name..."
              autoComplete="off"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || (!title && !author)}
              className="inline-flex items-center px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Bar */}
      <div className="w-full h-0.5 bg-primary rounded-full my-10 max-w-6xl"></div>

      {/* Results Section */}
      <div className="w-full mt-2">
        {loading && (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground">
              Found {results.length} {results.length === 1 ? 'result' : 'results'}
            </h2>
            <ResultsGrid results={results} />
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="text-center py-8 text-grey2">
            {title || author ? (
              "No matches found. Try different terms."
            ) : (
              "Enter a title or author to begin your search"
            )}
          </div>
        )}
      </div>
    </div>
  );
}