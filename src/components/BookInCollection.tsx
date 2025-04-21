import { Book, BookStatus, Folder, GoogleBooksVolume } from "@/types";
import { getUserId, deleteBook, removeBookFromFolders, getFoldersFromBook, updateBookDetails } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, FolderIcon, Trash2, ImageIcon, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

interface BookInCollectionProps {
  book: Book;
  item: GoogleBooksVolume;
  onBack: () => void;
  goToDashboard: () => void;
}

export default function BookInCollection({ book, item, onBack, goToDashboard }: BookInCollectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedStatus, setEditedStatus] = useState<BookStatus>(book.status || BookStatus.wishlist);
  const [editedRating, setEditedRating] = useState<number | null>(book.rating || null);
  const [editedNotes, setEditedNotes] = useState<string>(book.notes || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const descriptionHtml = item.volumeInfo.description ?? "";
  const router = useRouter();

  const statusOptions: { value: BookStatus; label: string }[] = [
    { value: BookStatus.wishlist, label: 'Wishlist' },
    { value: BookStatus.reading, label: 'Reading' },
    { value: BookStatus.completed, label: 'Completed' },
  ];

  useEffect(() => {
    const loadFolders = async () => {
      setIsLoadingFolders(true);
      const userId = await getUserId();

      if (userId) {
        try {
          const folderData = await getFoldersFromBook(book.id, userId);
          setFolders(folderData);
        } catch (error) {
          console.error("Failed to fetch folders:", error);
        }
      }
      setIsLoadingFolders(false);
    };
    loadFolders();
  }, [book.id]);

  const getStatusColor = (status: BookStatus) => {
    switch (status) {
      case BookStatus.wishlist: return 'text-yellow-600';
      case BookStatus.reading: return 'text-blue-600';
      case BookStatus.completed: return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = event.target.value as BookStatus;
    setEditedStatus(newStatus);
    if (newStatus !== BookStatus.completed) {
      setEditedRating(null);
      setEditedNotes('');
    }
  };

  const handleSaveDetails = async () => {
    setIsUpdating(true);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated");

      await updateBookDetails(book.id ?? "", {
        status: editedStatus,
        rating: editedStatus === 'completed' ? editedRating : null,
        notes: editedStatus === 'completed' ? editedNotes : ''
      }, userId);

      // Refresh the page to show updated details
      window.location.reload();
    } catch (error) {
      console.error("Update failed:", error);
      alert(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
      setIsEditModalOpen(false);
    }
  };

  const handleFolderSelectionChange = (folderId: string, isSelected: boolean) => {
    setSelectedFolderIds(prev => isSelected ? [...prev, folderId] : prev.filter(id => id !== folderId));
  };

  const handleRemoveNow = async () => {
    setIsRemoving(true);
    const userId = await getUserId();
    if (!userId) {
      alert("Session expired. Please log in again.");
      setIsModalOpen(false);
      return;
    }

    try {
      await removeBookFromFolders(book.id ?? "", selectedFolderIds, userId);
      const remainingFolders = await getFoldersFromBook(book.id ?? "", userId);

      if (remainingFolders.length === 0) {
        await deleteBook(book.id ?? "", userId);
      }

      goToDashboard();
    } catch (error) {
      console.error("Error removing book:", error);
      alert(`Failed to remove book: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRemoving(false);
      setIsModalOpen(false);
    }
  };

  const handleChangeCover = () => {
    router.push(`${window.location.pathname}/covers`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-grey3 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-grey2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-foreground">Book Details</h1>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Cover & Actions */}
          <div className="flex-shrink-0 lg:sticky lg:top-8 lg:self-start flex flex-col items-center">
            <img
              src={book.cover_url ?? ''}
              alt={book.title}
              className="w-48 h-72 object-cover rounded-xl shadow-lg border-2 border-grey4 mb-4"
            />
            <button
              onClick={handleChangeCover}
              className="w-48 px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <ImageIcon className="w-4 h-4" />
              Change Cover
            </button>
          </div>

          {/* Right Column - Content */}
          <div className="flex-1 space-y-6">
            {/* Title & Author */}
            <div className="pb-6 border-b border-grey4">
              <h1 className="text-3xl font-bold text-foreground mb-2">{book.title}</h1>
              <p className="text-lg text-grey2">by {book.author}</p>
            </div>

            {/* Status, Rating & Notes */}
            <div className="space-y-4 pt-4 border-t border-grey4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Status</h3>
                  <p className={`text-sm ${getStatusColor(book.status)}`}>
                    {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Details
                </button>
              </div>

              {book.status === 'completed' && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Rating</h3>
                    <p className="text-foreground">
                      {book.rating ? `${book.rating}/10` : 'No rating provided'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Notes</h3>
                    <p className="text-foreground whitespace-pre-wrap">
                      {book.notes || 'No notes available'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Full Description */}
            {descriptionHtml && (
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Description</h3>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              </div>
            )}

            {/* Remove Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full lg:w-auto px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Remove from Collection
            </button>
          </div>
        </div>

        {/* Edit Details Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-xl p-6 shadow-xl border border-grey4 max-w-md w-full">
              <h2 className="text-xl font-bold text-foreground mb-4">Edit Details</h2>

              <div className="mb-4">
                <p className="text-sm font-medium text-foreground mb-2">Status:</p>
                <div className="flex gap-4">
                  {statusOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        value={option.value}
                        checked={editedStatus === option.value}
                        onChange={handleStatusChange}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-foreground">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {editedStatus === 'completed' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Rating (1-10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={editedRating || ''}
                      onChange={(e) => setEditedRating(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Notes
                    </label>
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      className="w-full p-2 border rounded-lg h-32"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-grey2 hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDetails}
                  disabled={isUpdating}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex gap-2 items-center"
                >
                  {isUpdating && <Loader2 className="animate-spin w-4 h-4" />}
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Removal Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">            <div className="bg-background rounded-xl p-6 shadow-xl border border-grey4 max-w-md w-full">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Remove "{book.title}"
            </h2>

            <p className="text-grey2 mb-6">
              Select folders to remove from (or remove completely):
            </p>

            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
              {isLoadingFolders ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : folders.length === 0 ? (
                <p className="text-grey2 text-center">This book isn't in any folders.</p>
              ) : (
                folders.map((folder) => (
                  <label
                    key={folder.id}
                    className="flex items-center p-3 rounded-lg hover:bg-grey5 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFolderIds.includes(folder.id)}
                      onChange={(e) => handleFolderSelectionChange(folder.id, e.target.checked)}
                      className="w-4 h-4 text-primary rounded border-grey4 focus:ring-primary"
                    />
                    <FolderIcon className="w-5 h-5 text-yellow-500 mx-3" />
                    <span className="text-foreground">{folder.name}</span>
                  </label>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-grey2 hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveNow}
                disabled={isRemoving || (folders.length > 0 && selectedFolderIds.length === 0)}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRemoving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRemoving ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
            {folders.length > 0 && selectedFolderIds.length === 0 && (
              <p className="text-xs text-red-500 mt-2 text-right">Select at least one folder to remove from, or cancel.</p>
            )}
            {folders.length === 0 && (
              <p className="text-xs text-grey2 mt-2 text-right">Confirming will remove the book entirely.</p>
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
