import { Book, GoogleBooksVolume } from "@/types";
import { getUserId, deleteBook } from "@/lib/supabase";


interface BookInCollectionProps {
  book: Book;
  item: GoogleBooksVolume;
  onBack: () => void;
}

export default function BookInCollection({ book, item, onBack }: BookInCollectionProps) {
  const volumeInfo = item.volumeInfo;

  // Function to handle removing the book from the collection
  const onRemoveFromCollection = async () => {
    const userId = await getUserId();
    if (!userId) {
      alert("Please log in to remove books from your collection.");
      return;
    }

    if (await deleteBook(book.id ?? '', userId)) {
      alert(`${book.title} removed from your collection!`);
    } else {
      alert("Failed to remove the book from your collection.");
    }

    onBack();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
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
        className="mb-4 shadow-lg float-left mr-4"
      />
      <div
        className="text-gray-800 mb-4"
        dangerouslySetInnerHTML={{ __html: volumeInfo.description || 'No description available.' }}
      />
      <button
        onClick={onRemoveFromCollection}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        Remove from Collection
      </button>
    </div>
  );
}
