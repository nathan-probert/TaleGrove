import { Book, BookStatus, Folder, BookFromAPI } from "@/types";
import { getUserId, deleteBook, removeBookFromFolders, getFoldersFromBook, updateBookDetails } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, ImageIcon, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { RemoveBookModal } from "./Modals/RemoveBookModal";
import { EditBookModal } from "./Modals/EditBookModal";

interface BookInCollectionProps {
  book: Book;
  item: BookFromAPI;
  onBack: () => void;
  reload: () => void;
}

export default function BookInCollection({ book, item, onBack, reload }: BookInCollectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedStatus, setEditedStatus] = useState<BookStatus>(book.status || BookStatus.wishlist);
  
  const [editedRating, setEditedRating] = useState<number | null>(book.rating || null);
  const [editedNotes, setEditedNotes] = useState<string>(book.notes || '');
  const [editedDateRead, setEditedDateRead] = useState<string>(book.date_read || '');

  const [isUpdating, setIsUpdating] = useState(false);

  const router = useRouter();

  const statusOptions: { value: BookStatus; label: string }[] = [
    { value: BookStatus.wishlist, label: 'Wishlist' },
    { value: BookStatus.reading, label: 'Reading' },
    { value: BookStatus.completed, label: 'Completed' },
  ];

  useEffect(() => {
    const loadFolders = async () => {
      const userId = await getUserId();

      if (userId) {
        try {
          const folderData = await getFoldersFromBook(book.id, userId);
          setFolders(folderData);
        } catch (error) {
          console.error("Failed to fetch folders:", error);
        }
      }
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
    } catch (error) {
      console.error("Error removing book:", error);
      alert(`Failed to remove book: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRemoving(false);
      setIsModalOpen(false);
    }

    reload();
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
            <div className="pb-2 border-b border-grey4 mb-4">
              <h1 className="text-3xl font-bold text-foreground mb-2">{book.title}</h1>
              <p className="text-lg text-grey2">by {book.author}</p>
            </div>

            {/* Status, Rating & Notes */}
            <div className="space-y-4">
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
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Description</h3>
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: item.description }}
              />
            </div>

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
          <EditBookModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onConfirm={handleSaveDetails}
            statusOptions={statusOptions}
            editedStatus={editedStatus}
            handleStatusChange={handleStatusChange}
            editedRating={editedRating}
            setEditedRating={setEditedRating}
            editedNotes={editedNotes}
            setEditedNotes={setEditedNotes}
            editedDateRead={editedDateRead}
            setEditedDateRead={setEditedDateRead}
            isUpdating={isUpdating}
          />
        )}

        {/* Removal Modal */}
        {isModalOpen && (
          <RemoveBookModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={handleRemoveNow}
            book={book}
            folders={folders}
            selectedFolderIds={selectedFolderIds}
            handleFolderSelectionChange={handleFolderSelectionChange}
            isRemoving={isRemoving}
          />
        )}
      </div>
    </div>
  );
}
