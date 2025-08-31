"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getUserId, checkIfBookInCollection } from "@/lib/supabase";
import BookInCollection from "@/components/BookInCollection";
import BookNotInCollection from "@/components/BookNotInCollection";
import { Book, BookFromAPI, BookStatus } from "@/types";
import { getBookFromAPI, getCoverUrl } from "@/lib/books_api";
import { Loader2 } from "lucide-react";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const [book, setBook] = useState<Book>();
  const [item, setItem] = useState<BookFromAPI>();
  const [isInCollection, setIsInCollection] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      const fetchedItem: BookFromAPI = await getBookFromAPI(id);
      setItem(fetchedItem);

      const userId = await getUserId();

      // Get cover URL
      const coverUrl = getCoverUrl(id);

      // Get or create book object
      if (userId) {
        const foundBook = await checkIfBookInCollection(id, userId);
        if (foundBook) {
          setIsInCollection(true);
          setBook(foundBook);
        } else {
          const bookData = {
            id: "placeholder",
            title: fetchedItem.title,
            author: fetchedItem.authors,
            rating: null,
            notes: null,
            user_id: userId,
            status: BookStatus.wishlist,
            book_id: fetchedItem.id,
            categories: fetchedItem.categories,
            isbn: fetchedItem.isbn,
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
    // If there is a search query, go back to search page with query param
    const q = searchParams?.get("q");
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    } else {
      router.back();
    }
  };

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
        <BookInCollection book={book} item={item} onBack={handleBack} />
      ) : (
        <BookNotInCollection book={book} item={item} onBack={handleBack} />
      )}
    </>
  );
}
