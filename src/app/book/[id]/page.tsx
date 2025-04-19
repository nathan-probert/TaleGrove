"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserId, checkIfBookInCollection } from '@/lib/supabase';
import BookInCollection from '@/components/BookInCollection';
import BookNotInCollection from '@/components/BookNotInCollection';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [book, setBook] = useState<any>(null);
  const [item, setItem] = useState<any>(null); // Track the entire item from Google Books API
  const [isInCollection, setIsInCollection] = useState(false); // Track if the book is in the collection

  useEffect(() => {
    const fetchBook = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;

      const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}?key=${apiKey}`);
      const fetchedItem = await res.json();
      setItem(fetchedItem);

      const volumeInfo = fetchedItem.volumeInfo;
      const userId = await getUserId();

      let foundIsbn: string | null = null;
      if (volumeInfo.industryIdentifiers) {
        const isbn13 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
        const isbn10 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
        foundIsbn = isbn13?.identifier ?? isbn10?.identifier ?? null;
      }
      const coverUrl = `https://books.google.com/books/publisher/content/images/frontcover/${fetchedItem.id}?fife=w400-h600&source=gbs_api`;

      let bookData: any = null;
      let isBookInCollection = false;

      if (userId) {
        const foundBook = await checkIfBookInCollection(fetchedItem.id, userId);
        if (foundBook) {
          bookData = foundBook;
          isBookInCollection = true;
        }
      }

      if (!isBookInCollection) {
        // If not found in collection or no user, create book data from API response
        bookData = {
          id: null, // This will be set when added to the collection
          title: volumeInfo.title || 'No Title',
          author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author',
          rating: null,
          notes: null,
          user_id: userId ?? undefined,
          status: "reading", // Default status, can be changed
          book_id: fetchedItem.id,
          isbn: foundIsbn,
          cover_url: coverUrl,
        };
      }

      setBook(bookData);
      setIsInCollection(isBookInCollection);
    };

    if (id) fetchBook();
  }, [id]); // Removed isInCollection from dependencies as it's set within the effect

  const handleBack = () => {
    router.back();
  };

  const goToDashboard = () => {
    router.push('/books');
  }

  if (!book || !item) return <p className="p-4">Loading...</p>; // Ensure both book and item are loaded

  return (
    <>
      {isInCollection ? (
        <BookInCollection book={book} item={item} onBack={handleBack} goToDashboard={goToDashboard} />
      ) : (
        <BookNotInCollection book={book} item={item} onBack={handleBack} goToDashboard={goToDashboard} />
      )}
    </>
  );
}
