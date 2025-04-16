'use client';

import { useState, useEffect } from 'react';
import supabase, { addBook, getUserId } from '@/lib/supabase';
import { Book } from '@/types';
import { get } from 'http';
import { randomUUID } from 'crypto';

export default function BookSearchForm() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const id = await getUserId();
      setUserId(id);
    };
    fetchUserId();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    setSuccessMessage(null);

    // build request
    const queryParams = [];
    if (title) queryParams.push(`title=${encodeURIComponent(title)}`);
    if (author) queryParams.push(`author=${encodeURIComponent(author)}`);
    if (isbn) queryParams.push(`isbn=${encodeURIComponent(isbn)}`);
    if (publisher) queryParams.push(`publisher=${encodeURIComponent(publisher)}`);

    if (queryParams.length === 0) {
      setError("Please enter at least one search term.");
      setLoading(false);
      return;
    }

    const query = `https://openlibrary.org/search.json?${queryParams.join('&')}&limit=25`;

    const headers = new Headers({
      "User-Agent": "TaleGrove/1.0 (nathanprobert@rogers.com)"
    });

    // make the request
    try {
      const response = await fetch(query, { method: 'GET', headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      // parse the response to create book objects
      const processedResults: Book[] = (data.docs || []).map((bookData: any) => {
        
        // get isbn
        let foundIsbn = null;
        const iaArray = bookData.ia;
        if (Array.isArray(iaArray)) {
          const isbnString = iaArray.find((item: string) => typeof item === 'string' && item.startsWith('isbn_'));
          if (isbnString) {
        foundIsbn = isbnString.substring(5); // Remove "isbn_" prefix
          }
        }

        return {
          title: bookData.title,
          author: bookData.author_name ? bookData.author_name.join(', ') : '',
          rating: null,
          notes: null,
          user_id: userId,
          completed: false,
          openlibrary_id: bookData.key ? bookData.key.split('/').pop() : null,
          isbn: foundIsbn, // Use the extracted ISBN from 'ia' field
          cover_id: bookData.cover_i ?? null,
        };
      });

      setResults(processedResults);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to fetch books: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  const handleAddBook = async (newBook: Book) => {
    try {
      console.log('Adding book:', newBook);
      const addedBook = await addBook(newBook);
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };


  return (
    <div>
      <form onSubmit={handleSearch} className="space-y-4 mb-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            placeholder="Enter book title"
          />
        </div>
        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author</label>
          <input
            type="text"
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            placeholder="Enter author name"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {loading && <p>Loading results...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {successMessage && <p className="text-green-600">{successMessage}</p>}

      {!loading && !error && results.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <ul className="space-y-4">
            {results.map((book, index) => (
              <li key={book.id || index} className="border p-4 rounded flex items-start gap-4">
                {book.cover_id && (
                  <img
                    src={`https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`}
                    alt={`Cover of ${book.title}`}
                    className="w-20 h-auto"
                  />
                )}
                <div className="flex-1">
                  <p><strong>Title:</strong> {book.title}</p>
                  <p><strong>Author(s):</strong> {book.author}</p>
                  <button
                    onClick={() => handleAddBook(book)}
                    className="mt-2 bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded"
                  >
                    Add to Collection
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
