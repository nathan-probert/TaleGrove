import { useEffect, useState } from "react";
import { Book, BookStatus, Folder, BookFromAPI } from "@/types";
import { getUserId, fetchUserFolders, addBook, addBookToFolders } from "@/lib/supabase";
import { Router } from "lucide-react";

interface BookNotInCollectionProps {
  book: Book;
  item: BookFromAPI;
  onBack: () => void;
  reload: () => void;
}


export default function BookNotInCollection({ book, item, onBack, reload }: BookNotInCollectionProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<BookStatus>(BookStatus.wishlist);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const addBookToAllFolders = async (
    book: Book,
    folderIds: string[],
    status: BookStatus,
    rating: number | null,
    notes: string
  ) => {
    // Add status and conditionally add rating/notes to the book data
    let bookDataWithDetails: Partial<Book> & { status: BookStatus } = {
      ...book,
      status: status,
    };
    if (status === BookStatus.completed) {
      bookDataWithDetails.rating = rating;
      bookDataWithDetails.notes = notes;
    }

    // Add book to folder
    const data = await addBook(bookDataWithDetails as Book);
    await addBookToFolders(data.id, folderIds, book.user_id);

    reload()
  }

  // Fetch folders on mount
  useEffect(() => {
    const loadFolders = async () => {
      setIsLoadingFolders(true);
      const userId = await getUserId();
      if (!userId) {
        setIsLoadingFolders(false);
        return;
      }

      try {
        const folderData = await fetchUserFolders(userId);
        setFolders([...folderData]);
      } catch (error) {
        console.error("Failed to fetch folders:", error);
      } finally {
        setIsLoadingFolders(false);
      }
    };
    loadFolders();
  }, []);

  const handleOpenModal = async () => {
    const userId = await getUserId();
    if (!userId) {
      alert("Please log in to add books to your collection.");
      return;
    }

    // Have 'Root' folder selected by default
    const rootFolder = folders.find(folder => folder.name === 'Root');
    setSelectedFolderIds(rootFolder ? [rootFolder.id] : []);

    setRating(null);
    setNotes('');
    setIsModalOpen(true);
  };

  // Handler for checkbox changes
  const handleFolderSelectionChange = (folderId: string, isSelected: boolean) => {
    setSelectedFolderIds(prev => {
      let updated = isSelected
        ? [...prev, folderId]
        : prev.filter(id => id !== folderId);

      return updated;
    });
  };

  // Handler for radio button changes
  const handleStatusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = event.target.value as BookStatus;
    setSelectedStatus(newStatus);

    // Reset rating and notes if status changes away from 'completed'
    if (newStatus !== BookStatus.completed) {
      setRating(null);
      setNotes('');
    }
  };

  // Handler for the "Add Now" button in the modal
  const handleAddNow = async () => {
    setIsAdding(true);
    const userId = await getUserId();
    if (!userId) {
      alert("Session expired. Please log in again.");
      setIsModalOpen(false);
      setIsAdding(false);
      return;
    }

    // Verify rating exists for 'completed' status
    if (selectedStatus === BookStatus.completed && rating !== null && (rating < 1 || rating > 10)) {
      alert("Rating must be between 1 and 10.");
      setIsAdding(false);
      return;
    }

    try {
      await addBookToAllFolders(book, selectedFolderIds, selectedStatus, rating, notes);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding book:", error);
      alert(`Failed to add book: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAdding(false);
    }
  };

  const statusOptions: { value: BookStatus; label: string }[] = [
    { value: BookStatus.wishlist, label: 'Wishlist' },
    { value: BookStatus.reading, label: 'Reading' },
    { value: BookStatus.completed, label: 'Completed' },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
      >
        ← Back
      </button>

      {/* Book Details */}
      <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
      <p className="text-gray-700 mb-4">by {book.author}</p>
      <img
        src={book.cover_url ?? ""}
        alt={book.title}
        className="mb-4 shadow-lg float-left mr-4 w-32 md:w-48" // Adjusted size
      />
      <div
        className="text-gray-800 mb-4 prose prose-sm sm:prose" // Using prose for better text formatting
        dangerouslySetInnerHTML={{ __html: item.description }}
      />

      {/* Add to Collection Button */}
      <div className="clear-left pt-4">
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
          disabled={isLoadingFolders} // Disable button while folders are loading
        >
          {isLoadingFolders ? 'Loading Folders...' : 'Add to Collection'}
        </button>
      </div>


      {/* Modal for Folder Selection */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          {/* Modal Dialog */}
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add "{book.title}"</h2>

            {/* Status Selection */}
            <div className="mb-4"> {/* Reduced bottom margin */}
              <p className="text-sm font-medium text-gray-700 mb-2">Select Status:</p>
              <div className="flex space-x-4">
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex items-center">
                    <input
                      id={`status-${option.value}`}
                      name="book-status"
                      type="radio"
                      value={option.value}
                      checked={selectedStatus === option.value}
                      onChange={handleStatusChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                      disabled={isAdding}
                    />
                    <label
                      htmlFor={`status-${option.value}`}
                      className={`ml-2 block text-sm text-gray-900 ${isAdding ? 'opacity-50' : 'cursor-pointer'}`}
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Conditional Rating and Notes for 'Completed' Status */}
            {selectedStatus === 'completed' && (
              <div className="mb-6 mt-4 space-y-4 border-t pt-4"> {/* Added top border and padding */}
                {/* Rating Input */}
                <div>
                  <label htmlFor="rating" className="block text-sm font-medium text-gray-700">Rating (Optional, 1-10):</label>
                  <input
                    type="number"
                    id="rating"
                    name="rating"
                    min="1"
                    max="10"
                    value={rating ?? ''} // Use empty string if rating is null for the input value
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow empty input (clearing the field) or numbers between 1 and 10
                      if (val === '') {
                        setRating(null);
                      } else {
                        const num = parseInt(val, 10);
                        if (!isNaN(num) && num >= 1 && num <= 10) {
                          setRating(num);
                        } else if (!isNaN(num) && (num < 1 || num > 10)) {
                          // Optionally provide immediate feedback or just prevent setting state
                          // For simplicity, we just don't update state if out of range
                          // The validation in handleAddNow will catch it if user tries to submit invalid number
                        }
                      }
                    }}
                    placeholder="e.g., 8"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100"
                    disabled={isAdding}
                  />
                </div>
                {/* Notes Textarea */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional):</label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any thoughts on the book?"
                    className="p-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100"
                    disabled={isAdding}
                  />
                </div>
              </div>
            )}


            {/* Folder Selection Title */}
            <p className="text-sm font-medium text-gray-700 mb-2">Select Folders (Optional):</p>

            {/* Folder List */}
            <div className="max-h-48 overflow-y-auto mb-6 border rounded p-3 bg-gray-50">
              {isLoadingFolders ? (
                <p className="text-gray-500">Loading folders...</p>
              ) : folders.length === 0 ? (
                <p className="text-gray-500">No folders available.</p>
              ) : (
                folders.map((folder) => (
                  <div key={folder.id} className="flex items-center mb-2 last:mb-0">
                    <input
                      type="checkbox"
                      id={`folder-${folder.id}`}
                      value={folder.id}
                      checked={selectedFolderIds.includes(folder.id)}
                      onChange={(e) => handleFolderSelectionChange(folder.id, e.target.checked)}
                      className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      disabled={isAdding}
                    />
                    <label
                      htmlFor={`folder-${folder.id}`}
                      className={`text-gray-800 ${isAdding ? 'opacity-50' : 'cursor-pointer'}`}
                    >
                      {folder.name}
                    </label>
                  </div>
                ))
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition disabled:opacity-50"
                disabled={isAdding}
              >
                Cancel
              </button>
              <button
                onClick={handleAddNow}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                disabled={isAdding} // Allow adding even if no folder is selected, as status is now primary
              >
                {isAdding ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  `Add Now ${selectedFolderIds.length > 0 ? `(${selectedFolderIds.length} folder${selectedFolderIds.length > 1 ? 's' : ''})` : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
