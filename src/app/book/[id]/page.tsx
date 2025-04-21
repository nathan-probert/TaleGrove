"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserId, checkIfBookInCollection } from '@/lib/supabase';
import BookInCollection from '@/components/BookInCollection';
import BookNotInCollection from '@/components/BookNotInCollection';
import { Book, GoogleBooksVolume } from '@/types';
import { Loader2 } from 'lucide-react';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [book, setBook] = useState<any>(null);
  const [item, setItem] = useState<any>(null);
  const [isInCollection, setIsInCollection] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}?key=${apiKey}`);
      const fetchedItem = await res.json() as GoogleBooksVolume;
      setItem(fetchedItem);

      const volumeInfo = fetchedItem.volumeInfo;
      const userId = await getUserId();

      // Get ISBN
      let foundIsbn: string | null = null;
      if (volumeInfo.industryIdentifiers) {
        const isbn13 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
        const isbn10 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
        foundIsbn = isbn13?.identifier ?? isbn10?.identifier ?? null;
      }

      // Get cover URL
      const coverUrl = `https://books.google.com/books/publisher/content/images/frontcover/${fetchedItem.id}?fife=w400-h600&source=gbs_api`;

      // Get or create book object
      if (userId) {
        const foundBook = await checkIfBookInCollection(fetchedItem.id, userId);
        if (foundBook) {
          setIsInCollection(true);
          setBook(foundBook);
        } else {
          const bookData = {
            id: "placeholder",
            title: volumeInfo.title || 'No Title',
            author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author',
            rating: null,
            notes: null,
            user_id: userId,
            status: "wishlist",
            book_id: fetchedItem.id,
            isbn: foundIsbn,
            cover_url: coverUrl,
          } as Book;
          setBook(bookData);
        }
      }
    };

    if (id) fetchBook();
  }, [id]);

  // Components can't use router, so pass these down
  const handleBack = () => {
    router.back();
  };

  const goToDashboard = () => {
    router.push('/books');
  }

  // While loading api responses, show a loading message
  if (!book || !item) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="text-primary animate-spin" />
      </div>
    );
  }

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
