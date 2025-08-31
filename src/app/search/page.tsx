"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Book, BookFromAPI, BookStatus } from "@/types";
import { ResultsGrid } from "@/components/search/ResultsGrid";
import { getUserId } from "@/lib/supabase";
import { ArrowLeft, Loader2, SearchIcon } from "lucide-react";
import { getCoverUrl, searchForBooks } from "@/lib/books_api";

// Function to parse data for books
const parseBookData = (data: BookFromAPI[], userId: string): Book[] => {
  const books: Book[] = [];

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
  }

  return books;
};

export default function SearchBook() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [madeSearch, setMadeSearch] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title && !author) return;
    // Update the URL with the current search query
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    if (author) params.set("author", author);
    router.replace(`/search?${params.toString()}`);

    setLoading(true);
    setResults([]);

    const userId = await getUserId();
    if (!userId) {
      console.error("User ID not found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const data: BookFromAPI[] = await searchForBooks(title, author);
      const processedResults = parseBookData(data, userId);

      setResults(processedResults);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error fetching from Google Books API:", err.message);
      } else {
        console.error(
          "An unknown error occurred while fetching from Google Books API:",
          err,
        );
      }
    } finally {
      setLoading(false);
      setMadeSearch(true);
    }
  };

  // Initialize title/author from URL params and, if present, perform a search with those values
  useEffect(() => {
    const urlTitle = searchParams?.get("title") || "";
    const urlAuthor = searchParams?.get("author") || "";
    setTitle(urlTitle);
    setAuthor(urlAuthor);

    // If the page was opened with query params, perform the search once using those values
    if (urlTitle || urlAuthor) {
      (async () => {
        setLoading(true);
        setResults([]);

        const userId = await getUserId();
        if (!userId) {
          console.error("User ID not found. Please log in.");
          setLoading(false);
          return;
        }

        try {
          const data = await searchForBooks(urlTitle, urlAuthor);
          const processedResults = parseBookData(data, userId);
          setResults(processedResults);
        } catch (err: unknown) {
          if (err instanceof Error) {
            console.error("Error fetching from Google Books API:", err.message);
          } else {
            console.error(
              "An unknown error occurred while fetching from Google Books API:",
              err,
            );
          }
        } finally {
          setLoading(false);
          setMadeSearch(true);
        }
      })();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-[95rem] mx-auto space-y-8">
        {/* Header Section */}
        <div className="space-y-4">
          <Link
            href="/books"
            className="group inline-flex items-center text-sm text-foreground/80 border border-grey4 hover:border-primary rounded-xl px-4 py-2 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-0.5" />
            Back to Dashboard
          </Link>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Search for a Book
            </h1>
          </div>
        </div>

        {/* Search Form */}
        <div className="space-y-6">
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-4 items-center"
          >
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-grow w-full px-6 py-5 text-lg rounded-2xl border border-grey4 bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground"
              placeholder="Enter book title"
              autoComplete="off"
            />

            <input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="flex-grow w-full px-6 py-5 text-lg rounded-2xl border border-grey4 bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground"
              placeholder="Enter author name"
              autoComplete="off"
            />

            <button
              type="submit"
              disabled={loading || (!title && !author)}
              className="flex-shrink-0 w-full md:w-auto inline-flex items-center justify-center px-8 py-5 text-lg rounded-2xl bg-primary hover:bg-primary/90 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <SearchIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Search
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
                {results.length}{" "}
                {results.length === 1 ? "book found" : "books found"}
              </h2>
              <ResultsGrid results={results} />
            </div>
          )}

          {!loading && results.length === 0 && !madeSearch && (
            <div className="text-center py-12 rounded-lg border-2 border-dashed border-grey4">
              <p className="text-foreground/60">
                Enter a title or author to search for a book.
              </p>
            </div>
          )}

          {!loading && results.length === 0 && madeSearch && (
            <div className="text-center py-12 rounded-lg border-2 border-dashed border-grey4">
              <p className="text-foreground/60">
                {title || author ? (
                  <>
                    No books found for &quot;
                    <span className="text-primary">{title || author}</span>
                    &quot;.
                  </>
                ) : (
                  "No results found. Please try again."
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
