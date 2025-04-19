import { Book, Folder, GoogleBooksVolume } from "@/types";
import { getUserId, deleteBook, fetchUserFolders, removeBookFromFolders, getFoldersFromBook } from "@/lib/supabase";
import { useEffect, useState } from "react";

interface BookInCollectionProps {
  book: Book;
  item: GoogleBooksVolume;
  onBack: () => void;
  goToDashboard: () => void; // Callback after successful removal
}

export default function BookInCollection({ book, item, onBack, goToDashboard }: BookInCollectionProps) {
  const volumeInfo = item.volumeInfo;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false); // State to track removal process

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
        const folderData = await getFoldersFromBook(book.id ?? "id", userId);
        setFolders([...folderData]);
      } catch (error) {
        console.error("Failed to fetch folders:", error);
      } finally {
        setIsLoadingFolders(false);
      }
    };
    loadFolders();
  }, []);


  // Function to handle opening the confirmation modal
  const handleOpenModal = async () => {
    const userId = await getUserId();
    if (!userId) {
      alert("Please log in to remove books from your collection.");
      return;
    }
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

  const handleRemoveNow = async () => {
    setIsRemoving(true);
    const userId = await getUserId(); // Re-check userId just in case
    if (!userId) {
      alert("Session expired. Please log in again.");
      setIsModalOpen(false);
      setIsRemoving(false);
      return;
    }

    try {
      // Pass the selected status, rating, and notes along with book and folders
      await removeBookFromFolders(book.id ?? "id", selectedFolderIds, userId);
      const folders = await getFoldersFromBook(book.id ?? "id", userId);
      console.log("Remaining folders after removal:", folders);
      if (folders.length === 0) {
        await deleteBook(book.id ?? "id", userId); // Remove book if no folders left
      }

      alert(`${book.title} removed from your collection!`);
      setIsModalOpen(false);
      goToDashboard();

    } catch (error) {
      console.error("Error removing book:", error);
      alert(`Failed to remove book: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRemoving(false);
    }
  };


  return (
    <div className="p-6 max-w-3xl mx-auto relative">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
      <p className="text-gray-700 mb-4">by {book.author}</p>
      <img
        src={book.cover_url ?? ''}
        alt={book.title}
        className="mb-4 shadow-lg float-left mr-4 w-32 sm:w-48" // Added width control
      />
      <div className="overflow-hidden"> {/* Container to clear float */}
        <div
          className="text-gray-800 mb-4 prose" // Added prose class for better text formatting
          dangerouslySetInnerHTML={{ __html: volumeInfo.description || 'No description available.' }}
        />
        <button
          onClick={handleOpenModal} // Open modal instead of direct removal
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          Remove from Collection
        </button>
      </div>

      {/* Modal for Folder Selection */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          {/* Modal Dialog */}
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Remove "{book.title}"</h2>

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
                      disabled={isRemoving}
                    />
                    <label
                      htmlFor={`folder-${folder.id}`}
                      className={`text-gray-800 ${isRemoving ? 'opacity-50' : 'cursor-pointer'}`}
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
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveNow}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                disabled={isRemoving} // Allow adding even if no folder is selected, as status is now primary
              >
                {isRemoving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Removing...
                  </>
                ) : (
                  `Remove Now ${selectedFolderIds.length > 0 ? `(${selectedFolderIds.length} folder${selectedFolderIds.length > 1 ? 's' : ''})` : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
