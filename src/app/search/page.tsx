'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book } from '@/types';
import { SearchForm } from '@/components/search/SearchForm';
import { ResultsGrid } from '@/components/search/ResultsGrid';
import { NoResults } from '@/components/search/NoResults';
import { getUserId } from '@/lib/supabase';

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
      completed: false,
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
    <div className="relative">

      <Link href="/books" className="block pb-4 cursor-grabbing">
        <button className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm font-medium">
          ← Return to Dashboard
        </button>
      </Link>

      {/* Search Form */}
      <SearchForm
        title={title}
        author={author}
        loading={loading}
        onTitleChange={setTitle}
        onAuthorChange={setAuthor}
        onSubmit={handleSearch}
      />

      {/* Loading Indicator */}
      {loading && <div className="text-center py-4">Loading results...</div>}


      {/* Results Grid */}
      {!loading && results.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Search Results</h2>
          </div>
          <ResultsGrid results={results} />
        </div>
      )}

      {/* No Results Message */}
      {!loading && results.length === 0 && (
         <NoResults hasQuery={!!(title || author)} />
      )}
    </div>
  );
}