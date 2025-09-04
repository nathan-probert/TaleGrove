"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Book,
  BookRecommendation,
  BookRecommendationStatus,
  BookStatus,
  OpenLibraryRecommendationInfo,
  UserBookData,
} from "@/types";
import { Loader2, Check, X, BookOpen, Sparkles } from "lucide-react";
import { getOpenLibraryRecommendation } from "@/lib/books_api";
import {
  addBook,
  addBookToFolders,
  getRecommendations,
  getUserId,
  getUsersBooks,
  acceptRecommendation,
  rejectRecommendation,
  saveRecommendation,
} from "@/lib/supabase";
import { generateRecommendations } from "@/lib/gemini";
import { Folder } from "@/types";
import { getUserFolders } from "@/lib/supabase";
import { AddBookModal } from "@/components/Modals/AddBookModal";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<
    OpenLibraryRecommendationInfo[]
  >([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<BookStatus>(
    BookStatus.wishlist,
  );

  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [dateRead, setDateRead] = useState<string>("");

  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchAndSetUserId = async () => {
      setIsLoading(true);
      const id = await getUserId();
      setUserId(id);
      setIsLoading(false);
    };
    fetchAndSetUserId();
  }, []);

  useEffect(() => {
    const loadFolders = async () => {
      setIsLoading(true);
      const userId = await getUserId();
      if (!userId) {
        setIsLoading(false);
        return;
      }
      try {
        const folderData = await getUserFolders(userId);
        setFolders([...folderData]);
      } catch (error) {
        console.error("Failed to fetch folders:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFolders();
  }, []);

  const fetchRecommendations = async (): Promise<BookRecommendation[]> => {
    if (!userId) return [];
    const userData: UserBookData[] = await getUsersBooks(userId);
    const oldRecommendations: BookRecommendation[] =
      await getRecommendations(userId);
    return (await generateRecommendations(userData, oldRecommendations)) ?? [];
  };

  const getBookFromRecommendation = async (
    book: BookRecommendation,
  ): Promise<OpenLibraryRecommendationInfo> => {
    return await getOpenLibraryRecommendation(book.title, book.author, 1);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    const recommendations: BookRecommendation[] = await fetchRecommendations();
    const allBookData: OpenLibraryRecommendationInfo[] = [];

    const allBooks: Book[] = [];
    for (const book of recommendations) {
      const currentBook = await getBookFromRecommendation(book);
      allBookData.push(currentBook);

      const bookData: Book = {
        id: "",
        title: currentBook.title,
        author: currentBook.authors,
        user_id: userId ?? "",
        status: selectedStatus,
        rating: selectedStatus === BookStatus.completed ? rating : null,
        notes: selectedStatus === BookStatus.completed ? notes : null,
        date_read: selectedStatus === BookStatus.completed ? dateRead : null,
        book_id: currentBook.id,
        isbn: currentBook.isbn,
        categories: currentBook.categories,
        cover_url: currentBook.coverUrl,
      };
      allBooks.push(bookData);
    }
    setRecommendations(allBookData);
    setBooks(allBooks);

    const recommendationsToSave: BookRecommendation[] = allBookData.map(
      (rec, index) => ({
        title: rec.title,
        author: rec.authors,
        status: BookRecommendationStatus.pending,
      }),
    );

    await saveRecommendations(userId ?? "", recommendationsToSave);

    setIsLoading(false);
    setCurrentIndex(0);
  };

  const advanceToNext = () => {
    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setRecommendations([]);
    }
  };

  const handleAccept = async () => {
    setSelectedStatus(BookStatus.wishlist);
    setRating(null);
    setNotes("");
    setIsAddModalOpen(true);
  };

  const handleReject = async () => {
    console.log(recommendations[currentIndex]);

    await rejectRecommendation(userId ?? "", {
      title: recommendations[currentIndex].title,
      author: recommendations[currentIndex].authors,
      status: BookRecommendationStatus.rejected,
    });
    advanceToNext();
  };

  const handleFolderSelectionChange = (
    folderId: string,
    isSelected: boolean,
  ) => {
    setSelectedFolderIds((prev) =>
      isSelected ? [...prev, folderId] : prev.filter((id) => id !== folderId),
    );
  };

  const addBookToAllFolders = async (
    book: Book,
    folderIds: string[],
    status: BookStatus,
    rating: number | null,
    notes: string | null,
    dateRead: string | null,
  ) => {
    // Add status and conditionally add rating/notes to the book data
    const bookDataWithDetails: Partial<Book> & { status: BookStatus } = {
      ...book,
      status: status,
    };
    if (status === BookStatus.completed) {
      bookDataWithDetails.rating = rating;
      bookDataWithDetails.notes = notes;
      bookDataWithDetails.date_read = dateRead;
    }

    // Add book to folder
    const data = await addBook(bookDataWithDetails as Book);
    await addBookToFolders(data.id, folderIds, book.user_id);
  };

  const handleAddNow = async () => {
    setIsAdding(true);
    const userId = await getUserId();
    if (!userId) {
      alert("Session expired. Please log in again.");
      setIsAddModalOpen(false);
      setIsAdding(false);
      return;
    }

    // Verify rating exists for 'completed' status
    if (
      selectedStatus === BookStatus.completed &&
      rating !== null &&
      (rating < 1 || rating > 10)
    ) {
      alert("Rating must be between 1 and 10.");
      setIsAdding(false);
      return;
    }

    try {
      await addBookToAllFolders(
        books[currentIndex],
        selectedFolderIds,
        selectedStatus,
        rating,
        notes,
        dateRead,
      );
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Error adding book:", error);
      alert(
        `Failed to add book: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      console.log(recommendations[currentIndex]);
      await acceptRecommendation(userId ?? "", {
        title: recommendations[currentIndex].title,
        author: recommendations[currentIndex].authors,
        status: BookRecommendationStatus.pending,
      });

      setIsAdding(false);
      advanceToNext();
    }
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = event.target.value as BookStatus;
    setSelectedStatus(newStatus);

    // Reset rating and notes if status changes away from 'completed'
    if (newStatus !== BookStatus.completed) {
      setRating(null);
      setNotes("");
      setDateRead("");
    }
  };

  const statusOptions = [
    { value: BookStatus.wishlist, label: "Wishlist" },
    { value: BookStatus.reading, label: "Reading" },
    { value: BookStatus.completed, label: "Completed" },
  ];

  return (
    <div className="min-h-screen px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          {recommendations.length <= 0 && (
            <div>
              <div>
                <div className="inline-flex items-center gap-3 pt-8">
                  <BookOpen className="w-12 h-12 text-emerald-600" />
                  <h1 className="text-5xl font-bold text-foreground bg-clip-text bg-background inline-block">
                    Book Recommendations
                  </h1>
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="relative inline-flex items-center justify-center px-10 py-5 text-xl font-semibold text-white transition-all duration-300 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-75 group"
              >
                {isLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 pt-6 mr-3 transition-transform group-hover:rotate-12" />
                    <span>Generate New Recommendations</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {recommendations.length > 0 &&
          currentIndex < recommendations.length && (
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 space-y-8 border border-gray-100/50">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-gray-900 font-serif">
                  {recommendations[currentIndex].title}
                </h2>
                <p className="text-xl text-gray-600 italic">
                  by {recommendations[currentIndex].authors}
                </p>
              </div>

              <div className="flex flex-col lg:flex-row gap-10 items-start">
                <div className="lg:w-1/3 relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/30 to-teal-100/30 rounded-xl transform rotate-1 -z-10" />
                  <Image
                    src={
                      recommendations[currentIndex].coverUrl ||
                      "/placeholder.jpg"
                    }
                    alt="Book Cover"
                    className="w-full max-w-xs mx-auto rounded-xl shadow-xl border-4 border-white transform transition-transform duration-300 hover:scale-105"
                    width={300}
                    height={450}
                    unoptimized
                  />
                </div>

                <div className="lg:w-2/3 space-y-8">
                  <div className="text-gray-700 border-l-4 border-emerald-100 pl-6 max-h-80 overflow-y-auto pr-2">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: recommendations[currentIndex].description,
                      }}
                    />
                  </div>

                  <div className="flex justify-center gap-8 mt-8">
                    <button
                      onClick={handleReject}
                      className="flex items-center gap-2 px-10 py-4 text-lg font-semibold text-red-600 transition-all duration-300 bg-red-50 rounded-full shadow-md hover:bg-red-100 hover:shadow-lg hover:-translate-y-0.5"
                    >
                      <X className="w-7 h-7" />
                      <span className="hidden sm:inline">Not for Me</span>
                    </button>
                    <button
                      onClick={handleAccept}
                      // Ensure the corresponding book exists before allowing accept
                      disabled={!books[currentIndex]}
                      className="flex items-center gap-2 px-10 py-4 text-lg font-semibold text-white transition-all duration-300 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-7 h-7 text-white" />
                      <span className="hidden sm:inline">Add to Library</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Conditionally render AddBookModal only if the book data exists and the modal should be open */}
        {isAddModalOpen && books[currentIndex] && (
          <AddBookModal
            book={books[currentIndex]} // Now guaranteed to be defined
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onConfirm={handleAddNow}
            folders={folders}
            selectedFolderIds={selectedFolderIds}
            selectedStatus={selectedStatus}
            rating={rating ?? undefined}
            setRating={setRating}
            notes={notes}
            setNotes={setNotes}
            dateRead={dateRead}
            setDateRead={setDateRead}
            handleFolderSelectionChange={handleFolderSelectionChange}
            handleStatusChange={handleStatusChange}
            statusOptions={statusOptions}
            isAdding={isAdding}
          />
        )}
      </div>
    </div>
  );
}
