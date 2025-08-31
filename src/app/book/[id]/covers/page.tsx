"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  getUserId,
  checkIfBookInCollection,
  changeBookCover,
} from "@/lib/supabase";
import { getCoverUrl } from "@/lib/books_api";
import { Loader2 } from "lucide-react";
import {
  Book,
  BookStatus,
  GoogleBooksVolume,
  IndustryIdentifier,
  OpenLibraryDoc,
} from "@/types";

export default function BookCoversPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [book, setBook] = useState<Book>({
    id: "id",
    title: "No Title",
    author: "Unknown Author",
    rating: null,
    notes: null,
    user_id: "",
    status: BookStatus.wishlist,
    categories: [],
    book_id: "id",
    isbn: "",
    cover_url: "",
  });
  const [covers, setCovers] = useState<string[]>([]);
  const [isInCollection, setIsInCollection] = useState(false);
  const [publisherQuery, setPublisherQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchCovers = async (id: string, title: string, publisher?: string) => {
    setIsLoading(true);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
    const coverUrls: string[] = [];

    // check google for covers
    if (title) {
      try {
        let googleQuery = `q=${encodeURIComponent(title)}`;
        if (publisher) {
          googleQuery += `+inpublisher:${encodeURIComponent(publisher)}`;
        }
        const googleRes = await fetch(
          `https://www.googleapis.com/books/v1/volumes?${googleQuery}&key=${apiKey}&maxResults=10`,
        );
        if (googleRes.ok) {
          const googleData = await googleRes.json();
          if (googleData.items && googleData.items.length > 0) {
            googleData.items.forEach((item: GoogleBooksVolume) => {
              // Ensure cover exists and avoid duplicates
              const coverUrl = getCoverUrl(item.id);
              if (coverUrl && !coverUrls.includes(coverUrl)) {
                coverUrls.push(coverUrl);
              }
            });
          }
        }
      } catch (error) {
        console.error("Error fetching from Google Books:", error);
      }
    }

    // check open library for covers
    if (title) {
      try {
        let openLibraryQuery = `title=${encodeURIComponent(title)}`;
        if (publisher) {
          openLibraryQuery += `&publisher=${encodeURIComponent(publisher)}`;
        }
        const openLibraryRes = await fetch(
          `https://openlibrary.org/search.json?${openLibraryQuery}&limit=10`,
        );
        if (openLibraryRes.ok) {
          const openLibraryData = await openLibraryRes.json();
          if (openLibraryData.docs && openLibraryData.docs.length > 0) {
            openLibraryData.docs.forEach((doc: OpenLibraryDoc) => {
              if (doc.cover_i) {
                const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
                // Avoid duplicates
                if (!coverUrls.includes(coverUrl)) {
                  coverUrls.push(coverUrl);
                }
              }
            });
          }
        }
      } catch (error) {
        console.error("Error fetching from Open Library:", error);
      }
    }

    // Add the original cover from the item if available and not already included
    const originalCover = getCoverUrl(id);
    if (originalCover && !coverUrls.includes(originalCover)) {
      coverUrls.unshift(originalCover); // Add to the beginning
    }

    setCovers(coverUrls);
    setIsLoading(false);
  };

  const changeCover = (coverUrl: string) => {
    if (!isInCollection) {
      alert("Book is not in your collection!");
    } else if (book) {
      changeBookCover(book.book_id, book.user_id, coverUrl);
      router.push(`/book/${book.book_id}`);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;

      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes/${id}?key=${apiKey}`,
      );
      const fetchedItem = await res.json();

      const volumeInfo = fetchedItem.volumeInfo;
      const userId = await getUserId();

      let foundIsbn: string | null = null;
      if (volumeInfo.industryIdentifiers) {
        const isbn13 = volumeInfo.industryIdentifiers.find(
          (id: IndustryIdentifier) => id.type === "ISBN_13",
        );
        const isbn10 = volumeInfo.industryIdentifiers.find(
          (id: IndustryIdentifier) => id.type === "ISBN_10",
        );
        foundIsbn = isbn13?.identifier ?? isbn10?.identifier ?? null;
      }

      // Set initial book state
      setBook({
        id: fetchedItem.id,
        title: volumeInfo.title || "No Title",
        author: volumeInfo.authors
          ? volumeInfo.authors.join(", ")
          : "Unknown Author",
        rating: null,
        notes: null,
        user_id: userId ?? "",
        status: BookStatus.wishlist,
        categories: [],
        book_id: fetchedItem.id,
        isbn: foundIsbn ?? "",
        cover_url: getCoverUrl(fetchedItem.id) ?? "",
      });

      if (userId) {
        const collectionData = await checkIfBookInCollection(
          fetchedItem.id,
          userId,
        );
        setIsInCollection(!!collectionData);
        if (collectionData) {
          // If book is in collection, update book state with collection data
          setBook((prevBook: Book) => ({
            ...prevBook,
            id: collectionData.id, // Use Supabase row ID
            rating: collectionData.rating,
            notes: collectionData.notes,
            status: collectionData.status,
            cover_url: collectionData.cover_url || prevBook.cover_url, // Prefer collection cover
            user_id: collectionData.user_id,
          }));
        }
      } else {
        setIsInCollection(false);
      }

      fetchCovers(fetchedItem.id, volumeInfo.title, publisherQuery);
    };

    if (id) fetchInitialData();
  }, [id, publisherQuery]);

  const handleSearch = () => {
    fetchCovers(book.id, book.title, publisherQuery);
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <button
        onClick={handleBack}
        className="mb-6 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-2">{book.title}</h1>
      <h2 className="text-lg text-gray-600 mb-6">{book.author}</h2>

      {/* Publisher Search */}
      <div className="mb-6 flex items-center gap-2">
        <input
          type="text"
          value={publisherQuery}
          onChange={(e) => setPublisherQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          placeholder="Enter publisher name (optional)"
          className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 flex-grow"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Search Covers
        </button>
      </div>

      {covers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {covers.map((coverUrl, index) => (
            <div
              key={`${coverUrl}-${index}`} // Use URL + index for key stability if URLs aren't unique
              className={`flex flex-col items-center rounded p-2 shadow hover:shadow-lg transition cursor-pointer border-2 ${book.cover_url === coverUrl ? "border-blue-500" : "border-transparent"}`}
              onClick={() => changeCover(coverUrl)}
              title="Click to set as cover"
            >
              <Image
                src={coverUrl}
                alt={`Cover ${index + 1} for ${book.title}`}
                className="w-full h-auto object-contain mb-2"
                style={{ maxHeight: "350px" }} // Adjusted max height
                loading="lazy"
                onError={(e) => {
                  // Hide the container if the image fails to load
                  const parentDiv = (e.target as HTMLImageElement).closest(
                    "div",
                  );
                  if (parentDiv) parentDiv.style.display = "none";
                }}
                width={300}
                height={450}
                unoptimized
              />
              {book.cover_url === coverUrl && (
                <span className="text-xs text-blue-600 font-semibold mt-1">
                  Current Cover
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">
          No alternative covers found for this search.
        </p>
      )}
    </div>
  );
}
