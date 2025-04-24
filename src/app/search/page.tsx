'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Book, BookFromAPI, BookStatus } from '@/types';
import { ResultsGrid } from '@/components/search/ResultsGrid';
import { getUserId } from '@/lib/supabase';
import { ArrowLeft, Loader2, SearchIcon } from 'lucide-react';
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
      categories: [],
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
  const [madeSearch, setMadeSearch] = useState(false);

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
      setMadeSearch(true);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full mx-auto space-y-8">
        {/* Header Section */}
        <div className="space-y-4">
          <Link href="/books" className="group inline-flex items-center text-sm text-foreground/80 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Link>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Discover New Books
            </h1>
            <p className="text-foreground/60">
              Search by title or author
            </p>
          </div>
        </div>

        {/* Search Form */}
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-center">
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-grow w-full px-4 py-3 rounded-xl border border-grey4 bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground text-sm"
              placeholder="Book title..."
              autoComplete="off"
            />

            <input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="flex-grow w-full px-4 py-3 rounded-xl border border-grey4 bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground text-sm"
              placeholder="Author name..."
              autoComplete="off"
            />

            <button
              type="submit"
              disabled={loading || (!title && !author)}
              className="flex-shrink-0 w-full md:w-auto inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <SearchIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Search Books
                </>
              )}
            </button>
          </form>

          <div className="my-6" />
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}

          {!loading && results.length > 0 && madeSearch && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Found {results.length} {results.length === 1 ? 'Result' : 'Results'}
              </h2>
              <ResultsGrid results={results} />
            </div>
          )}

          {!loading && results.length === 0 && !madeSearch && (
            <div className="text-center py-12 rounded-lg border-2 border-dashed border-grey4">
              <p className="text-foreground/60">Start your search above to find books</p>
            </div>
          )}

          {!loading && results.length === 0 && madeSearch && (
            <div className="text-center py-12 rounded-lg border-2 border-dashed border-grey4">
              <p className="text-foreground/60">
                {title || author ? (
                  <>
                    No matches found for "<span className="text-primary">{title || author}</span>"
                  </>
                ) : (
                  'No results found. Please try again.'
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
