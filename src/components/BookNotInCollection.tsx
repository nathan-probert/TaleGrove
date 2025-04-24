import { useEffect, useState } from "react";
import { Book, BookStatus, Folder, BookFromAPI } from "@/types";
import { getUserId, fetchUserFolders, addBook, addBookToFolders } from "@/lib/supabase";
import { Modal } from "./Modal";

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
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Add "${book.title}"`}
          confirmButtonText={
            selectedFolderIds.length > 0
              ? `Add Now (${selectedFolderIds.length} folder${selectedFolderIds.length > 1 ? "s" : ""})`
              : "Add Now"
          }
          onConfirm={handleAddNow}
          isLoading={isAdding}
          loadingText="Adding..."
          disabled={isAdding}
        >
          {/* Status selection */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Select Status:</p>
            <div className="flex space-x-4">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    value={option.value}
                    checked={selectedStatus === option.value}
                    onChange={handleStatusChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Folder selection */}
          <div className="max-h-48 overflow-y-auto mb-6 border rounded p-3 bg-gray-50">
            {folders.map((folder) => (
              <div key={folder.id} className="flex items-center mb-2 last:mb-0">
                <input
                  type="checkbox"
                  checked={selectedFolderIds.includes(folder.id)}
                  onChange={(e) => handleFolderSelectionChange(folder.id, e.target.checked)}
                  className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-gray-800">{folder.name}</label>
              </div>
            ))}
          </div>
        </Modal>      
      )}
    </div>
  );
}
