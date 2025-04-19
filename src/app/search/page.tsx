'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book } from '@/types';
import { SearchForm } from '@/components/search/SearchForm';
import { ResultsGrid } from '@/components/search/ResultsGrid';
import { NoResults } from '@/components/search/NoResults';
import { getUserId } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const MAX_RESULTS = 24;

// Function to parse data for books
const parseBookData = (data: any, userId: string | null): Book[] => {
  if (!data || !data.items || !Array.isArray(data.items)) {
    return [];
  }

  const processedResults: Book[] = data.items.map((item: any): Book => {
    const volumeInfo = item.volumeInfo || {};
    const coverUrl = `https://books.google.com/books/publisher/content/images/frontcover/${item.id}?fife=w400-h600&source=gbs_api`;


    let foundIsbn: string | null = null;
    if (volumeInfo.industryIdentifiers && Array.isArray(volumeInfo.industryIdentifiers)) {
      const isbn13 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
      const isbn10 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
      foundIsbn = isbn13?.identifier ?? isbn10?.identifier ?? null;
    }

    return {
      id: item.id,
      title: volumeInfo.title || 'No Title',
      author: volumeInfo.authors?.join(', ') || 'Unknown Author',
      rating: null,
      notes: null,
      user_id: userId ?? undefined,
      status: "reading",
      book_id: item.id,
      isbn: foundIsbn,
      cover_url: coverUrl,
    };
  });

  return processedResults;
};


export default function SearchBook() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setResults([]);

    const queryParts = [];
    if (title) queryParts.push(`intitle:${encodeURIComponent(title)}`);
    if (author) queryParts.push(`inauthor:${encodeURIComponent(author)}`);

    if (queryParts.length === 0) {
      setLoading(false);
      return;
    }

    const query = `q=${queryParts.join('+')}`;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;

    // Include fields parameter to request only necessary data
    const fields = 'items(id,volumeInfo(title,authors,industryIdentifiers,imageLinks))';
    const url = `https://www.googleapis.com/books/v1/volumes?${query}&maxResults=${MAX_RESULTS}&fields=${encodeURIComponent(fields)}&key=${apiKey}`;
    const userId = await getUserId();

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
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