'use client';

import { useEffect, useState } from 'react';
import { Book, BookRecommendation, BookStatus, OpenLibraryRecommendationInfo, UserBookData } from '@/types';
import { Loader2, Check, X, BookOpen, Sparkles, Search } from 'lucide-react';
import { getOpenLibraryRecommendation } from '@/lib/books_api';
import { addBook, addBookToFolders, getRecommendations, getRootId, getUserId, getUsersBooks, saveRecommendation } from '@/lib/supabase';
import { generateRecommendations } from '@/lib/gemini';
import { Modal } from '@/components/Modal';
import { Folder } from '@/types';
import { getUserFolders } from '@/lib/supabase';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<OpenLibraryRecommendationInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<BookStatus>(BookStatus.wishlist);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
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
    const oldRecommendations: BookRecommendation[] = await getRecommendations(userId);
    return await generateRecommendations(userData, oldRecommendations) ?? [];
  };

  const getBookFromRecommendation = async (book: BookRecommendation): Promise<OpenLibraryRecommendationInfo> => {
    return await getOpenLibraryRecommendation(book.title, book.author, 1);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    const recommendations: BookRecommendation[] = await fetchRecommendations();
    const allBookData: OpenLibraryRecommendationInfo[] = [];
    for (const book of recommendations) {
      allBookData.push(await getBookFromRecommendation(book));
    }
    setRecommendations(allBookData);
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

  const handleAddToCollection = async () => {
    setIsAdding(true);
    const currentBook = recommendations[currentIndex];
    try {
      const bookData: Book = {
        id: "",
        title: currentBook.title,
        author: currentBook.authors,
        user_id: userId ?? "",
        status: selectedStatus,
        rating: selectedStatus === BookStatus.completed ? rating : null,
        notes: selectedStatus === BookStatus.completed ? notes : null,
        book_id: currentBook.id,
        isbn: currentBook.isbn,
        cover_url: currentBook.coverUrl,
      };
      const addedBook = await addBook(bookData);
      await addBookToFolders(addedBook.id, selectedFolderIds, userId ?? "");
      setIsAddModalOpen(false);
      advanceToNext();
    } catch (error) {
      console.error("Error adding book:", error);
      alert(`Failed to add book: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAccept = () => {
    const rootFolder = folders.find(folder => folder.name === 'Root');
    setSelectedFolderIds(rootFolder ? [rootFolder.id] : []);
    setSelectedStatus(BookStatus.wishlist);
    setRating(null);
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleReject = async () => {
    await saveRecommendation(userId ?? "", {
      title: recommendations[currentIndex].title,
      author: recommendations[currentIndex].authors
    });
    advanceToNext();
  };

  const handleFolderSelectionChange = (folderId: string, isSelected: boolean) => {
    setSelectedFolderIds(prev =>
      isSelected ? [...prev, folderId] : prev.filter(id => id !== folderId)
    );
  };

  const handleStatusChange = (status: BookStatus) => {
    setSelectedStatus(status);
    if (status !== BookStatus.completed) {
      setRating(null);
      setNotes('');
    }
  };

  const statusOptions = [
    { value: BookStatus.wishlist, label: 'Wishlist' },
    { value: BookStatus.reading, label: 'Reading' },
    { value: BookStatus.completed, label: 'Completed' },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <BookOpen className="w-12 h-12 text-emerald-600" />
            <h1 className="text-5xl font-bold text-foreground bg-clip-text bg-background inline-block">
              Book Recommendations
            </h1>
          </div>
          {recommendations.length <= 0 && (
            <div>
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="relative inline-flex items-center justify-center px-10 py-5 text-xl font-semibold text-white transition-all duration-300 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-75 group"
                    >
                {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                <>
                  <Sparkles className="w-6 h-6 mr-3 transition-transform group-hover:rotate-12" />
                  <span>Generate New Recommendations</span>
                </>
                )}
              </button>
            </div>
          )}
        </div>

        {recommendations.length > 0 && currentIndex < recommendations.length && (
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
                <img
                  src={recommendations[currentIndex].coverUrl || '/placeholder.jpg'}
                  alt="Book Cover"
                  className="w-full max-w-xs mx-auto rounded-xl shadow-xl border-4 border-white transform transition-transform duration-300 hover:scale-105"
                />
              </div>

              <div className="lg:w-2/3 space-y-8">
                <div className="prose-lg text-gray-700 leading-relaxed border-l-4 border-emerald-100 pl-6 max-h-80 overflow-y-auto pr-2">
                  {recommendations[currentIndex].description || 'No description available.'}
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
                    className="flex items-center gap-2 px-10 py-4 text-lg font-semibold text-white transition-all duration-300 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <Check className="w-7 h-7 text-white" />
                    <span className="hidden sm:inline">Add to Library</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={`Add "${recommendations[currentIndex]?.title}"`}
          confirmButtonText={`Add Now (${selectedFolderIds.length} folder${selectedFolderIds.length !== 1 ? 's' : ''})`}
          onConfirm={handleAddToCollection}
          isLoading={isAdding}
          loadingText="Adding..."
          disabled={isAdding || selectedFolderIds.length === 0}
        >
          <div className="space-y-8">
            <div className="mb-6">
              <p className="text-xl font-semibold text-foreground mb-4">Reading Status</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedStatus === option.value
                        ? 'border-primary shadow-inner'
                        : 'border-gray400 hover:border-secondary'
                    }`}
                  >
                    <span className="block text-base font-medium text-foreground">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-2 border-gray-100 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xl font-semibold text-foreground">Select Folders</p>
                <Search className="w-5 h-5 text-foreground" />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
                {folders.map((folder) => (
                  <label
                    key={folder.id}
                    className="flex items-center gap-4 p-3 hover:bg-grey3 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFolderIds.includes(folder.id)}
                      onChange={(e) => handleFolderSelectionChange(folder.id, e.target.checked)}
                      className="h-5 w-5 text-emerald-600 border-2 border-gray-300 rounded-lg focus:ring-emerald-500"
                    />
                    <span className="text-foreground">{folder.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedStatus === BookStatus.completed && (
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-3">
                    Your Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {[...Array(10)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setRating(i + 1)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          rating && rating > i
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-3">
                    Personal Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                    rows={4}
                    placeholder="Write your thoughts about this book..."
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}