'use client';

import { useEffect, useState } from 'react';
import { Book, BookRecommendation, BookStatus, OpenLibraryRecommendationInfo, UserBookData } from '@/types';
import { Loader2, Check, X } from 'lucide-react';
import { getOpenLibraryRecommendation } from '@/lib/books_api';
import { addBook, addBookToFolders, getRecommendations, getRootId, getUserId, getUsersBooks, saveRecommendation } from '@/lib/supabase';
import { generateRecommendations } from '@/lib/gemini';
import { Modal } from '@/components/Modal';
import { Folder } from '@/types';
import { fetchUserFolders } from '@/lib/supabase';

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
        const folderData = await fetchUserFolders(userId);
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

  const handleStatusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = event.target.value as BookStatus;
    setSelectedStatus(newStatus);
    if (newStatus !== BookStatus.completed) {
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
    <div className="min-h-screen p-8 bg-gradient-to-br from-yellow-50 to-green-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Book Recommendations</h1>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="bg-emerald-600 text-white px-8 py-4 text-xl rounded-2xl shadow-lg hover:bg-emerald-700 transition-transform transform hover:scale-105 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="animate-spin w-6 h-6 mx-auto" />
            ) : (
              'Generate New Recommendations'
            )}
          </button>
        </div>

        {recommendations.length > 0 && currentIndex < recommendations.length && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800">
                {recommendations[currentIndex].title}
              </h2>
              <p className="text-xl text-gray-600 mt-2">
                by {recommendations[currentIndex].authors}
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="lg:w-1/3">
                <img
                  src={recommendations[currentIndex].coverUrl || '/placeholder.jpg'}
                  alt="Book Cover"
                  className="w-full max-w-xs mx-auto rounded-xl shadow-lg"
                />
              </div>
              
              <div className="lg:w-2/3 space-y-6">
                <div className="prose max-w-none text-gray-700 text-lg">
                  {recommendations[currentIndex].description || 'No description available.'}
                </div>
                
                <div className="flex justify-center gap-6 mt-8">
                  <button
                    onClick={handleReject}
                    className="bg-red-500 text-white px-8 py-4 rounded-full shadow-lg hover:bg-red-600 transition-transform transform hover:scale-105"
                  >
                    <X className="w-8 h-8" />
                  </button>
                  <button
                    onClick={handleAccept}
                    className="bg-green-500 text-white px-8 py-4 rounded-full shadow-lg hover:bg-green-600 transition-transform transform hover:scale-105"
                  >
                    <Check className="w-8 h-8" />
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
          <div className="space-y-6">
            <div className="mb-4">
              <p className="text-lg font-medium text-gray-700 mb-3">Select Status:</p>
              <div className="grid grid-cols-3 gap-4">
                {statusOptions.map((option) => (
                  <label 
                    key={option.value} 
                    className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      value={option.value}
                      checked={selectedStatus === option.value}
                      onChange={handleStatusChange}
                      className="h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-900">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-lg font-medium text-gray-700 mb-3">Select Folders:</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {folders.map((folder) => (
                  <label 
                    key={folder.id} 
                    className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFolderIds.includes(folder.id)}
                      onChange={(e) => handleFolderSelectionChange(folder.id, e.target.checked)}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-800">{folder.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedStatus === BookStatus.completed && (
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-2">Rating (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={rating || ''}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
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