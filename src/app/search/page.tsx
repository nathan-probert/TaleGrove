'use client';

import { useState, useEffect } from 'react';
import { addBook, getUserId } from '@/lib/supabase';
import { Book } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import SearchBookCard from '@/components/SearchBookCard';

const MAX_RESULTS = 24;

const Toast = ({ message, type }: { message: string | null; type: 'success' | 'error' }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ duration: 0.4 }}
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded shadow-lg z-50 ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
      >
        {message}
      </motion.div>
    )}
  </AnimatePresence>
);

const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function SearchBook() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Retrieve search state from sessionStorage
    const savedSearch = sessionStorage.getItem('searchState');
    if (savedSearch) {
      const { title, author, results } = JSON.parse(savedSearch);
      setTitle(title);
      setAuthor(author);
      setResults(results);
    }

    // Fetch user ID when the component mounts
    const fetchUserId = async () => {
      const id = await getUserId();
      setUserId(id);
    };
    fetchUserId();
  }, []);

  const clearMessagesAfterDelay = () => {
    setTimeout(() => {
      setError(null);
      setSuccessMessage(null);
    }, 3000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    setSuccessMessage(null);

    const queryParts = [];
    if (title) queryParts.push(`intitle:${encodeURIComponent(title)}`);
    if (author) queryParts.push(`inauthor:${encodeURIComponent(author)}`);

    if (queryParts.length === 0) {
      setError("Please enter a title or author.");
      setLoading(false);
      clearMessagesAfterDelay();
      return;
    }

    const query = `q=${queryParts.join('+')}`;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;

    if (!apiKey) {
      setError("Google Books API key is not configured.");
      setLoading(false);
      clearMessagesAfterDelay();
      return;
    }

    const url = `https://www.googleapis.com/books/v1/volumes?${query}&maxResults=${MAX_RESULTS}&key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      const processedResults: Book[] = data.items.map((item: any): Book => {
        const volumeInfo = item.volumeInfo;

        let foundIsbn: string | null = null;
        if (volumeInfo.industryIdentifiers) {
          const isbn13 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
          const isbn10 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
          foundIsbn = isbn13?.identifier ?? isbn10?.identifier ?? null;
        }

        const coverUrl = `https://books.google.com/books/publisher/content/images/frontcover/${item.id}?fife=w400-h600&source=gbs_api`;

        return {
          id: item.id, // Google Books Volume ID
          title: volumeInfo.title || 'No Title',
          author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author',
          rating: null,
          notes: null,
          user_id: userId ?? undefined,
          completed: false,
          book_id: item.id, // Using Google's ID
          isbn: foundIsbn,
          cover_url: coverUrl, // Added cover_url based on extracted value
        };
      });

      setResults(processedResults);

      // Save the search state in sessionStorage
      sessionStorage.setItem('searchState', JSON.stringify({ title, author, results: processedResults }));
    } catch (err: any) {
      console.error('Error fetching from Google Books API:', err);
      setError(`Failed to fetch books: ${err.message}`);
      clearMessagesAfterDelay();
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (newBook: Book) => {
    if (!userId) {
      setError('User not identified. Cannot add book.');
      clearMessagesAfterDelay();
      return;
    }
    const bookToAdd = { ...newBook, user_id: userId };

    try {
      await addBook(bookToAdd);
      setSuccessMessage('Book added successfully!');
      clearMessagesAfterDelay();
    } catch (error) {
      console.error('Error adding book:', error);
      setError('Failed to add book. Please try again.');
      clearMessagesAfterDelay();
    }
  };

  return (
    <div className="relative">
      <Toast message={successMessage} type="success" />
      <Toast message={error} type="error" />

      <form onSubmit={handleSearch} className="space-y-4 mb-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter author name"
          />
        </div>
        <button
          type="submit"
          disabled={loading || (!title && !author)}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {!loading && results.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <motion.ul
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-6 p-6"
          >
            {results.map((book) => (
              <SearchBookCard key={book.id} book={book}/>
            ))}
          </motion.ul>
        </div>
      )}

      {!loading && !error && results.length === 0 && title && (
        <p className="text-center text-gray-500 mt-4">No books found matching your criteria.</p>
      )}
    </div>
  );
}
